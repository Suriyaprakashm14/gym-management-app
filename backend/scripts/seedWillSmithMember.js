/**
 * Seed script: creates a Member "Will Smith" with Luxand personId for face-testing.
 *
 * Run from project root:
 *   node backend/scripts/seedWillSmithMember.js
 *
 * Requires: MONGODB_URI (optional). Uses existing Gym and Branch.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';

const Member = require('../models/member');
const Gym = require('../models/gym');
const Branch = require('../models/branch');

const WILL_SMITH_PERSON_ID = 'f05325e6-1c43-11f1-86d3-0242ac120002';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const gym = await Gym.findOne().lean();
  const branch = await Branch.findOne(gym ? { gymId: gym._id } : {}).lean();

  if (!gym || !branch) {
    console.error('No gym or branch found. Run seed:users first to create a gym and branch.');
    process.exit(1);
  }

  const existing = await Member.findOne({ personId: WILL_SMITH_PERSON_ID });
  if (existing) {
    console.log('Member with this personId already exists:');
    console.log('  _id:', existing._id);
    console.log('  name:', existing.firstName, existing.lastName);
    console.log('  personId:', existing.personId);
    await mongoose.disconnect();
    return;
  }

  const member = await Member.create({
    firstName: 'Will',
    lastName: 'Smith',
    gymId: gym._id,
    branchId: branch._id,
    personId: WILL_SMITH_PERSON_ID,
    authMethods: {
      faceRecognition: true,
      fingerprint: false,
    },
    membership: {
      type: 'basic',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      autoRenew: false,
    },
    status: 'active',
    role: 'member',
  });

  console.log('Created member for face testing:');
  console.log('  _id:', member._id);
  console.log('  name:', member.firstName, member.lastName);
  console.log('  personId:', member.personId);
  console.log('\nTo run the Luxand face test with this member:');
  console.log('  set LUXAND_FACE_TEST_MEMBER_ID=' + member._id);
  console.log('  node backend/scripts/luxandFaceTest.js');
  console.log('\nOr:');
  console.log('  LUXAND_FACE_TEST_MEMBER_ID=' + member._id + ' node backend/scripts/luxandFaceTest.js');

  await mongoose.disconnect();
  console.log('\nMongoDB disconnected.');
}

run().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
