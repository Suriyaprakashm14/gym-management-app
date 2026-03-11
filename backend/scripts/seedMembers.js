/**
 * Seed script: creates sample members for development/testing.
 * Uses existing Gym and Branch (run seed:users first if needed).
 *
 * Run from backend folder:
 *   npm run seed:members
 *
 * Seed for owner elite@mukesh.com (userid: elite@mukesh.com, password: mukesh123):
 *   npm run seed:members:elite
 * Or for any owner by email:
 *   node scripts/seedMembers.js <owner@email.com>
 *   SEED_OWNER_EMAIL=owner@email.com npm run seed:members
 *
 * Requires: MONGODB_URI in .env (optional; defaults to mongodb://localhost:27017/gym-management)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';
// Owner email: from CLI (node seedMembers.js elite@mukesh.com) or env SEED_OWNER_EMAIL
const SEED_OWNER_EMAIL = process.argv[2] || process.env.SEED_OWNER_EMAIL || null;

const Member = require('../models/member');
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const User = require('../models/user');

const SEED_MEMBERS = [
  {
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@example.com',
    role: 'member',
    profile: {
      phone: '9876543210',
      gender: 'female',
      dateOfBirth: new Date('1992-03-15'),
      address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
    },
    membership: { type: 'premium', startDate: new Date(), endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'Bob',
    lastName: 'Brown',
    email: 'bob.brown@example.com',
    role: 'member',
    profile: {
      phone: '9876543211',
      gender: 'male',
      dateOfBirth: new Date('1988-07-22'),
      address: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
    },
    membership: { type: 'basic', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'Carol',
    lastName: 'Davis',
    email: 'carol.davis@example.com',
    role: 'member',
    profile: {
      phone: '9876543212',
      gender: 'female',
      address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    },
    membership: { type: 'vip', startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'David',
    lastName: 'Miller',
    email: 'david.miller@example.com',
    role: 'member',
    profile: { phone: '9876543213', gender: 'male' },
    membership: { type: 'basic', startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'Eva',
    lastName: 'Wilson',
    email: 'eva.wilson@example.com',
    role: 'member',
    profile: {
      phone: '9876543214',
      gender: 'female',
      dateOfBirth: new Date('1995-11-08'),
      address: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    },
    membership: { type: 'premium', startDate: new Date(), endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'Frank',
    lastName: 'Taylor',
    email: 'frank.taylor@example.com',
    role: 'trainer',
    profile: { phone: '9876543215', gender: 'male' },
    membership: { type: 'vip', startDate: new Date(), endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), isActive: true },
  },
  {
    firstName: 'Grace',
    lastName: 'Anderson',
    email: 'grace.anderson@example.com',
    role: 'member',
    profile: { phone: '9876543216', gender: 'female' },
    membership: { type: 'basic', startDate: new Date(), endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), isActive: false },
  },
  {
    firstName: 'Henry',
    lastName: 'Thomas',
    email: 'henry.thomas@example.com',
    role: 'member',
    profile: { phone: '9876543217', gender: 'male' },
    membership: { type: 'premium', startDate: new Date(), endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), isActive: true },
  },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  let gymId;
  let branchId;
  let createdBy = 'seed-script';

  if (SEED_OWNER_EMAIL) {
    const owner = await User.findOne({ email: SEED_OWNER_EMAIL.toLowerCase().trim(), role: 'gym_owner' }).lean();
    if (!owner) {
      console.error('Owner not found for email:', SEED_OWNER_EMAIL, '(must be gym_owner).');
      await mongoose.disconnect();
      process.exit(1);
    }
    gymId = owner.gymId && owner.gymId._id ? owner.gymId._id : owner.gymId;
    if (!gymId) {
      console.error('Owner has no gymId:', SEED_OWNER_EMAIL);
      await mongoose.disconnect();
      process.exit(1);
    }
    const branch = await Branch.findOne({ gymId }).lean();
    if (!branch) {
      console.error('No branch found for owner gym. Create a branch for this gym first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    branchId = branch._id;
    createdBy = owner._id;
    console.log('Seeding for owner:', SEED_OWNER_EMAIL, '| gymId:', gymId, '| branchId:', branchId, '\n');
  } else {
    const gym = await Gym.findOne().lean();
    const branch = await Branch.findOne(gym ? { gymId: gym._id } : {}).lean();
    if (!gym || !branch) {
      console.error('No gym or branch found. Run "npm run seed:users" first or set SEED_OWNER_EMAIL=elite@mukesh.com');
      await mongoose.disconnect();
      process.exit(1);
    }
    gymId = gym._id;
    branchId = branch._id;
    console.log('Using gymId:', gymId, '| branchId:', branchId, '\n');
  }

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_MEMBERS) {
    const { email, ...rest } = seed;
    if (email) {
      const existing = await Member.findOne({ email: email.toLowerCase() });
      if (existing) {
        console.log('Skip (exists):', email);
        skipped++;
        continue;
      }
    }

    try {
      await Member.create({
        ...rest,
        gymId,
        branchId,
        email: email ? email.toLowerCase() : undefined,
        status: 'active',
        isActive: true,
        createdBy,
      });
      console.log('Created:', seed.firstName, seed.lastName, seed.email || '(no email)');
      created++;
    } catch (err) {
      console.error('Failed:', seed.email || `${seed.firstName} ${seed.lastName}`, err.message);
    }
  }

  console.log('\nDone. Created:', created, '| Skipped:', skipped);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed members failed:', err);
  process.exit(1);
});
