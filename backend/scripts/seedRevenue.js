/* Simple revenue seeder for local/dev use.
 * It creates a gym, a branch, one member and monthly payments across a year
 * so that the Revenue page has data to display.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Gym = require('../models/gym');
const Branch = require('../models/branch');
const Member = require('../models/member');
const Payment = require('../models/payment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

async function main() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    console.log('Connected to MongoDB, seeding revenue data...');

    // Prefer seeding into an existing gym/branch so analytics for your login can see it.
    let gym = await Gym.findOne();
    if (!gym) {
      // Fallback: create a demo gym if none exist
      gym = await Gym.create({
        name: 'Demo Gym',
        createdBy: 'demo-owner',
        isFrozen: false,
      });
      console.log('Created demo gym:', gym._id);
    } else {
      console.log('Using existing gym:', gym._id, gym.name);
    }

    let branch = await Branch.findOne({ gymId: gym._id });
    if (!branch) {
      // Fallback: create a simple main branch for this gym
      branch = await Branch.create({
        name: 'Main Branch',
        gymId: gym._id,
        contactInfo: { phone: '0000000000' },
        createdBy: gym.createdBy || 'demo-owner',
      });
      console.log('Created demo branch:', branch._id);
    } else {
      console.log('Using existing branch:', branch._id, branch.name);
    }

    // Reuse any existing member in this branch if possible, otherwise create a demo one
    let member = await Member.findOne({ branchId: branch._id, role: 'member' });
    if (!member) {
      member = await Member.findOne({
        firstName: 'Demo',
        lastName: 'Member',
        gymId: gym._id,
        branchId: branch._id,
      });
    }
    if (!member) {
      member = await Member.create({
        firstName: 'Demo',
        lastName: 'Member',
        // avoid duplicate email conflicts by using a timestamped email
        email: `demo.member+${Date.now()}@example.com`,
        gymId: gym._id,
        branchId: branch._id,
        membership: {
          type: 'basic',
          startDate: new Date(),
          isActive: true,
        },
        status: 'active',
        isActive: true,
        createdBy: gym.createdBy || 'demo-owner',
      });
      console.log('Created demo member:', member._id);
    } else {
      console.log('Using existing member:', member._id, member.firstName, member.lastName);
    }

    const targetYear = new Date().getFullYear();

    // Remove any existing payments for this member+branch+year so seeding is idempotent
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear + 1, 0, 1);
    await Payment.deleteMany({
      memberId: member._id,
      branchId: branch._id,
      paidAt: { $gte: startOfYear, $lt: endOfYear },
    });

    // Create a simple increasing revenue pattern Jan–Dec
    const baseAmount = 1000;
    const paymentsToInsert = [];

    for (let month = 0; month < 12; month += 1) {
      const paidAt = new Date(targetYear, month, 5); // 5th of each month
      const multiplier = 1 + month * 0.1; // grows each month
      const totalAmount = Math.round(baseAmount * multiplier);

      paymentsToInsert.push({
        memberId: member._id,
        branchId: branch._id,
        name: member.fullName || 'Demo Member',
        detailsId: member._id,
        membership: member.membership?.type || 'basic',
        totalAmount,
        paidAmount: totalAmount,
        paidAt,
      });
    }

    await Payment.insertMany(paymentsToInsert);
    console.log(`Inserted ${paymentsToInsert.length} payments for year ${targetYear}.`);
  } catch (err) {
    console.error('Error while seeding revenue data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();

