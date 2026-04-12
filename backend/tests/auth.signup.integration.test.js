/**
 * Signup / login identifier: Indian mobile. Duplicate phone, concurrency, optional recovery email.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const rateLimit = require('express-rate-limit');

jest.setTimeout(120000);

let mongoServer;
let app;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const authController = require('../controllers/authController');
  const relaxedSignupLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app = express();
  app.use(express.json());
  app.post('/api/auth/signup', relaxedSignupLimit, authController.signup);
  app.post('/api/auth/login', authController.login);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const User = require('../models/user');
  const Gym = require('../models/gym');
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Gym.deleteMany({});
  }
});

function signupPayload(phone, overrides = {}) {
  return {
    firstName: 'Gym',
    lastName: 'Owner',
    phone,
    password: 'secret12',
    gymName: 'Test Gym Signup',
    ...overrides,
  };
}

describe('POST /api/auth/signup — phone-based gym owner', () => {
  it('creates gym + owner on first signup (201)', async () => {
    const User = require('../models/user');
    const Gym = require('../models/gym');

    const res = await request(app).post('/api/auth/signup').send(signupPayload('9876543210'));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('9876543210');
    expect(res.body.data.email).toBeNull();

    expect(await User.countDocuments({})).toBe(1);
    expect(await Gym.countDocuments({})).toBe(1);
  });

  it('rejects duplicate phone (409)', async () => {
    await request(app).post('/api/auth/signup').send(signupPayload('9123456789'));
    const second = await request(app).post('/api/auth/signup').send(signupPayload('9123456789'));
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('treats +91 and 0-prefixed input as same number for duplicate check', async () => {
    await request(app).post('/api/auth/signup').send(signupPayload('9988776655'));
    const res = await request(app).post('/api/auth/signup').send(signupPayload('+91 9988776655'));
    expect(res.status).toBe(409);
  });

  it('allows only one user when two signups run concurrently with the same phone', async () => {
    const payload = signupPayload('8877665544');
    const [a, b] = await Promise.all([
      request(app).post('/api/auth/signup').send(payload),
      request(app).post('/api/auth/signup').send(payload),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);
    const User = require('../models/user');
    expect(await User.countDocuments({ phone: '8877665544' })).toBe(1);
  });

  it('rejects invalid phone (400)', async () => {
    const res = await request(app).post('/api/auth/signup').send(signupPayload('12345'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid phone');
  });

  it('accepts optional recovery email when valid', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(signupPayload('8765432109', { email: 'owner-recovery@example.com' }));
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('owner-recovery@example.com');
  });

  it('rejects duplicate optional email (409)', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send(signupPayload('7654321098', { email: 'shared@example.com' }));
    const res = await request(app)
      .post('/api/auth/signup')
      .send(signupPayload('7654321097', { email: 'shared@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects invalid optional email (400)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(signupPayload('6543210987', { email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login — phone or email', () => {
  it('logs in with phone and password', async () => {
    await request(app).post('/api/auth/signup').send(signupPayload('8111223344', { password: 'mypass99' }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+91 8111223344', password: 'mypass99' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.phone).toBe('8111223344');
    expect(res.body.token).toBeDefined();
  });

  it('still logs in with email when owner has recovery email', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send(signupPayload('8222334455', { email: 'dual@example.com', password: 'pw123456' }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dual@example.com', password: 'pw123456' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dual@example.com');
  });
});
