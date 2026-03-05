const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const Payment = require('../models/payment');
const Attendance = require('../models/attendance');

/**
 * Build an enriched view model for members including:
 * - core member fields
 * - personal details (phone, age, membership, last_visit, balances)
 * - billing summary (status, last payment)
 * - last visit (from personal details or attendance)
 */
async function buildMemberViewModels(members) {
  if (!Array.isArray(members) || members.length === 0) {
    return [];
  }

  const memberIds = members.map((m) => m._id);

  // Fetch personal details for all members in one go
  const detailsList = await Details.find({ memberId: { $in: memberIds } }).lean();
  const detailsByMemberId = new Map(detailsList.map((d) => [d.memberId, d]));

  // Fetch payments and compute per-member billing summary
  const paymentsAgg = await Payment.aggregate([
    { $match: { memberId: { $in: memberIds } } },
    { $sort: { paidAt: -1 } },
    {
      $group: {
        _id: '$memberId',
        lastPayment: { $first: '$$ROOT' },
        totalPaid: { $sum: '$paidAmount' },
        totalAmount: { $max: '$totalAmount' },
      },
    },
  ]);
  const paymentsByMemberId = new Map(
    paymentsAgg.map((p) => [
      p._id,
      {
        lastPayment: p.lastPayment,
        totalPaid: p.totalPaid || 0,
        totalAmount: p.totalAmount || 0,
      },
    ])
  );

  // Fetch latest attendance per member (for last visit fallback)
  const attendanceAgg = await Attendance.aggregate([
    { $match: { memberId: { $in: memberIds }, status: 'Present' } },
    { $sort: { attendanceDate: -1 } },
    {
      $group: {
        _id: '$memberId',
        lastAttendance: { $first: '$$ROOT' },
      },
    },
  ]);
  const attendanceByMemberId = new Map(
    attendanceAgg.map((a) => [a._id, a.lastAttendance])
  );

  const now = new Date();

  return members.map((memberDoc) => {
    const m = memberDoc.toObject ? memberDoc.toObject() : memberDoc;
    const details = detailsByMemberId.get(m._id);
    const paymentInfo = paymentsByMemberId.get(m._id);
    const lastAttendance = attendanceByMemberId.get(m._id);

    // Phone & age come primarily from personal details; fallback to member.profile
    const phone =
      details?.phoneNumber ||
      m.profile?.phone ||
      undefined;
    const age =
      typeof details?.age === 'number'
        ? details.age
        : typeof m.profile?.age === 'number'
        ? m.profile.age
        : null;

    // Membership info
    const membershipType =
      details?.membership ||
      m.membership?.type ||
      null;

    // Last visit: prefer personal details.last_visit, then latest attendance
    const lastVisitRaw =
      details?.last_visit ||
      lastAttendance?.attendanceDate ||
      null;
    const lastVisit =
      lastVisitRaw instanceof Date
        ? lastVisitRaw.toISOString()
        : lastVisitRaw || null;

    // Billing summary
    const totalAmount =
      (typeof details?.totalAmount === 'number' ? details.totalAmount : null) ??
      (paymentInfo?.totalAmount ?? 0);
    const totalPaid =
      (typeof details?.paidAmount === 'number' ? details.paidAmount : null) ??
      (paymentInfo?.totalPaid ?? 0);

    let billingStatus = null;
    if (totalAmount > 0) {
      if (totalPaid >= totalAmount) {
        billingStatus = 'paid';
      } else {
        const membershipEnd = details?.membership_end_date || m.membership?.endDate;
        if (membershipEnd && new Date(membershipEnd) < now) {
          billingStatus = 'overdue';
        } else {
          billingStatus = 'pending';
        }
      }
    }

    const lastPayment = paymentInfo?.lastPayment;

    return {
      // Preserve original member document
      ...m,
      // Normalized, frontend-friendly fields
      phone,
      age,
      membership: membershipType,
      lastVisit,
      billingStatus,
      billingAmount: totalAmount,
      billingDate: lastPayment?.paidAt || null,
    };
  });
}

module.exports = {
  buildMemberViewModels,
};

