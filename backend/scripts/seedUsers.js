/**
 * Seed script: inserts admin, owner, and manager credentials into the database.
 * Run from backend folder: node scripts/seedUsers.js
 *
 * Credentials:
 *   admin@gympro.com / Admin123
 *   owner@gympro.com / Owner123
 *   manager@gympro.com / Manager123
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');
const Gym = require('../models/gym');
const Branch = require('../models/branch');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';

const SEED_USERS = [
  { email: 'admin@gympro.com', password: 'Admin123', firstName: 'Admin', lastName: 'User', role: 'admin' },
  { email: 'owner@gympro.com', password: 'Owner123', firstName: 'Owner', lastName: 'User', role: 'gym_owner' },
  { email: 'manager@gympro.com', password: 'Manager123', firstName: 'Manager', lastName: 'User', role: 'manager' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1) Create admin first (needed as createdBy for gym/branch)
    let admin = await User.findOne({ email: 'admin@gympro.com' });
    if (!admin) {
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@gympro.com',
        password: 'Admin123',
        role: 'admin',
        status: 'active',
        isActive: true,
        createdBy: 'seed-script',
      });
      console.log('Created user: admin@gympro.com (admin)');
    } else {
      console.log('User already exists, skipping: admin@gympro.com');
    }

    // 2) Ensure demo gym and branch exist (for owner and manager)
    let gym = await Gym.findOne({ name: 'GymPro Demo Gym' });
    if (!gym) {
      gym = await Gym.create({
        name: 'GymPro Demo Gym',
        description: 'Demo gym for seed users',
        status: 'active',
        isFrozen: false,
        createdBy: admin._id,
      });
      console.log('Created demo gym:', gym._id);
    }

    let branch = await Branch.findOne({ gymId: gym._id });
    if (!branch) {
      branch = await Branch.create({
        name: 'Main Branch',
        gymId: gym._id,
        status: 'active',
        isActive: true,
        createdBy: admin._id,
      });
      console.log('Created demo branch:', branch._id);
    }

    // 3) Create owner and manager
    for (const u of SEED_USERS) {
      if (u.role === 'admin') continue; // already done
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (existing) {
        console.log('User already exists, skipping:', u.email);
        continue;
      }

      const doc = {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email.toLowerCase(),
        password: u.password,
        role: u.role,
        status: 'active',
        isActive: true,
        createdBy: admin._id,
      };
      if (u.role === 'gym_owner') {
        doc.gymId = gym._id;
      }
      if (u.role === 'manager') {
        doc.gymId = gym._id;
        doc.branchId = branch._id;
      }

      await User.create(doc);
      console.log('Created user:', u.email, '(', u.role, ')');
    }

    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
