/**
 * Development seed: creates dev users (admin, owner, manager) and optional mock data.
 * Run at server startup when DB is empty or SEED_DEV=1.
 * Skip OTP and account lock for dev.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const Member = require('../models/member');
const MembersPersonalDetails = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');
const Payment = require('../models/payment');
const Attendance = require('../models/attendance');

const DEV_USERS = [
  { email: 'admin@gympro.com', password: 'Admin123', firstName: 'Admin', lastName: 'User', role: 'admin' },
  { email: 'owner@gympro.com', password: 'Owner123', firstName: 'Gym', lastName: 'Owner', role: 'gym_owner' },
  { email: 'manager@gympro.com', password: 'Manager123', firstName: 'Branch', lastName: 'Manager', role: 'manager' },
];

async function seedDevUsers() {
  const existingAdmin = await User.findOne({ email: 'admin@gympro.com' });
  if (existingAdmin) {
    console.log('Dev users already exist, skipping user seed.');
    return { admin: existingAdmin, gym: null, branch: null };
  }

  const admin = new User({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@gympro.com',
    password: 'Admin123',
    role: 'admin',
    status: 'active',
    isActive: true,
    createdBy: 'system',
  });
  await admin.save();
  console.log('Created dev admin: admin@gympro.com');

  const gym = new Gym({
    name: 'Dev Gym',
    description: 'Development gym',
    status: 'active',
    isFrozen: false,
    createdBy: admin._id,
  });
  await gym.save();
  console.log('Created dev gym:', gym.name);

  const branch1 = new Branch({
    name: 'Downtown Branch',
    gymId: gym._id,
    address: { street: '123 Main St', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001', country: 'India' },
    contactInfo: { phone: '+919876543210', email: 'downtown@devgym.com' },
    status: 'active',
    isActive: true,
    createdBy: admin._id,
  });
  await branch1.save();

  const branch2 = new Branch({
    name: 'Uptown Branch',
    gymId: gym._id,
    address: { street: '456 Park Ave', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600002', country: 'India' },
    contactInfo: { phone: '+919876543211', email: 'uptown@devgym.com' },
    status: 'active',
    isActive: true,
    createdBy: admin._id,
  });
  await branch2.save();
  console.log('Created 2 dev branches');

  const gymOwner = new User({
    firstName: 'Gym',
    lastName: 'Owner',
    email: 'owner@gympro.com',
    password: 'Owner123',
    role: 'gym_owner',
    gymId: gym._id,
    status: 'active',
    isActive: true,
    createdBy: admin._id,
  });
  await gymOwner.save();
  console.log('Created dev gym owner: owner@gympro.com');

  const manager = new User({
    firstName: 'Branch',
    lastName: 'Manager',
    email: 'manager@gympro.com',
    password: 'Manager123',
    role: 'manager',
    gymId: gym._id,
    branchId: branch1._id,
    status: 'active',
    isActive: true,
    createdBy: admin._id,
  });
  await manager.save();
  console.log('Created dev manager: manager@gympro.com');

  return { admin, gym, branch1, branch2, gymOwner, manager };
}

async function seedMockData(admin, gym, branch1, branch2) {
  if (!gym) return;

  const memberCount = await Member.countDocuments();
  if (memberCount >= 5) {
    console.log('Members already exist, skipping mock data seed.');
    return;
  }

  const types = [
    { type: 'basic', price: 999, duration: 30, description: 'Basic monthly' },
    { type: 'premium', price: 2499, duration: 90, description: 'Premium quarterly' },
    { type: 'vip', price: 7999, duration: 365, description: 'VIP annual' },
  ];
  for (const t of types) {
    const exists = await MembershipPrice.findOne({ gymId: gym._id, type: t.type });
    if (!exists) {
      await MembershipPrice.create({ ...t, gymId: gym._id });
    }
  }
  console.log('Created 3 membership types');

  const firstNames = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Jamie', 'Quinn', 'Reese', 'Dakota', 'Skyler', 'Parker', 'Avery', 'Cameron', 'Drew', 'Blake', 'Finley', 'River', 'Sage'];
  const lastNames = ['Smith', 'Lee', 'Kumar', 'Patel', 'Sharma', 'Jones', 'Brown', 'Williams', 'Davis', 'Wilson', 'Martinez', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Young', 'King'];

  const members = [];
  for (let i = 0; i < 20; i++) {
    const branch = i % 2 === 0 ? branch1 : branch2;
    const m = await Member.create({
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      email: `member${i + 1}@devgym.com`,
      gymId: gym._id,
      branchId: branch._id,
      role: 'member',
      membership: { type: ['basic', 'premium', 'vip'][i % 3], startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true },
    });
    members.push(m);
  }
  console.log('Created 20 dev members');

  const priceDocs = await MembershipPrice.find({ gymId: gym._id }).lean();
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const existing = await MembersPersonalDetails.findOne({ memberId: member._id });
    if (existing) continue;
    const price = priceDocs[i % priceDocs.length];
    await MembersPersonalDetails.create({
      memberId: member._id,
      gender: 'male',
      phoneNumber: '+9198765' + String(40000 + i).slice(0, 5),
      membership: price?.type || 'basic',
      paidAmount: i % 4 === 0 ? 0 : (price?.price || 999),
    });
  }
  console.log('Created members personal details');

  const paymentCount = await Payment.countDocuments();
  if (paymentCount < 10) {
    for (let i = 0; i < Math.min(10, members.length); i++) {
      const member = members[i];
      const detail = await MembersPersonalDetails.findOne({ memberId: member._id });
      if (!detail) continue;
      const totalAmount = (priceDocs[i % priceDocs.length]?.price || 999) * (i % 2 === 0 ? 1 : 2);
      const paidAmount = i < 6 ? totalAmount : totalAmount * 0.5; // 6 paid, 4 with balance (overdue)
      await Payment.create({
        memberId: member._id,
        branchId: member.branchId,
        name: `${member.firstName} ${member.lastName}`,
        detailsId: detail._id,
        membership: detail.membership || 'basic',
        totalAmount,
        paidAmount,
        paidAt: new Date(), // last payment date (partial for overdue)
      });
    }
    console.log('Created 10 payments (mix paid + overdue)');
  }

  const attendanceCount = await Attendance.countDocuments();
  if (attendanceCount < 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < Math.min(7, members.length); i++) {
      await Attendance.create({
        gymId: members[i].gymId,
        memberId: members[i]._id,
        attendanceDate: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        status: 'Present',
        authMethod: 'manual',
        location: { branchId: members[i].branchId },
        checkInTime: new Date(),
      });
    }
    console.log('Created weekly attendance records');
  }
}

async function runSeed() {
  if (mongoose.connection.readyState !== 1) {
    console.warn('Seed skipped: MongoDB not connected');
    return;
  }
  const existingDev = await User.findOne({ email: 'admin@gympro.com' });
  if (existingDev) {
    console.log('Dev seed: admin@gympro.com already exists, skipping.');
    return;
  }

  const isLocalMongo =
    typeof process.env.MONGODB_URI === 'string' &&
    process.env.MONGODB_URI.includes('localhost');
  const shouldSeed =
    process.env.SEED_DEV === '1' ||
    process.env.NODE_ENV === 'development' ||
    isLocalMongo;
  if (!shouldSeed) {
    console.log('Dev seed skipped (NODE_ENV/SEED_DEV/MONGODB_URI conditions not met).');
    return;
  }

  try {
    const { admin, gym, branch1, branch2 } = await seedDevUsers();
    await seedMockData(admin, gym, branch1, branch2);
    console.log('Dev seed completed.');
  } catch (err) {
    console.error('Dev seed error:', err);
  }
}

module.exports = { runSeed, seedDevUsers, seedMockData };
