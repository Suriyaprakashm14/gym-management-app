const Details = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');
const Member = require('../models/member');
const Attendance = require('../models/attendance');
const Payment = require('../models/payment');


exports.create = async (req, res) => {
  try {
    const { membership, memberId } = req.body;
    let totalAmount = 0;
    let priceDoc = null;

    if (membership) {
      const typeTrimmed = String(membership).trim();
      if (!typeTrimmed) {
        return res.status(400).json({ error: "Membership type is required" });
      }
      const typeRegex = new RegExp(`^\\s*${typeTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      const memberForPrice = await Member.findById(memberId).select('gymId').lean();
      const gymId = memberForPrice?.gymId || null;
      priceDoc = await MembershipPrice.findOne(
        gymId ? { type: { $regex: typeRegex }, gymId } : { type: { $regex: typeRegex } }
      );
      if (!priceDoc) {
        priceDoc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
      }
      if (priceDoc) {
        totalAmount = priceDoc.price;
      } else {
        return res.status(400).json({ error: `Membership type '${typeTrimmed}' not found` });
      }
    } else {
      return res.status(400).json({ error: "Membership type is required" });
    }

    // Fetch member data to get branchId, email and photo
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Fetch last attendance date for this member
    const lastAttendance = await Attendance.findOne({ 
      memberId: memberId, 
      status: 'Present' 
    }).sort({ attendanceDate: -1 });

    // Calculate age from dateOfBirth if provided
    let calculatedAge = null;
    if (req.body.dateOfBirth) {
      const today = new Date();
      let birthDate;
      
      // Handle different date formats
      if (typeof req.body.dateOfBirth === 'string') {
        // Handle DDMMYYYY format (like "29052002")
        if (req.body.dateOfBirth.length === 8 && /^\d{8}$/.test(req.body.dateOfBirth)) {
          const day = req.body.dateOfBirth.substring(0, 2);
          const month = req.body.dateOfBirth.substring(2, 4);
          const year = req.body.dateOfBirth.substring(4, 8);
          birthDate = new Date(`${year}-${month}-${day}`);
        } else {
          // Try to parse as regular date
          birthDate = new Date(req.body.dateOfBirth);
        }
      } else {
        birthDate = new Date(req.body.dateOfBirth);
      }
      
      // Check if date is valid
      if (!isNaN(birthDate.getTime())) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        calculatedAge = age;
      }
    }

    // Plan quantity: number of consecutive subscription periods (default 1)
    const quantity = Math.max(1, parseInt(req.body.planQuantity, 10) || 1);
    const durationDays = priceDoc ? priceDoc.duration : 30;

    let membershipStartDate = null;
    let membershipEndDate = null;
    const subscriptionPeriods = [];
    if (membership && priceDoc) {
      let periodStart = null;
      if (req.body.membershipStartDate) {
        periodStart = new Date(req.body.membershipStartDate);
        if (!Number.isNaN(periodStart.getTime())) {
          periodStart.setHours(0, 0, 0, 0);
        } else {
          periodStart = new Date();
          periodStart.setHours(0, 0, 0, 0);
        }
      } else {
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
      }
      for (let i = 0; i < quantity; i++) {
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + durationDays);
        subscriptionPeriods.push({ startDate: new Date(periodStart), endDate: new Date(periodEnd) });
        if (i === 0) {
          membershipStartDate = new Date(periodStart);
          membershipEndDate = new Date(periodEnd);
        }
        periodStart = new Date(periodEnd);
      }
    }

    const totalAmountForQuantity = priceDoc ? totalAmount * quantity : totalAmount;
    const initialPaidAmount = Number(req.body.paidAmount) || 0;

    const membershipToSave = membership ? String(membership).trim() : req.body.membership;
    const details = new Details({
      ...req.body,
      membership: membershipToSave,
      branchId: member.branchId,
      totalAmount: totalAmountForQuantity,
      paidAmount: initialPaidAmount,
      last_visit: lastAttendance ? lastAttendance.attendanceDate : null,
      age: calculatedAge,
      membership_start_date: membershipStartDate,
      membership_end_date: membershipEndDate,
      planQuantity: quantity,
      subscriptionPeriods: subscriptionPeriods.length ? subscriptionPeriods : undefined,
    });

    await details.save();

    // Every income is revenue: create a Payment record for initial payment so it shows in dashboard/revenue
    if (initialPaidAmount > 0 && member.branchId && membershipToSave) {
      try {
        const payment = new Payment({
          memberId: String(memberId),
          branchId: String(member.branchId),
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
          detailsId: String(details._id),
          membership: membershipToSave,
          totalAmount: priceDoc ? priceDoc.price : totalAmount,
          paidAmount: initialPaidAmount,
        });
        await payment.save();
      } catch (paymentErr) {
        console.error('Failed to create initial payment record for revenue:', paymentErr);
        // Don't fail the whole request; details are already saved
      }
    }

    if (priceDoc && membershipStartDate && membershipEndDate) {
      await Member.findByIdAndUpdate(memberId, {
        'membership.type': membershipToSave,
        'membership.startDate': membershipStartDate,
        'membership.endDate': membershipEndDate,
        'membership.isActive': true,
        status: 'active'
      });
    }

    res.status(201).json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

async function findMembershipPriceByType(type, gymId = null) {
  const typeTrimmed = (type || '').trim();
  if (!typeTrimmed) return null;
  const typeRegex = new RegExp(`^\\s*${typeTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  let doc = gymId
    ? await MembershipPrice.findOne({ type: { $regex: typeRegex }, gymId })
    : null;
  if (!doc) doc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
  return doc;
}

// Get all personal details
exports.getAll = async (req, res) => {
  try {
    const details = await Details.find();
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get one personal details by ID
exports.getOne = async (req, res) => {
  try {
    const details = await Details.findById(req.params.id);
    if (!details) return res.status(404).json({ error: 'Details not found' });
    
    // Fetch latest attendance to update last_visit
    const lastAttendance = await Attendance.findOne({ 
      memberId: details.memberId, 
      status: 'Present' 
    }).sort({ attendanceDate: -1 });
    
    // Update last_visit if there's newer attendance data
    if (lastAttendance && (!details.last_visit || lastAttendance.attendanceDate > details.last_visit)) {
      details.last_visit = lastAttendance.attendanceDate;
      await details.save();
    }
    
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get personal details by member ID
exports.getByMemberId = async (req, res) => {
  try {
    const { memberId } = req.params;
    const details = await Details.findOne({ memberId });
    if (!details) return res.status(404).json({ error: 'Personal details not found for this member' });
    
    // Fetch latest attendance to update last_visit
    const lastAttendance = await Attendance.findOne({ 
      memberId: memberId, 
      status: 'Present' 
    }).sort({ attendanceDate: -1 });
    
    // Update last_visit if there's newer attendance data
    if (lastAttendance && (!details.last_visit || lastAttendance.attendanceDate > details.last_visit)) {
      details.last_visit = lastAttendance.attendanceDate;
      await details.save();
    }
    
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update personal details, update totalAmount if membership changes
exports.update = async (req, res) => {
  try {
    const { membership, dateOfBirth } = req.body;
    
    // Calculate age if dateOfBirth is being updated
    if (dateOfBirth) {
      const today = new Date();
      let birthDate;
      
      // Handle different date formats
      if (typeof dateOfBirth === 'string') {
        // Handle DDMMYYYY format (like "29052002")
        if (dateOfBirth.length === 8 && /^\d{8}$/.test(dateOfBirth)) {
          const day = dateOfBirth.substring(0, 2);
          const month = dateOfBirth.substring(2, 4);
          const year = dateOfBirth.substring(4, 8);
          birthDate = new Date(`${year}-${month}-${day}`);
        } else {
          // Try to parse as regular date
          birthDate = new Date(dateOfBirth);
        }
      } else {
        birthDate = new Date(dateOfBirth);
      }
      
      // Check if date is valid
      if (!isNaN(birthDate.getTime())) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        req.body.age = age;
      }
    }
    
    // Calculate membership dates if membership is being updated
    if (membership != null && String(membership).trim() !== '') {
      const membershipTrimmed = String(membership).trim();
      req.body.membership = membershipTrimmed;
      const priceDoc = await findMembershipPriceByType(membershipTrimmed);
      if (priceDoc) {
        req.body.totalAmount = priceDoc.price;

        // Calculate new membership dates
        const membershipStartDate = new Date(); // Today's date
        const membershipEndDate = new Date();
        membershipEndDate.setDate(membershipStartDate.getDate() + priceDoc.duration); // Add duration in days

        req.body.membership_start_date = membershipStartDate;
        req.body.membership_end_date = membershipEndDate;
      } else {
        return res.status(400).json({ error: `Membership type '${membershipTrimmed}' not found` });
      }
    }
    const details = await Details.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!details) return res.status(404).json({ error: 'Details not found' });
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update personal details by member ID
exports.updateByMemberId = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { membership, dateOfBirth } = req.body;
    
    // Calculate age if dateOfBirth is being updated
    if (dateOfBirth) {
      const today = new Date();
      let birthDate;
      
      // Handle different date formats
      if (typeof dateOfBirth === 'string') {
        // Handle DDMMYYYY format (like "29052002")
        if (dateOfBirth.length === 8 && /^\d{8}$/.test(dateOfBirth)) {
          const day = dateOfBirth.substring(0, 2);
          const month = dateOfBirth.substring(2, 4);
          const year = dateOfBirth.substring(4, 8);
          birthDate = new Date(`${year}-${month}-${day}`);
        } else {
          // Try to parse as regular date
          birthDate = new Date(dateOfBirth);
        }
      } else {
        birthDate = new Date(dateOfBirth);
      }
      
      // Check if date is valid
      if (!isNaN(birthDate.getTime())) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        req.body.age = age;
      }
    }
    
    // Calculate membership dates if membership is being updated
    if (membership != null && String(membership).trim() !== '') {
      const membershipTrimmed = String(membership).trim();
      req.body.membership = membershipTrimmed;
      const memberForGym = await Member.findById(memberId).select('gymId').lean();
      const gymId = memberForGym?.gymId || null;
      const priceDoc = await findMembershipPriceByType(membershipTrimmed, gymId);
      if (priceDoc) {
        req.body.totalAmount = priceDoc.price;

        // Calculate new membership dates
        const membershipStartDate = new Date(); // Today's date
        const membershipEndDate = new Date();
        membershipEndDate.setDate(membershipStartDate.getDate() + priceDoc.duration); // Add duration in days

        req.body.membership_start_date = membershipStartDate;
        req.body.membership_end_date = membershipEndDate;
      } else {
        return res.status(400).json({ error: `Membership type '${membershipTrimmed}' not found` });
      }
    }

    const details = await Details.findOneAndUpdate({ memberId }, req.body, { new: true });
    if (!details) return res.status(404).json({ error: 'Personal details not found for this member' });
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete personal details
exports.remove = async (req, res) => {
  try {
    const details = await Details.findByIdAndDelete(req.params.id);
    if (!details) return res.status(404).json({ error: 'Details not found' });
    res.json({ message: 'Personal details deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
