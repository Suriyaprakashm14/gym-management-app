const MemberBiometricAttendance = require('../models/MemberBiometricAttendance');
const { consumeAttendanceToken } = require('./webauthnController');

function ymdLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isSameLocalDay(a, b) {
  return ymdLocal(a) === ymdLocal(b);
}

async function markAttendance(req, res) {
  try {
    const { attendanceToken } = req.body || {};
    if (!attendanceToken) {
      return res.status(400).json({ success: false, message: 'attendanceToken is required' });
    }

    const tokenEntry = consumeAttendanceToken(attendanceToken);
    if (!tokenEntry) {
      return res.status(401).json({ success: false, message: 'Invalid or expired attendance token' });
    }

    const memberId = tokenEntry.memberId;
    const now = new Date();

    const record =
      (await MemberBiometricAttendance.findOne({ memberId })) ||
      (await MemberBiometricAttendance.create({
        memberId,
        subscriptionStart: null,
        subscriptionEnd: null,
        attendance: [],
      }));

    const start = record.subscriptionStart ? new Date(record.subscriptionStart) : null;
    const end = record.subscriptionEnd ? new Date(record.subscriptionEnd) : null;

    if (start && now < start) {
      return res.json({ success: true, status: 'NOT_STARTED' });
    }

    if (end && now > end) {
      return res.json({ success: true, status: 'EXPIRED' });
    }

    const alreadyMarked = Array.isArray(record.attendance)
      ? record.attendance.some((ts) => isSameLocalDay(new Date(ts), now))
      : false;

    if (!alreadyMarked) {
      record.attendance.push(now);
      await record.save();
    }

    return res.json({ success: true, status: 'ATTENDANCE_MARKED', deduped: alreadyMarked });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[biometricAttendance.markAttendance] error', err);
    return res.status(500).json({ success: false, message: 'Attendance marking failed' });
  }
}

module.exports = {
  markAttendance,
};

