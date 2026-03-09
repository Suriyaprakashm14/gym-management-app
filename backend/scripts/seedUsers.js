/**
 * Seed script: creates RBAC users for gym owner and manager:
 * - owner@gympro.com / Owner123  (role: gym_owner)
 * - manager@gympro.com / Manager123 (role: manager)
 *
 * Run from backend folder:
 *   npm run seed:users
 *
 * Requires:
 *   - MONGODB_URI in .env (optional; defaults to local gym-management DB)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';

const User = require('../models/user');
const Gym = require('../models/gym');
const Branch = require('../models/branch');

async function ensureGymAndBranch(creatorId) {
  let gym = await Gym.findOne().lean();
  if (!gym) {
    console.log('No gym found, creating default seed gym...');
    const gymDoc = new Gym({
      name: 'Seed Gym',
      description: 'Default seeded gym for development',
      contactInfo: {
        email: 'info@gympro.com',
      },
      createdBy: creatorId || 'seed-script',
    });
    await gymDoc.save();
    gym = gymDoc.toObject();
  }

  let branch = await Branch.findOne({ gymId: gym._id }).lean();
  if (!branch) {
    console.log('No branch found for seed gym, creating default branch...');
    const branchDoc = new Branch({
      name: 'Main Branch',
      gymId: gym._id,
      address: {
        city: 'Seed City',
      },
      contactInfo: {
        phone: '0000000000',
        email: 'main@gympro.com',
      },
      createdBy: creatorId || 'seed-script',
    });
    await branchDoc.save();
    branch = branchDoc.toObject();
  }

  return { gymId: gym._id, branchId: branch._id };
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const { gymId, branchId } = await ensureGymAndBranch('seed-script');
  console.log('Using gymId:', gymId, 'branchId:', branchId);

  // GYM OWNER
  let owner = await User.findOne({ email: 'owner@gympro.com' });
  if (!owner) {
    console.log('Creating gym owner user owner@gympro.com ...');
    owner = new User({
      firstName: 'Gym',
      lastName: 'Owner',
      email: 'owner@gympro.com',
      password: 'Owner123',
      role: 'gym_owner',
      gymId,
      status: 'active',
      isActive: true,
      createdBy: 'seed-script',
    });
    await owner.save();
    // Attach branch to owner's branches for branch ownership
    await User.findByIdAndUpdate(owner._id, { $push: { branches: branchId } });
  } else {
    console.log('Gym owner user already exists:', owner.email);
  }

  // MANAGER
  let manager = await User.findOne({ email: 'manager@gympro.com' });
  if (!manager) {
    console.log('Creating manager user manager@gympro.com ...');
    manager = new User({
      firstName: 'Branch',
      lastName: 'Manager',
      email: 'manager@gympro.com',
      password: 'Manager123',
      role: 'manager',
      gymId,
      branchId,
      status: 'active',
      isActive: true,
      createdBy: owner._id,
    });
    await manager.save();
  } else {
    console.log('Manager user already exists:', manager.email);
  }

  console.log('Seed users created successfully.');
  console.log('  owner@gympro.com / Owner123');
  console.log('  manager@gympro.com / Manager123');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed users failed:', err);
  process.exit(1);
});
