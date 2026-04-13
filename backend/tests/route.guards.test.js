const express = require('express');
const request = require('supertest');

function buildMiddlewareMocks() {
  const authMiddleware = (req, res, next) => {
    if (req.headers['x-no-auth'] === '1') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = { id: 'user-1', role: 'manager', gymId: 'gym-1', branchId: 'branch-1' };
    return next();
  };

  const managerOrAbove = (req, res, next) => {
    if (req.headers['x-deny-manager-or-above'] === '1') {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  };

  const requireActiveGym = (req, res, next) => {
    if (req.headers['x-frozen-gym'] === '1') {
      return res.status(403).json({ error: 'Gym frozen' });
    }
    return next();
  };

  const staffManagerOrAbove = (req, res, next) => {
    if (req.headers['x-deny-staff-manager'] === '1') {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  };

  const allRoles = (req, res, next) => {
    if (req.headers['x-deny-all-roles'] === '1') {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  };

  const gymOwnerOrAdmin = (req, res, next) => {
    if (req.headers['x-deny-gym-owner'] === '1') {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  };

  return {
    authMiddleware,
    managerOrAbove,
    requireActiveGym,
    staffManagerOrAbove,
    allRoles,
    gymOwnerOrAdmin,
  };
}

function buildAttendanceApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    managerOrAbove: mids.managerOrAbove,
    requireActiveGym: mids.requireActiveGym,
  }));
  jest.doMock('../middleware/membershipValidation', () => ({
    validateMembership: (req, res, next) => next(),
  }));
  jest.doMock('../controllers/attendanceController', () => ({
    uploadMiddleware: (req, res, next) => next(),
    markAttendanceWithFace: (req, res) => res.status(200).json({ ok: true }),
    markAttendanceWithPhotoOnly: (req, res) => res.status(200).json({ ok: true }),
    markAttendanceDualAuth: (req, res) => res.status(200).json({ ok: true }),
    enrollFacePre: (req, res) => res.status(200).json({ ok: true }),
    enrollMemberFace: (req, res) => res.status(200).json({ ok: true }),
    checkMemberReference: (req, res) => res.status(200).json({ ok: true }),
    checkMembershipStatus: (req, res) => res.status(200).json({ ok: true }),
    getAttendanceReport: (req, res) => res.status(200).json({ ok: true }),
    getWeeklyAttendanceReport: (req, res) => res.status(200).json({ ok: true }),
    listAllMembers: (req, res) => res.status(200).json({ ok: true }),
  }));

  const router = require('../routes/attendanceRoutes');
  const app = express();
  app.use('/attendance', router);
  return app;
}

function buildMembershipPriceApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    staffManagerOrAbove: mids.staffManagerOrAbove,
    allRoles: mids.allRoles,
  }));
  jest.doMock('../controllers/membershipPriceController', () => ({
    getAll: (req, res) => res.status(200).json({ ok: true }),
    getOne: (req, res) => res.status(200).json({ ok: true }),
    create: (req, res) => res.status(201).json({ ok: true }),
    update: (req, res) => res.status(200).json({ ok: true }),
    remove: (req, res) => res.status(200).json({ ok: true }),
  }));

  const router = require('../routes/membershipPriceRoutes');
  const app = express();
  app.use(express.json());
  app.use('/membership-prices', router);
  return app;
}

function buildExpenseCategoryApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    managerOrAbove: mids.managerOrAbove,
  }));
  jest.doMock('../controllers/expenseCategoryController', () => ({
    list: (req, res) => res.status(200).json({ ok: true }),
    create: (req, res) => res.status(201).json({ ok: true }),
    update: (req, res) => res.status(200).json({ ok: true }),
    delete: (req, res) => res.status(200).json({ ok: true }),
  }));

  const router = require('../routes/expenseCategoryRoutes');
  const app = express();
  app.use(express.json());
  app.use('/expense-categories', router);
  return app;
}

function buildPaymentApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    managerOrAbove: mids.managerOrAbove,
    gymOwnerOrAdmin: mids.gymOwnerOrAdmin,
    requireGymAccess: () => (req, res, next) => {
      if (req.headers['x-deny-gym-access'] === '1') {
        return res.status(403).json({ error: 'Access denied' });
      }
      return next();
    },
    requireBranchAccess: () => (req, res, next) => {
      if (req.headers['x-deny-branch-access'] === '1') {
        return res.status(403).json({ error: 'Access denied' });
      }
      return next();
    },
    requireActiveGym: mids.requireActiveGym,
  }));
  jest.doMock('../controllers/paymentController', () => ({
    getMembersWithPendingPayments: (req, res) => res.status(200).json({ ok: true }),
    getBranchOverduePayments: (req, res) => res.status(200).json({ ok: true }),
    debugBranchManagerData: (req, res) => res.status(200).json({ ok: true }),
    getGymOwnerAnalytics: (req, res) => res.status(200).json({ ok: true }),
    getBranchManagerAnalytics: (req, res) => res.status(200).json({ ok: true }),
    getGymOwnerOverdueAnalytics: (req, res) => res.status(200).json({ ok: true }),
    getBranchManagerOverdueAnalytics: (req, res) => res.status(200).json({ ok: true }),
    getAll: (req, res) => res.status(200).json({ ok: true }),
    update: (req, res) => res.status(200).json({ ok: true }),
    getMemberPaymentSummary: (req, res) => res.status(200).json({ ok: true }),
    create: (req, res) => res.status(201).json({ ok: true }),
  }));

  const router = require('../routes/paymentRoutes');
  const app = express();
  app.use(express.json());
  app.use('/payments', router);
  return app;
}

function buildExpenseApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    staffManagerOrAbove: mids.staffManagerOrAbove,
  }));
  jest.doMock('../controllers/expenseController', () => ({
    list: (req, res) => res.status(200).json({ ok: true }),
    getTotalForRange: (req, res) => res.status(200).json({ ok: true }),
    create: (req, res) => res.status(201).json({ ok: true }),
    update: (req, res) => res.status(200).json({ ok: true }),
    delete: (req, res) => res.status(200).json({ ok: true }),
  }));

  const router = require('../routes/expenseRoutes');
  const app = express();
  app.use(express.json());
  app.use('/expenses', router);
  return app;
}

function buildMemberApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    managerOrAbove: mids.managerOrAbove,
    requireActiveGym: mids.requireActiveGym,
    gymOwnerOrAdmin: mids.gymOwnerOrAdmin,
  }));
  jest.doMock('../controllers/attendanceController', () => ({
    markAttendanceWithFace: (req, res) => res.status(200).json({ ok: true }),
  }));
  jest.doMock('../controllers/memberController', () => ({
    uploadMiddleware: (req, res, next) => next(),
    create: (req, res) => res.status(201).json({ ok: true }),
    getAll: (req, res) => res.status(200).json({ ok: true }),
    getOne: (req, res) => res.status(200).json({ ok: true }),
    update: (req, res) => res.status(200).json({ ok: true }),
    patch: (req, res) => res.status(200).json({ ok: true }),
    updateProfileImage: (req, res) => res.status(200).json({ ok: true }),
    renew: (req, res) => res.status(200).json({ ok: true }),
    remove: (req, res) => res.status(200).json({ ok: true }),
    testLuxand: (req, res) => res.status(200).json({ ok: true }),
    checkExpiredMemberships: (req, res) => res.status(200).json({ ok: true }),
  }));
  jest.doMock('../routes/memberFingerprintRoutes', () => {
    const router = require('express').Router();
    return router;
  });

  const router = require('../routes/memberRoutes');
  const app = express();
  app.use(express.json());
  app.use('/members', router);
  return app;
}

function buildWebauthnApp() {
  jest.resetModules();
  const mids = buildMiddlewareMocks();

  jest.doMock('../middleware/authMiddleware', () => mids.authMiddleware);
  jest.doMock('../middleware/rbacMiddleware', () => ({
    managerOrAbove: mids.managerOrAbove,
    requireActiveGym: mids.requireActiveGym,
  }));
  jest.doMock('../controllers/webauthnController', () => ({
    registerStart: (req, res) => res.status(200).json({ ok: true }),
    registerVerify: (req, res) => res.status(200).json({ ok: true }),
    loginStart: (req, res) => res.status(200).json({ ok: true }),
    loginVerify: (req, res) => res.status(200).json({ ok: true }),
  }));

  const router = require('../routes/webauthnRoutes');
  const app = express();
  app.use(express.json());
  app.use('/webauthn', router);
  return app;
}

describe('Route guard coverage', () => {
  it('enforces auth and active-gym guard on attendance marking endpoint', async () => {
    const app = buildAttendanceApp();

    const noAuth = await request(app).post('/attendance/').set('x-no-auth', '1');
    expect(noAuth.status).toBe(401);

    const frozenGym = await request(app).post('/attendance/').set('x-frozen-gym', '1');
    expect(frozenGym.status).toBe(403);
  });

  it('enforces role guards on membership price routes', async () => {
    const app = buildMembershipPriceApp();

    const deniedRead = await request(app)
      .get('/membership-prices')
      .set('x-deny-all-roles', '1');
    expect(deniedRead.status).toBe(403);

    const deniedWrite = await request(app)
      .post('/membership-prices')
      .send({ type: 'monthly', price: 1000, description: 'x', duration: 30 })
      .set('x-deny-staff-manager', '1');
    expect(deniedWrite.status).toBe(403);
  });

  it('enforces manager-or-above guard on expense category routes', async () => {
    const app = buildExpenseCategoryApp();

    const denied = await request(app)
      .get('/expense-categories')
      .set('x-deny-manager-or-above', '1');
    expect(denied.status).toBe(403);
  });

  it('enforces auth for members attendance endpoint', async () => {
    const app = buildMemberApp();

    const noAuth = await request(app)
      .post('/members/attendance')
      .set('x-no-auth', '1');
    expect(noAuth.status).toBe(401);

    const frozenGym = await request(app)
      .post('/members/attendance')
      .set('x-frozen-gym', '1');
    expect(frozenGym.status).toBe(403);
  });

  it('enforces payment route guards (role, branch access, active gym)', async () => {
    const app = buildPaymentApp();

    const noAuth = await request(app).get('/payments/pending').set('x-no-auth', '1');
    expect(noAuth.status).toBe(401);

    const deniedRole = await request(app).get('/payments/pending').set('x-deny-manager-or-above', '1');
    expect(deniedRole.status).toBe(403);

    const deniedBranch = await request(app).post('/payments/branch-1').set('x-deny-branch-access', '1');
    expect(deniedBranch.status).toBe(403);

    const frozenGym = await request(app).post('/payments/branch-1').set('x-frozen-gym', '1');
    expect(frozenGym.status).toBe(403);
  });

  it('enforces staff-manager guard on expense routes', async () => {
    const app = buildExpenseApp();

    const noAuth = await request(app).get('/expenses').set('x-no-auth', '1');
    expect(noAuth.status).toBe(401);

    const denied = await request(app).get('/expenses').set('x-deny-staff-manager', '1');
    expect(denied.status).toBe(403);
  });

  it('enforces auth and active-gym on WebAuthn register routes', async () => {
    const app = buildWebauthnApp();

    const noAuth = await request(app).post('/webauthn/register/start').set('x-no-auth', '1');
    expect(noAuth.status).toBe(401);

    const frozenGym = await request(app).post('/webauthn/register/start').set('x-frozen-gym', '1');
    expect(frozenGym.status).toBe(403);
  });
});
