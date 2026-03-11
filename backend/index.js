require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const fingerprintRoutes = require('./routes/fingerprintRoutes');

// RBAC routes
const gymRoutes = require('./routes/gymRoutes');
const branchRoutes = require('./routes/branchRoutes');
const membershipPriceRoutes = require('./routes/membershipPriceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const expenseCategoryRoutes = require('./routes/expenseCategoryRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');

const port = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';



const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());
// Allow moderately large payloads for JSON and urlencoded bodies (e.g. images/base64),
// while still protecting against excessively large requests.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(attachRequestContext);
app.use(requestLogger);
app.use(responseEnvelope);

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




mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return;
  })
  .catch((error) => console.error('Error connecting:', error));

// Unified API routes (primary)
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/membership-prices', membershipPriceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fingerprints', fingerprintRoutes);
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
app.use('/api/legacy/fingerprint', fingerprintRoutes);

// Health endpoint for uptime checks and deployment verification
app.get('/api/health', (req, res) => {
  return ok(res, {
    status: 'ok',
    service: 'gym-backend',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// Schedule daily membership expiry check
const Member = require('./models/member');

// Function to check expired memberships
const checkExpiredMemberships = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('Skipping membership expiry check: MongoDB is not connected');
      return;
    }
    console.log('Running daily membership expiry check...');
    const result = await Member.checkAndUpdateExpiredMemberships();
    console.log('Membership expiry check completed:', result.message);
  } catch (error) {
    console.error('Error in scheduled membership expiry check:', error);
  }
};

// Run immediately on startup
checkExpiredMemberships();

// Schedule to run every hour so multi-period members advance promptly after each period ends
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(checkExpiredMemberships, ONE_HOUR_MS);

// 404 and error handling should be last in middleware chain
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  console.log('Membership expiry check scheduled (hourly)');
});
