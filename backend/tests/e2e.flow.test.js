const express = require('express');
const request = require('supertest');

const mockMemberSave = jest.fn();
const mockPaymentSave = jest.fn();

const mockMemberModel = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'member-1',
  save: mockMemberSave,
}));
mockMemberModel.findOne = jest.fn();
mockMemberModel.findById = jest.fn();
mockMemberModel.find = jest.fn();

const mockPaymentModel = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'payment-1',
  save: mockPaymentSave,
}));

jest.mock('../models/user', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/member', () => mockMemberModel);
jest.mock('../models/payment', () => mockPaymentModel);
jest.mock('../models/membersPersonalDetails', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/membershipPrice', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/attendance', () => ({
  find: jest.fn(),
}));

const User = require('../models/user');
const Details = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');
const Attendance = require('../models/attendance');

const authController = require('../controllers/authController');
const memberController = require('../controllers/memberController');
const paymentController = require('../controllers/paymentController');
const attendanceController = require('../controllers/attendanceController');

describe('E2E flow - login to attendance report', () => {
  function buildTestApp() {
    const app = express();
    app.use(express.json());

    app.post('/api/auth/login', authController.login);

    app.use((req, res, next) => {
      if (req.path !== '/api/auth/login') {
        req.user = { role: 'manager', branchId: 'branch-1', gymId: 'gym-1' };
      }
      next();
    });

    app.post('/api/members', memberController.create);
    app.post('/api/payments/:branchId', paymentController.create);
    app.get('/api/attendance/report', attendanceController.getAttendanceReport);
    return app;
  }

  beforeEach(() => {
    mockMemberSave.mockReset();
    mockPaymentSave.mockReset();
  });

  it('completes login -> create member -> add payment -> attendance report', async () => {
    const userDoc = {
      _id: 'user-1',
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@test.com',
      role: 'manager',
      permissions: [],
      comparePassword: jest.fn().mockResolvedValue(true),
      resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      isFrozen: jest.fn().mockResolvedValue(false),
      gymId: { _id: 'gym-1', name: 'Main Gym' },
      branchId: { _id: 'branch-1', name: 'Main Branch' },
    };

    User.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(userDoc),
      }),
    });

    mockMemberSave.mockResolvedValue({
      _id: 'member-1',
      firstName: 'John',
      lastName: 'Doe',
      branchId: 'branch-1',
      gymId: 'gym-1',
      role: 'member',
    });

    mockMemberModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'member-1',
        firstName: 'John',
        lastName: 'Doe',
        branchId: 'branch-1',
      }),
    });

    const detailsDoc = {
      _id: 'details-1',
      membership: 'monthly',
      paidAmount: 0,
      save: jest.fn().mockResolvedValue(true),
    };
    Details.findOne.mockResolvedValue(detailsDoc);
    MembershipPrice.findOne.mockResolvedValue({ price: 1000 });
    mockPaymentSave.mockResolvedValue(true);

    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockMemberModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: 'member-1', firstName: 'John', lastName: 'Doe', branchId: { name: 'Main Branch' } },
        ]),
      }),
    });

    const app = buildTestApp();

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'manager@test.com',
      password: 'secret123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    const createMemberRes = await request(app).post('/api/members').send({
      firstName: 'John',
      lastName: 'Doe',
      role: 'member',
      branchId: 'branch-1',
    });
    expect(createMemberRes.status).toBe(201);

    const addPaymentRes = await request(app).post('/api/payments/branch-1').send({
      memberId: 'member-1',
      paidAmount: 500,
    });
    expect(addPaymentRes.status).toBe(201);

    const reportRes = await request(app).get('/api/attendance/report').query({
      period: 'day',
      date: '2026-02-24',
    });
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
  });
});
