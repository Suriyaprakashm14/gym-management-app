const { createMockRes } = require('./helpers/httpMocks');

jest.mock('../models/user', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/member', () => ({
  findOne: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
}));

const User = require('../models/user');
const Member = require('../models/member');
const authController = require('../controllers/authController');

describe('Auth - login', () => {
  it('returns token and user for valid RBAC user', async () => {
    const req = {
      body: {
        email: 'owner@test.com',
        password: 'secret123',
      },
    };
    const res = createMockRes();

    const userDoc = {
      _id: 'user-1',
      firstName: 'Gym',
      lastName: 'Owner',
      email: 'owner@test.com',
      role: 'gym_owner',
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
    Member.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    const payload = res.body;
    expect(payload.success).toBe(true);
    expect(payload.message).toBe('Login successful');
    expect(payload.token).toBeDefined();
    expect(payload.user.email).toBe('owner@test.com');
    expect(payload.user.role).toBe('gym_owner');
  });
});
