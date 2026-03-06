/**
 * Seed script: creates RBAC users for admin, gym owner, and manager:
 * - admin@gympro.com / Admin123  (role: admin)
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

async function ensureGymAndBranch(adminId) {
  let gym = await Gym.findOne().lean();
  if (!gym) {
    console.log('No gym found, creating default seed gym...');
    const gymDoc = new Gym({
      name: 'Seed Gym',
      description: 'Default seeded gym for development',
      contactInfo: {
        email: 'info@gympro.com',
      },
      createdBy: adminId || 'seed-script',
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
      createdBy: adminId || 'seed-script',
    });
    await branchDoc.save();
    branch = branchDoc.toObject();
  }

  return { gymId: gym._id, branchId: branch._id };
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // ADMIN
  let admin = await User.findOne({ email: 'admin@gympro.com' });
  if (!admin) {
    console.log('Creating admin user admin@gympro.com ...');
    admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gympro.com',
      password: 'Admin123',
      role: 'admin',
      status: 'active',
      isActive: true,
    });
    await admin.save();
  } else {
    console.log('Admin user already exists:', admin.email);
  }

  const { gymId, branchId } = await ensureGymAndBranch(admin._id);
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
      createdBy: admin._id,
    });
    await owner.save();
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
      createdBy: admin._id,
    });
    await manager.save();
  } else {
    console.log('Manager user already exists:', manager.email);
  }

  console.log('Seed users created successfully.');
  console.log('  admin@gympro.com / Admin123');
  console.log('  owner@gympro.com / Owner123');
  console.log('  manager@gympro.com / Manager123');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed users failed:', err);
  process.exit(1);
});
