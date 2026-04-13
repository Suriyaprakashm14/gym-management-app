/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');
const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');

async function run() {
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  const detailsWithPeriods = await Details.find({
    subscriptionPeriods: { $exists: true, $type: 'array', $ne: [] },
  }).lean();

  let migrated = 0;
  for (const details of detailsWithPeriods) {
    const periods = (details.subscriptionPeriods || []).filter((p) => p?.startDate && p?.endDate);
    if (periods.length === 0) continue;
    periods.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const startDate = new Date(periods[0].startDate);
    const endDate = new Date(periods[periods.length - 1].endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;

    await Member.findByIdAndUpdate(details.memberId, {
      'membership.startDate': startDate,
      'membership.endDate': endDate,
    });
    migrated += 1;
  }

  const expiryResult = await Member.checkAndUpdateExpiredMemberships();

  console.log({ migrated, expiryResult });
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Migration failed:', err);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exit(1);
});
