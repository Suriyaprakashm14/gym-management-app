const Details = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');
const Member = require('../models/member');
const Attendance = require('../models/attendance');


exports.create = async (req, res) => {
  try {
    const { membership, memberId } = req.body;
    let totalAmount = 0;
    let priceDoc = null;

    if (membership) {
      // Normalize type: use your price table, which uses the exact strings ("monthly", "annual", "pay-as-you-go")
      priceDoc = await MembershipPrice.findOne({
        type: membership.trim().toLowerCase()
      });
      if (priceDoc) {
        totalAmount = priceDoc.price;
      } else {
        return res.status(400).json({ error: `Membership type '${membership}' not found` });
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

    // Calculate membership dates
    let membershipStartDate = null;
    let membershipEndDate = null;
    if (membership && priceDoc) {
      membershipStartDate = new Date(); // Today's date
      membershipEndDate = new Date();
      membershipEndDate.setDate(membershipStartDate.getDate() + priceDoc.duration); // Add duration in days
    }

    const details = new Details({
      ...req.body,
      branchId: member.branchId, // Use branchId from member data
      totalAmount, // Always set here from DB!
      paidAmount: req.body.paidAmount || 0,
      last_visit: lastAttendance ? lastAttendance.attendanceDate : null,
      age: calculatedAge,
      membership_start_date: membershipStartDate,
      membership_end_date: membershipEndDate,
    });

    await details.save();

    // Update member's membership information
    if (priceDoc) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + priceDoc.duration); // Add duration in days

      await Member.findByIdAndUpdate(memberId, {
        'membership.type': membership,
        'membership.startDate': startDate,
        'membership.endDate': endDate,
        'membership.isActive': true,
        status: 'active'
      });
    }

    res.status(201).json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Only update totalAmount if membership is updated in request
    if (req.body.membership) {
      const priceDoc = await MembershipPrice.findOne({
        type: req.body.membership.trim().toLowerCase()
      });
      if (priceDoc) {
        req.body.totalAmount = priceDoc.price;
      } else {
        return res.status(400).json({ error: `Membership type '${req.body.membership}' not found` });
      }
    }

    const details = await Details.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!details) return res.status(404).json({ error: 'Details not found' });
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



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
    if (membership) {
      const priceDoc = await MembershipPrice.findOne({ type: membership.toLowerCase() });
      if (priceDoc) {
        req.body.totalAmount = priceDoc.price;
        
        // Calculate new membership dates
        const membershipStartDate = new Date(); // Today's date
        const membershipEndDate = new Date();
        membershipEndDate.setDate(membershipStartDate.getDate() + priceDoc.duration); // Add duration in days
        
        req.body.membership_start_date = membershipStartDate;
        req.body.membership_end_date = membershipEndDate;
      } else {
        return res.status(400).json({ error: `Membership type '${membership}' not found` });
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
    if (membership) {
      const priceDoc = await MembershipPrice.findOne({ type: membership.toLowerCase() });
      if (priceDoc) {
        req.body.totalAmount = priceDoc.price;
        
        // Calculate new membership dates
        const membershipStartDate = new Date(); // Today's date
        const membershipEndDate = new Date();
        membershipEndDate.setDate(membershipStartDate.getDate() + priceDoc.duration); // Add duration in days
        
        req.body.membership_start_date = membershipStartDate;
        req.body.membership_end_date = membershipEndDate;
      } else {
        return res.status(400).json({ error: `Membership type '${membership}' not found` });
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
