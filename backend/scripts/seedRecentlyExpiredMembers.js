/**
 * Seed script: creates dummy members with membership expired in the last 7 days
 * so they appear under the "Recently Expired" tab.
 *
 * Run from backend folder: node scripts/seedRecentlyExpiredMembers.js
 * Requires: MONGODB_URI in .env, and at least one Gym and one Branch in the DB.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';

const Member = require('../models/member');
const MembersPersonalDetails = require('../models/membersPersonalDetails');
const Gym = require('../models/gym');
const Branch = require('../models/branch');

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(23, 59, 59, 999);
  return d;
}

const DUMMY_RECENTLY_EXPIRED = [
  { firstName: 'Alex', lastName: 'Morgan', email: 'alex.recentlyexpired@example.com', daysExpiredAgo: 2 },
  { firstName: 'Jordan', lastName: 'Lee', email: 'jordan.recentlyexpired@example.com', daysExpiredAgo: 4 },
  { firstName: 'Sam', lastName: 'Taylor', email: 'sam.recentlyexpired@example.com', daysExpiredAgo: 6 },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const gym = await Gym.findOne().lean();
  if (!gym) {
    console.error('No gym found. Create a gym first (e.g. via auth/signup or admin).');
    process.exit(1);
  }
  const gymId = gym._id.toString();

  const branch = await Branch.findOne({ gymId }).lean();
  if (!branch) {
    console.error('No branch found for this gym. Create a branch first.');
    process.exit(1);
  }
  const branchId = branch._id.toString();

  console.log('Using gymId:', gymId, 'branchId:', branchId);

  for (const dummy of DUMMY_RECENTLY_EXPIRED) {
    const endDate = daysAgo(dummy.daysExpiredAgo);

    const existing = await Member.findOne({ email: dummy.email }).lean();
    if (existing) {
      await Member.updateOne(
        { _id: existing._id },
        {
          $set: {
            'membership.endDate': endDate,
            'membership.isActive': false,
            status: 'active',
          },
        }
      );
      const detail = await MembersPersonalDetails.findOne({ memberId: existing._id });
      if (detail) {
        await MembersPersonalDetails.updateOne(
          { memberId: existing._id },
          { $set: { membership_end_date: endDate, membership: 'basic' } }
        );
      } else {
        await MembersPersonalDetails.create({
          memberId: existing._id,
          phoneNumber: '9999000001',
          gender: 'male',
          membership: 'basic',
          membership_end_date: endDate,
        });
      }
      console.log('Updated existing member (recently expired):', dummy.email);
      continue;
    }

    const memberId = uuidv4();
    await Member.create({
      _id: memberId,
      firstName: dummy.firstName,
      lastName: dummy.lastName,
      email: dummy.email,
      gymId,
      branchId,
      role: 'member',
      status: 'active',
      profile: { phone: '9999000001' },
      membership: {
        type: 'basic',
        startDate: daysAgo(dummy.daysExpiredAgo + 30),
        endDate,
        isActive: false,
      },
    });

    await MembersPersonalDetails.create({
      memberId,
      phoneNumber: '9999000001',
      gender: 'male',
      membership: 'basic',
      membership_start_date: daysAgo(dummy.daysExpiredAgo + 30),
      membership_end_date: endDate,
    });

    console.log('Created recently expired member:', dummy.email, '(expired', dummy.daysExpiredAgo, 'days ago)');
  }

  console.log('Done. Check the "Recently Expired" tab on the Members page.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
