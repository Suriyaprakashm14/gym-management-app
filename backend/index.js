require('dotenv').config();
const {
  assertProductionConfig,
  getSessionSecret,
  sessionCookieSecure,
  getMongoUri,
} = require('./config/env');

assertProductionConfig();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { attachRequestContext } = require('./middleware/requestContext');
const { requestLogger } = require('./middleware/requestLogger');
const { responseEnvelope } = require('./middleware/responseEnvelope');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { ok } = require('./utils/apiResponse');

// Legacy routes (for backward compatibility)
const memberRoutes = require('./routes/memberRoutes');
const detailsRoutes = require('./routes/membersPersonalDetailsRoutes');
const legacyPriceRoutes = require('./routes/membershipPriceRoutes');
const legacyPaymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const webauthnRoutes = require('./routes/webauthnRoutes');

// RBAC routes
const gymRoutes = require('./routes/gymRoutes');
const branchRoutes = require('./routes/branchRoutes');
const membershipPriceRoutes = require('./routes/membershipPriceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const expenseCategoryRoutes = require('./routes/expenseCategoryRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');

const port = process.env.PORT || 5001;
const MONGODB_URI = getMongoUri();



const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
// CORS: allow localhost, LAN dev, Vercel, and production frontend via FRONTEND_URL or ALLOWED_ORIGINS
const corsOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  /\.vercel\.app$/
];

// In dev, allow Next fallback port and LAN origins (WebAuthn / cookies use same site).
if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
  corsOrigins.push(
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):(3000|3001)$/
  );
}
if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL.trim());
}
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) corsOrigins.push(trimmed);
  });
}
app.use(cors({ origin: corsOrigins, credentials: true }));
// Allow moderately large payloads for JSON and urlencoded bodies (e.g. images/base64),
// while still protecting against excessively large requests.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(attachRequestContext);
app.use(requestLogger);
app.use(responseEnvelope);

app.use(
  session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: sessionCookieSecure(),
      maxAge: 10 * 60 * 1000, // 10 minutes
    },
  })
);

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
      details: null,
    },
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
      details: null,
    },
  },
});

app.use('/api', globalRateLimiter);




// Unified API routes (primary)
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/webauthn', webauthnRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/membership-prices', membershipPriceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/members-personal-details', detailsRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/users', userRoutes);

// Legacy API routes (for backward compatibility)
app.use('/api/legacy/auth', authRoutes);
app.use('/api/legacy/members', memberRoutes);
app.use('/api/legacy/details', detailsRoutes);
app.use('/api/legacy/membership-prices', legacyPriceRoutes);
app.use('/api/legacy/payments', legacyPaymentRoutes);
app.use('/api/legacy/attendance', attendanceRoutes);

// Health endpoint for uptime checks and deployment verification
app.get('/api/health', (req, res) => {
  return ok(res, {
    status: 'ok',
    service: 'gym-backend',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

const Member = require('./models/member');
const tokenBlacklist = require('./middleware/tokenBlacklist');

async function checkExpiredMemberships() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('Skipping membership expiry check: MongoDB is not connected');
      return;
    }
    console.log('Running membership expiry check (calendar-day sweep)...');
    const result = await Member.checkAndUpdateExpiredMemberships();
    const day = result.asOfLocalDate ? ` as of local date ${result.asOfLocalDate}` : '';
    console.log(`Membership expiry check completed:${day}`, result.message);
  } catch (error) {
    console.error('Error in scheduled membership expiry check:', error);
  }
}

// 404 and error handling should be last in middleware chain
app.use(notFoundHandler);
app.use(errorHandler);

// Runs once before accepting traffic (syncs expired vs current calendar day), then every 4h while up.
const MEMBERSHIP_EXPIRY_INTERVAL_MS = 4 * 60 * 60 * 1000;

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }

  await tokenBlacklist.init();

  await checkExpiredMemberships();

  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    console.log('Membership expiry check scheduled every 4 hours (startup sync already completed)');
  });

  setInterval(checkExpiredMemberships, MEMBERSHIP_EXPIRY_INTERVAL_MS);
}

startServer().catch((err) => {
  console.error('Server start error:', err);
  process.exit(1);
});
