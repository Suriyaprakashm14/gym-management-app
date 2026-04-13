/**
 * Integration tests for Member.checkAndUpdateExpiredMemberships against an in-memory MongoDB.
 * Covers phase-1 (Details-driven), phase-2 (Member-driven), subscriptionPeriods repairs,
 * skip rules, 90-day inactive vs long-term inactive, and repair-from-Details edge cases.
 *
 * Requires spawning a real mongod binary (mongodb-memory-server). If `npm test` fails with
 * UnexpectedCloseError / exit 48, run tests outside a restricted sandbox or ensure mongod can start.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { v4: uuidv4 } = require('uuid');

jest.setTimeout(120000);

const DAY_MS = 24 * 60 * 60 * 1000;

function localMidnight(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function addDays(base, n) {
  const t = new Date(base.getTime());
  t.setDate(t.getDate() + n);
  return t;
}

let mongoServer;
let Member;
let Details;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  Member = require('../models/member');
  Details = require('../models/membersPersonalDetails');
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
  if (!Member || mongoose.connection.readyState !== 1) return;
  await Member.deleteMany({});
  await Details.deleteMany({});
});

async function seedMember(overrides = {}) {
  const _id = overrides._id || uuidv4();
  const today = localMidnight();
  const doc = await Member.create({
    _id,
    firstName: 'Expiry',
    lastName: 'Test',
    email: `${_id}@expiry.test`,
    gymId: 'gym-expiry',
    branchId: 'branch-expiry',
    role: 'member',
    status: 'active',
    membership: {
      type: 'basic',
      startDate: addDays(today, -30),
      endDate: addDays(today, -1),
      isActive: true,
    },
    ...overrides,
  });
  return doc;
}

async function seedDetails(partial) {
  return Details.create({
    gender: 'male',
    membership: 'basic',
    membership_start_date: addDays(localMidnight(), -60),
    ...partial,
  });
}

describe('Member.checkAndUpdateExpiredMemberships (integration)', () => {
  it('returns success with asOfLocalDate aligned to local calendar day', async () => {
    const result = await Member.checkAndUpdateExpiredMemberships();
    expect(result.success).toBe(true);
    expect(result.asOfLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = localMidnight();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(result.asOfLocalDate).toBe(expected);
  });

  it('marks a simple expired member inactive when Details end is before today', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -40),
        endDate: addDays(today, -2),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(today, -40),
      membership_end_date: addDays(today, -2),
    });

    const result = await Member.checkAndUpdateExpiredMemberships();
    expect(result.expiredCount).toBe(1);

    const updated = await Member.findById(m._id).lean();
    expect(updated.status).toBe('inactive');
    expect(updated.membership.isActive).toBe(false);
  });

  it('uses long term inactive when membership ended more than 90 days ago', async () => {
    const today = localMidnight();
    const oldEnd = new Date(today.getTime() - 120 * DAY_MS);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(oldEnd, -365),
        endDate: oldEnd,
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(oldEnd, -365),
      membership_end_date: oldEnd,
    });

    await Member.checkAndUpdateExpiredMemberships();
    const updated = await Member.findById(m._id).lean();
    expect(updated.status).toBe('long term inactive');
    expect(updated.membership.isActive).toBe(false);
  });

  it('does not auto-change suspended members with expired Details', async () => {
    const today = localMidnight();
    const m = await seedMember({
      status: 'suspended',
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -3),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_end_date: addDays(today, -3),
    });

    await Member.checkAndUpdateExpiredMemberships();
    const updated = await Member.findById(m._id).lean();
    expect(updated.status).toBe('suspended');
  });

  it('does not auto-change already inactive members', async () => {
    const today = localMidnight();
    const m = await seedMember({
      status: 'inactive',
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -3),
        isActive: false,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_end_date: addDays(today, -3),
    });

    await Member.checkAndUpdateExpiredMemberships();
    const updated = await Member.findById(m._id).lean();
    expect(updated.status).toBe('inactive');
  });

  it('skips trainers (role) even when Details look expired', async () => {
    const today = localMidnight();
    const m = await seedMember({
      role: 'trainer',
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -3),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_end_date: addDays(today, -3),
    });

    await Member.checkAndUpdateExpiredMemberships();
    const updated = await Member.findById(m._id).lean();
    expect(updated.role).toBe('trainer');
    expect(updated.status).toBe('active');
  });

  it('advances to current subscriptionPeriod when Details/Member dates are stale', async () => {
    const today = localMidnight();
    const currentStart = addDays(today, -7);
    const currentEnd = addDays(today, 21);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -60),
        endDate: addDays(today, -1),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(today, -60),
      membership_end_date: addDays(today, -1),
      subscriptionPeriods: [{ startDate: currentStart, endDate: currentEnd }],
    });

    const result = await Member.checkAndUpdateExpiredMemberships();
    expect(result.advancedCount).toBeGreaterThanOrEqual(1);

    const mem = await Member.findById(m._id).lean();
    const det = await Details.findOne({ memberId: m._id }).lean();
    expect(mem.status).toBe('active');
    expect(mem.membership.isActive).toBe(true);
    expect(new Date(mem.membership.endDate).getTime()).toBe(currentEnd.getTime());
    expect(new Date(det.membership_end_date).getTime()).toBe(currentEnd.getTime());
  });

  it('syncs upcoming paid window when now is before that period starts', async () => {
    const today = localMidnight();
    const upcomingStart = addDays(today, 2);
    const upcomingEnd = addDays(today, 32);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -40),
        endDate: addDays(today, -1),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_end_date: addDays(today, -1),
      subscriptionPeriods: [{ startDate: upcomingStart, endDate: upcomingEnd }],
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('active');
    expect(new Date(mem.membership.startDate).getTime()).toBe(upcomingStart.getTime());
    expect(new Date(mem.membership.endDate).getTime()).toBe(upcomingEnd.getTime());
  });

  it('repairs Member from Details when Member end is before today but Details end is still valid', async () => {
    const today = localMidnight();
    const goodEnd = addDays(today, 10);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -10),
        endDate: addDays(today, -2),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(today, -10),
      membership_end_date: goodEnd,
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.membership.isActive).toBe(true);
    expect(new Date(mem.membership.endDate).getTime()).toBe(goodEnd.getTime());
    expect(mem.status).toBe('active');
  });

  it('phase 2: member expired on Member doc but no Details row → inactive', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -4),
        isActive: true,
      },
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('inactive');
    expect(mem.membership.isActive).toBe(false);
  });

  it('phase 2: Details exists but membership field missing → inactive', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -4),
        isActive: true,
      },
    });
    await Details.create({
      memberId: m._id,
      gender: 'female',
      membership: null,
      membership_start_date: null,
      membership_end_date: null,
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('inactive');
  });

  it('marks inactive when periods exist but all ended and now is after last end', async () => {
    const today = localMidnight();
    const segEnd = addDays(today, -5);
    const segStart = addDays(segEnd, -30);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: segStart,
        endDate: segEnd,
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: segStart,
      membership_end_date: segEnd,
      subscriptionPeriods: [{ startDate: segStart, endDate: segEnd }],
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('inactive');
    expect(mem.membership.isActive).toBe(false);
  });

  it('treats non-empty periods with only invalid entries as inactive path', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -2),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(today, -20),
      membership_end_date: addDays(today, -2),
      subscriptionPeriods: [{ startDate: addDays(today, -5), endDate: null }],
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('inactive');
  });

  it('does not include Details with end before today when membership plan field is absent', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -5),
        endDate: addDays(today, 10),
        isActive: true,
      },
    });
    await Details.create({
      memberId: m._id,
      gender: 'male',
      membership_end_date: addDays(today, -10),
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('active');
  });

  it('90-day rule: end just inside the 90-day rolling window → inactive (not long term)', async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * DAY_MS);
    const end = new Date(ninetyDaysAgo.getTime() + 3 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 30 * DAY_MS);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: start,
        endDate: end,
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_start_date: start,
      membership_end_date: end,
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('inactive');
  });

  it('90-day rule: end clearly older than now − 90 days → long term inactive', async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * DAY_MS);
    const end = new Date(ninetyDaysAgo.getTime() - 2 * DAY_MS);
    const start = new Date(end.getTime() - 30 * DAY_MS);
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: start,
        endDate: end,
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_start_date: start,
      membership_end_date: end,
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('long term inactive');
  });

  it('does not crash when Details references a missing Member', async () => {
    const today = localMidnight();
    await seedDetails({
      memberId: uuidv4(),
      membership: 'basic',
      membership_end_date: addDays(today, -3),
    });

    const result = await Member.checkAndUpdateExpiredMemberships();
    expect(result.success).toBe(true);
  });

  it('leaves active members untouched when Details end is today or later', async () => {
    const today = localMidnight();
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -5),
        endDate: addDays(today, 7),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership_start_date: addDays(today, -5),
      membership_end_date: addDays(today, 7),
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('active');
    expect(mem.membership.isActive).toBe(true);
  });

  it('processes multiple expired members in one run', async () => {
    const today = localMidnight();
    const m1 = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -20),
        endDate: addDays(today, -2),
        isActive: true,
      },
    });
    const m2 = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -25),
        endDate: addDays(today, -3),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m1._id,
      membership: 'basic',
      membership_start_date: addDays(today, -20),
      membership_end_date: addDays(today, -2),
    });
    await seedDetails({
      memberId: m2._id,
      membership: 'basic',
      membership_start_date: addDays(today, -25),
      membership_end_date: addDays(today, -3),
    });

    const result = await Member.checkAndUpdateExpiredMemberships();
    expect(result.expiredCount).toBe(2);
    const u1 = await Member.findById(m1._id).lean();
    const u2 = await Member.findById(m2._id).lean();
    expect(u1.status).toBe('inactive');
    expect(u2.status).toBe('inactive');
  });

  it('advances using unsorted subscriptionPeriods (same as renewal ordering)', async () => {
    const today = localMidnight();
    const currentStart = addDays(today, -3);
    const currentEnd = addDays(today, 14);
    const older = { startDate: addDays(today, -80), endDate: addDays(today, -40) };
    const newer = { startDate: currentStart, endDate: currentEnd };
    const m = await seedMember({
      membership: {
        type: 'basic',
        startDate: addDays(today, -90),
        endDate: addDays(today, -1),
        isActive: true,
      },
    });
    await seedDetails({
      memberId: m._id,
      membership: 'basic',
      membership_start_date: addDays(today, -90),
      membership_end_date: addDays(today, -1),
      subscriptionPeriods: [newer, older],
    });

    await Member.checkAndUpdateExpiredMemberships();
    const mem = await Member.findById(m._id).lean();
    expect(mem.status).toBe('active');
    expect(new Date(mem.membership.endDate).getTime()).toBe(currentEnd.getTime());
  });
});
