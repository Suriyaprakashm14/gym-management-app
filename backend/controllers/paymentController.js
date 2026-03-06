const Payment = require('../models/payment');
const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');

exports.create = async (req, res) => {
  try {
    const { memberId, paidAmount } = req.body;
    const branchId = req.params.branchId; // Get branchId from URL parameters

    if (!branchId) {
      return res.status(400).json({ error: 'branchId is required in URL' });
    }

    if (req.user.role === 'manager' && branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Cannot create payment outside your branch' });
    }

    const member = await Member.findById(memberId).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (member.branchId.toString() !== branchId.toString()) {
      return res.status(400).json({ error: 'Member does not belong to the given branch' });
    }

    const details = await Details.findOne({ memberId });
    if (!details) return res.status(404).json({ error: 'Member personal details not found' });

    const { membership } = details;
    if (!membership) return res.status(400).json({ error: 'Membership type not set in personal details' });

    const typeTrimmed = membership.trim();
    const typeRegex = new RegExp(`^${typeTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    let priceDoc = member.gymId
      ? await MembershipPrice.findOne({ type: { $regex: typeRegex }, gymId: member.gymId })
      : null;
    if (!priceDoc) priceDoc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
    if (!priceDoc) return res.status(400).json({ error: `Membership type '${membership}' not found in price table` });

    const totalAmount = priceDoc.price;

    // Enforce that the payment does not exceed remaining due
    const currentPaid = details.paidAmount || 0;
    const totalDue = details.totalAmount || totalAmount;
    const remaining = Math.max(0, totalDue - currentPaid);

    if (paidAmount > remaining) {
      return res.status(400).json({
        error: 'Payment exceeds remaining due amount',
        message: `Maximum payable amount is ₹${remaining}`,
      });
    }

    const payment = new Payment({
      memberId,
      branchId,
      name: `${member.firstName} ${member.lastName}`,
      detailsId: details._id,
      membership,
      totalAmount,
      paidAmount,
    });

    await payment.save();

    // Update paidAmount in personal details
    details.paidAmount = (details.paidAmount || 0) + paidAmount;
    await details.save();

    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'manager') {
      filter.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    const payments = await Payment.find(filter).select('memberId name paidAmount paidAt');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (req.user.role === 'manager' && payment.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this payment' });
    }

    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (req.user.role === 'manager') {
      return res.status(403).json({ error: 'Managers not authorized to update payments' });
    }

    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (req.user.role === 'manager') {
      return res.status(403).json({ error: 'Managers not authorized to delete payments' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getMemberPaymentSummary = async (req, res) => {
  try {
    const memberId = req.params.memberId;

    // Check member exists and authorize for branch
    const member = await Member.findById(memberId).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const details = await Details.findOne({ memberId }).lean();
    if (!details) return res.status(404).json({ error: 'Member personal details not found' });

    const payments = await Payment.find({ memberId }).sort({ paidAt: -1 }).lean();

    const totalDue = payments.length > 0 ? Math.max(...payments.map(p => p.totalAmount)) : 0;
    const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const lastPaidAt = payments.length > 0 ? payments[0].paidAt : null;
    const remainingAmount = Math.max(totalDue - totalPaid, 0);

    res.json({
      memberId,
      name: `${member.firstName} ${member.lastName}`,
      detailsId: details._id,
      membership: details.membership || null,
      totalAmount: totalDue,
      paidAmount: totalPaid,
      paidAt: lastPaidAt,
      remainingAmount,
    });
  } catch (error) {
    console.error('Error getting payment summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Gym Owner Analytics - Total Revenue and Pending Payments for All Branches
// Branch Manager Analytics - Branch Revenue and Pending Payments
exports.getGymOwnerAnalytics = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'manager', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner, manager, and admin can view analytics." });
    }

    const { year, month, startDate: startQuery, endDate: endQuery } = req.query;
    let startDate, endDate;

    if (startQuery && endQuery) {
      startDate = new Date(startQuery);
      endDate = new Date(endQuery);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid startDate or endDate' });
      }
      endDate.setHours(23, 59, 59, 999);
    } else if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const isGymLevel = req.user.role === 'gym_owner' || (req.user.role === 'admin' && req.user.gymId);
    let branches, branchIds, members, memberIds, personalDetails, payments;

    if (isGymLevel && req.user.gymId) {
      // Gym Owner: Get all branches for this gym
      const Branch = require('../models/branch');
      branches = await Branch.find({ gymId: req.user.gymId });
      branchIds = branches.map(branch => branch._id);

      // Get all payments for this gym's branches
      payments = await Payment.find({
        branchId: { $in: branchIds },
        paidAt: { $gte: startDate, $lte: endDate }
      });

      // Get all members with personal details to calculate pending amounts
      members = await Member.find({
        gymId: req.user.gymId,
        role: 'member'
      });

      memberIds = members.map(member => member._id);
      personalDetails = await Details.find({ memberId: { $in: memberIds } });

    } else if (req.user.role === 'manager' || req.user.role === 'admin') {
      if (!req.user.branchId) {
        return res.status(400).json({ error: 'branchId required for manager/admin when gymId is not set.' });
      }
      const Branch = require('../models/branch');
      const branch = await Branch.findById(req.user.branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      branches = [branch];
      branchIds = [req.user.branchId];

      // Get payments for this branch only
      payments = await Payment.find({
        branchId: req.user.branchId,
        paidAt: { $gte: startDate, $lte: endDate }
      });

      // Get members for this branch only
      members = await Member.find({ 
        branchId: req.user.branchId,
        role: 'member'
      });
      
      memberIds = members.map(member => member._id);
      personalDetails = await Details.find({ memberId: { $in: memberIds } });
    }

    // Calculate totals
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalPendingAmount = personalDetails.reduce((sum, detail) => {
      const pending = Math.max(0, detail.totalAmount - detail.paidAmount);
      return sum + pending;
    }, 0);

    // Monthly breakdown
    const monthlyData = {};
    payments.forEach(payment => {
      const paymentMonth = payment.paidAt.getMonth() + 1;
      const paymentYear = payment.paidAt.getFullYear();
      const key = `${paymentYear}-${paymentMonth.toString().padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { totalPaid: 0, paymentCount: 0 };
      }
      monthlyData[key].totalPaid += payment.paidAmount;
      monthlyData[key].paymentCount += 1;
    });

    // Prepare response based on role
    const response = {
      period: {
        startDate,
        endDate,
        year: year || new Date().getFullYear(),
        month: month || new Date().getMonth() + 1
      },
      summary: {
        totalPaidAmount,
        totalPendingAmount,
        totalMembers: members.length,
        totalPayments: payments.length,
        averagePayment: payments.length > 0 ? totalPaidAmount / payments.length : 0
      },
      monthlyBreakdown: monthlyData
    };

    if (isGymLevel && branches && branches.length > 0) {
      response.branches = branches.map(branch => ({
        branchId: branch._id,
        branchName: branch.name,
        totalPaid: payments
          .filter(p => p.branchId.toString() === branch._id.toString())
          .reduce((sum, p) => sum + p.paidAmount, 0),
        paymentCount: payments.filter(p => p.branchId.toString() === branch._id.toString()).length
      }));
    } else if (req.user.role === 'manager' || req.user.role === 'admin') {
      response.branch = {
        branchId: branches[0]._id,
        branchName: branches[0].name,
        location: branches[0].location,
        totalPaid: totalPaidAmount,
        paymentCount: payments.length
      };
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Branch Manager Analytics - Branch Revenue and Pending Payments
exports.getBranchManagerAnalytics = async (req, res) => {
  try {
    const allowedRoles = ['manager', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only manager or admin can view branch analytics." });
    }

    const targetBranchId =
      req.user.role === 'admin'
        ? (req.query.branchId || req.user.branchId)
        : req.user.branchId;

    if (!targetBranchId) {
      return res.status(400).json({
        error: 'branchId is required for admin branch analytics.'
      });
    }

    const { year, month, startDate: startQuery, endDate: endQuery } = req.query;
    let startDate, endDate;

    if (startQuery && endQuery) {
      startDate = new Date(startQuery);
      endDate = new Date(endQuery);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid startDate or endDate' });
      }
      endDate.setHours(23, 59, 59, 999);
    } else if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get payments for this branch
    const payments = await Payment.find({
      branchId: targetBranchId,
      paidAt: { $gte: startDate, $lte: endDate }
    });

    // Get members for this branch
    const members = await Member.find({ 
      branchId: targetBranchId,
      role: 'member'
    });
    
    const memberIds = members.map(member => member._id);
    const personalDetails = await Details.find({ memberId: { $in: memberIds } });

    // Calculate totals
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalPendingAmount = personalDetails.reduce((sum, detail) => {
      const pending = Math.max(0, detail.totalAmount - detail.paidAmount);
      return sum + pending;
    }, 0);

    // Monthly breakdown
    const monthlyData = {};
    payments.forEach(payment => {
      const paymentMonth = payment.paidAt.getMonth() + 1;
      const paymentYear = payment.paidAt.getFullYear();
      const key = `${paymentYear}-${paymentMonth.toString().padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { totalPaid: 0, paymentCount: 0 };
      }
      monthlyData[key].totalPaid += payment.paidAmount;
      monthlyData[key].paymentCount += 1;
    });

    // Get branch info
    const Branch = require('../models/branch');
    const branch = await Branch.findById(targetBranchId);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found for analytics.' });
    }

    res.json({
      branch: {
        branchId: branch._id,
        branchName: branch.name,
        location: branch.location
      },
      period: {
        startDate,
        endDate,
        year: year || new Date().getFullYear(),
        month: month || new Date().getMonth() + 1
      },
      summary: {
        totalPaidAmount,
        totalPendingAmount,
        totalMembers: members.length,
        totalPayments: payments.length,
        averagePayment: payments.length > 0 ? totalPaidAmount / payments.length : 0
      },
      monthlyBreakdown: monthlyData,
      topMembers: personalDetails
        .map(detail => ({
          memberId: detail.memberId,
          totalPaid: detail.paidAmount,
          pendingAmount: Math.max(0, detail.totalAmount - detail.paidAmount),
          membership: detail.membership
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Gym Owner Overdue Analytics - All Branches
exports.getGymOwnerOverdueAnalytics = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner can view gym overdue analytics." });
    }

    // Get all branches for this gym
    const Branch = require('../models/branch');
    const branches = await Branch.find({ gymId: req.user.gymId });
    const branchIds = branches.map(branch => branch._id);

    // Get all members with personal details to calculate overdue amounts
    const members = await Member.find({ 
      gymId: req.user.gymId,
      role: 'member'
    });
    
    const memberIds = members.map(member => member._id);
    const personalDetails = await Details.find({ memberId: { $in: memberIds } });

    // Calculate overdue amounts by branch
    const branchOverdueData = {};
    
    branches.forEach(branch => {
      const branchMembers = members.filter(member => member.branchId.toString() === branch._id.toString());
      const branchMemberIds = branchMembers.map(member => member._id.toString());
      const branchPersonalDetails = personalDetails.filter(detail => 
        branchMemberIds.includes(detail.memberId.toString())
      );

      const totalOverdue = branchPersonalDetails.reduce((sum, detail) => {
        const overdue = Math.max(0, detail.totalAmount - detail.paidAmount);
        return sum + overdue;
      }, 0);

      const overdueMembers = branchPersonalDetails
        .filter(detail => detail.totalAmount > detail.paidAmount)
        .map(detail => {
          const member = branchMembers.find(m => m._id.toString() === detail.memberId.toString());
          return {
            memberId: detail.memberId,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            totalAmount: detail.totalAmount,
            paidAmount: detail.paidAmount,
            overdueAmount: detail.totalAmount - detail.paidAmount,
            membership: detail.membership
          };
        })
        .sort((a, b) => b.overdueAmount - a.overdueAmount);

      branchOverdueData[branch._id.toString()] = {
        branchId: branch._id,
        branchName: branch.name,
        location: branch.location,
        totalMembers: branchMembers.length,
        overdueMembers: overdueMembers.length,
        totalOverdueAmount: totalOverdue,
        averageOverdue: overdueMembers.length > 0 ? totalOverdue / overdueMembers.length : 0,
        overdueMembersList: overdueMembers
      };
    });

    // Calculate gym-wide totals
    const totalOverdueAmount = Object.values(branchOverdueData).reduce((sum, branch) => sum + branch.totalOverdueAmount, 0);
    const totalOverdueMembers = Object.values(branchOverdueData).reduce((sum, branch) => sum + branch.overdueMembers, 0);
    const totalMembers = Object.values(branchOverdueData).reduce((sum, branch) => sum + branch.totalMembers, 0);

    // Top overdue members across all branches
    const allOverdueMembers = Object.values(branchOverdueData)
      .flatMap(branch => branch.overdueMembersList)
      .sort((a, b) => b.overdueAmount - a.overdueAmount)
      .slice(0, 20);

    res.json({
      gymSummary: {
        totalMembers,
        totalOverdueMembers,
        totalOverdueAmount,
        averageOverdue: totalOverdueMembers > 0 ? totalOverdueAmount / totalOverdueMembers : 0,
        overduePercentage: totalMembers > 0 ? (totalOverdueMembers / totalMembers) * 100 : 0
      },
      branches: Object.values(branchOverdueData),
      topOverdueMembers: allOverdueMembers,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Branch Manager Overdue Analytics - Own Branch Only
exports.getBranchManagerOverdueAnalytics = async (req, res) => {
  try {
    const allowedRoles = ['manager', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only manager or admin can view branch overdue analytics." });
    }

    const targetBranchId =
      req.user.role === 'admin'
        ? (req.query.branchId || req.user.branchId)
        : req.user.branchId;

    if (!targetBranchId) {
      return res.status(400).json({
        error: 'branchId is required for admin branch overdue analytics.'
      });
    }

    // Get members for this branch only
    const members = await Member.find({ 
      branchId: targetBranchId,
      role: 'member'
    });
    
    const memberIds = members.map(member => member._id);
    const personalDetails = await Details.find({ memberId: { $in: memberIds } });

    // Calculate overdue amounts
    const totalOverdue = personalDetails.reduce((sum, detail) => {
      const overdue = Math.max(0, detail.totalAmount - detail.paidAmount);
      return sum + overdue;
    }, 0);

    const overdueMembers = personalDetails
      .filter(detail => detail.totalAmount > detail.paidAmount)
      .map(detail => {
        const member = members.find(m => m._id.toString() === detail.memberId.toString());
        return {
          memberId: detail.memberId,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
          totalAmount: detail.totalAmount,
          paidAmount: detail.paidAmount,
          overdueAmount: detail.totalAmount - detail.paidAmount,
          membership: detail.membership,
          email: member ? member.email : null,
          phoneNumber: detail.phoneNumber
        };
      })
      .sort((a, b) => b.overdueAmount - a.overdueAmount);

    // Get branch info
    const Branch = require('../models/branch');
    const branch = await Branch.findById(targetBranchId);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found for overdue analytics.' });
    }

    // Calculate overdue by membership type
    const overdueByMembership = {};
    overdueMembers.forEach(member => {
      const membership = member.membership || 'Unknown';
      if (!overdueByMembership[membership]) {
        overdueByMembership[membership] = {
          membership,
          count: 0,
          totalOverdue: 0
        };
      }
      overdueByMembership[membership].count++;
      overdueByMembership[membership].totalOverdue += member.overdueAmount;
    });

    // Calculate overdue by amount ranges
    const overdueRanges = {
      '0-500': { range: '0-500', count: 0, total: 0 },
      '500-1000': { range: '500-1000', count: 0, total: 0 },
      '1000-2000': { range: '1000-2000', count: 0, total: 0 },
      '2000+': { range: '2000+', count: 0, total: 0 }
    };

    overdueMembers.forEach(member => {
      const amount = member.overdueAmount;
      if (amount <= 500) {
        overdueRanges['0-500'].count++;
        overdueRanges['0-500'].total += amount;
      } else if (amount <= 1000) {
        overdueRanges['500-1000'].count++;
        overdueRanges['500-1000'].total += amount;
      } else if (amount <= 2000) {
        overdueRanges['1000-2000'].count++;
        overdueRanges['1000-2000'].total += amount;
      } else {
        overdueRanges['2000+'].count++;
        overdueRanges['2000+'].total += amount;
      }
    });

    res.json({
      branch: {
        branchId: branch._id,
        branchName: branch.name,
        location: branch.location
      },
      summary: {
        totalMembers: members.length,
        overdueMembers: overdueMembers.length,
        totalOverdueAmount: totalOverdue,
        averageOverdue: overdueMembers.length > 0 ? totalOverdue / overdueMembers.length : 0,
        overduePercentage: members.length > 0 ? (overdueMembers.length / members.length) * 100 : 0
      },
      overdueByMembership: Object.values(overdueByMembership),
      overdueByAmountRange: Object.values(overdueRanges),
      overdueMembers: overdueMembers,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Members with Pending Payments
exports.getMembersWithPendingPayments = async (req, res) => {
  try {
    const { branchId, membership, minAmount, maxAmount, sortBy = 'pendingAmount', sortOrder = 'desc' } = req.query;
    
    // Build query based on user role
    let memberQuery = { role: 'member' };
    let personalDetailsQuery = {};
    
    // Apply branch filter based on user role
    if (req.user.role === 'manager') {
      memberQuery.branchId = req.user.branchId;
    } else if (req.user.role === 'gym_owner') {
      if (branchId) {
        memberQuery.branchId = branchId;
      } else {
        // Get all branches for this gym
        const Branch = require('../models/branch');
        const branches = await Branch.find({ gymId: req.user.gymId });
        const branchIds = branches.map(branch => branch._id);
        memberQuery.branchId = { $in: branchIds };
      }
    } else if (req.user.role === 'admin') {
      if (branchId) {
        memberQuery.branchId = branchId;
      }
    }
    
    // Get members based on query
    const members = await Member.find(memberQuery);
    const memberIds = members.map(member => member._id);
    
    if (memberIds.length === 0) {
      return res.json({
        summary: {
          totalMembers: 0,
          totalPendingAmount: 0,
          averagePending: 0
        },
        filters: {
          branchId: req.user.role === 'manager' ? req.user.branchId : (branchId || 'All Branches'),
          membership: membership || 'All Types',
          minAmount: minAmount || 'No Minimum',
          maxAmount: maxAmount || 'No Maximum'
        },
        pendingByMembership: [],
        pendingByBranch: req.user.role === 'gym_owner' ? [] : undefined,
        members: [],
        generatedAt: new Date().toISOString()
      });
    }
    
    // Build personal details query
    personalDetailsQuery.memberId = { $in: memberIds };
    personalDetailsQuery.totalAmount = { $gt: 0 }; // Only members with total amount > 0
    
    // Apply membership filter
    if (membership) {
      personalDetailsQuery.membership = membership;
    }
    
    // Get personal details with pending payments
    const personalDetails = await Details.find(personalDetailsQuery);
    
    // Filter members with pending payments and apply amount filters
    let pendingMembers = personalDetails
      .filter(detail => detail.totalAmount > detail.paidAmount)
      .map(detail => {
        const member = members.find(m => m._id.toString() === detail.memberId.toString());
        const pendingAmount = detail.totalAmount - detail.paidAmount;
        
        return {
          memberId: detail.memberId,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
          email: member ? member.email : null,
          phoneNumber: detail.phoneNumber,
          membership: detail.membership,
          totalAmount: detail.totalAmount,
          paidAmount: detail.paidAmount,
          pendingAmount: pendingAmount,
          branchId: member ? member.branchId : null,
          branchName: member ? member.branchName : null,
          lastPaymentDate: detail.updatedAt,
          membershipStartDate: detail.membership_start_date,
          membershipEndDate: detail.membership_end_date
        };
      });
    
    // Apply amount filters
    if (minAmount) {
      pendingMembers = pendingMembers.filter(member => member.pendingAmount >= parseFloat(minAmount));
    }
    if (maxAmount) {
      pendingMembers = pendingMembers.filter(member => member.pendingAmount <= parseFloat(maxAmount));
    }
    
    // Sort results
    const sortField = sortBy === 'memberName' ? 'memberName' : 
                     sortBy === 'pendingAmount' ? 'pendingAmount' : 
                     sortBy === 'membership' ? 'membership' : 'pendingAmount';
    
    pendingMembers.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1;
      } else {
        return a[sortField] < b[sortField] ? 1 : -1;
      }
    });
    
    // Calculate totals
    const totalPendingAmount = pendingMembers.reduce((sum, member) => sum + member.pendingAmount, 0);
    
    // Group by membership type
    const pendingByMembership = {};
    pendingMembers.forEach(member => {
      const membership = member.membership || 'Unknown';
      if (!pendingByMembership[membership]) {
        pendingByMembership[membership] = {
          membership,
          count: 0,
          totalPending: 0
        };
      }
      pendingByMembership[membership].count++;
      pendingByMembership[membership].totalPending += member.pendingAmount;
    });
    
    // Group by branch (for gym owners)
    const pendingByBranch = {};
    if (req.user.role === 'gym_owner') {
      pendingMembers.forEach(member => {
        const branchId = member.branchId;
        if (!pendingByBranch[branchId]) {
          pendingByBranch[branchId] = {
            branchId,
            branchName: member.branchName,
            count: 0,
            totalPending: 0
          };
        }
        pendingByBranch[branchId].count++;
        pendingByBranch[branchId].totalPending += member.pendingAmount;
      });
    }
    
    res.json({
      summary: {
        totalMembers: pendingMembers.length,
        totalPendingAmount: totalPendingAmount,
        averagePending: pendingMembers.length > 0 ? totalPendingAmount / pendingMembers.length : 0
      },
      filters: {
        branchId: req.user.role === 'manager' ? req.user.branchId : (branchId || 'All Branches'),
        membership: membership || 'All Types',
        minAmount: minAmount || 'No Minimum',
        maxAmount: maxAmount || 'No Maximum'
      },
      pendingByMembership: Object.values(pendingByMembership),
      pendingByBranch: req.user.role === 'gym_owner' ? Object.values(pendingByBranch) : undefined,
      members: pendingMembers,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Branch Manager Overdue Payments - Simple and Direct
exports.getBranchOverduePayments = async (req, res) => {
  try {
    // Only managers can access this endpoint
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: "Access denied. Only branch managers can view branch overdue payments." });
    }

    // Get members for this branch only
    const members = await Member.find({ 
      branchId: req.user.branchId,
      role: 'member'
    });
    
    const memberIds = members.map(member => member._id);
    const personalDetails = await Details.find({ memberId: { $in: memberIds } });

    // Filter members with overdue payments
    const overdueMembers = personalDetails
      .filter(detail => detail.totalAmount > detail.paidAmount)
      .map(detail => {
        const member = members.find(m => m._id.toString() === detail.memberId.toString());
        const overdueAmount = detail.totalAmount - detail.paidAmount;
        
        // Calculate days overdue (if membership has ended)
        let daysOverdue = 0;
        if (detail.membership_end_date) {
          const today = new Date();
          const endDate = new Date(detail.membership_end_date);
          if (today > endDate) {
            daysOverdue = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
          }
        }

        return {
          memberId: detail.memberId,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
          email: member ? member.email : null,
          phoneNumber: detail.phoneNumber,
          membership: detail.membership,
          totalAmount: detail.totalAmount,
          paidAmount: detail.paidAmount,
          overdueAmount: overdueAmount,
          daysOverdue: daysOverdue,
          lastPaymentDate: detail.updatedAt,
          membershipStartDate: detail.membership_start_date,
          membershipEndDate: detail.membership_end_date,
          isOverdue: daysOverdue > 0
        };
      })
      .sort((a, b) => b.overdueAmount - a.overdueAmount);

    // Calculate summary
    const totalOverdueAmount = overdueMembers.reduce((sum, member) => sum + member.overdueAmount, 0);
    const overdueCount = overdueMembers.length;
    const totalMembers = members.length;

    // Get branch info
    const Branch = require('../models/branch');
    const branch = await Branch.findById(req.user.branchId);

    // Group by membership type
    const overdueByMembership = {};
    overdueMembers.forEach(member => {
      const membership = member.membership || 'Unknown';
      if (!overdueByMembership[membership]) {
        overdueByMembership[membership] = {
          membership,
          count: 0,
          totalOverdue: 0,
          averageOverdue: 0
        };
      }
      overdueByMembership[membership].count++;
      overdueByMembership[membership].totalOverdue += member.overdueAmount;
    });

    // Calculate averages
    Object.values(overdueByMembership).forEach(group => {
      group.averageOverdue = group.count > 0 ? group.totalOverdue / group.count : 0;
    });

    res.json({
      branch: {
        branchId: branch._id,
        branchName: branch.name,
        location: branch.location
      },
      summary: {
        totalMembers: totalMembers,
        overdueMembers: overdueCount,
        totalOverdueAmount: totalOverdueAmount,
        averageOverdue: overdueCount > 0 ? totalOverdueAmount / overdueCount : 0,
        overduePercentage: totalMembers > 0 ? (overdueCount / totalMembers) * 100 : 0
      },
      overdueByMembership: Object.values(overdueByMembership),
      overdueMembers: overdueMembers,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Debug endpoint to check branch manager data
exports.debugBranchManagerData = async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access this debug endpoint' });
    }

    // Get members for this branch
    const members = await Member.find({ 
      branchId: req.user.branchId,
      role: 'member'
    });

    const memberIds = members.map(member => member._id);
    const personalDetails = await Details.find({ memberId: { $in: memberIds } });

    // Check for pending payments
    const pendingDetails = personalDetails.filter(detail => detail.totalAmount > detail.paidAmount);

    res.json({
      debug: {
        userRole: req.user.role,
        userBranchId: req.user.branchId,
        totalMembers: members.length,
        totalPersonalDetails: personalDetails.length,
        pendingDetails: pendingDetails.length,
        members: members.map(m => ({
          id: m._id,
          name: `${m.firstName} ${m.lastName}`,
          branchId: m.branchId
        })),
        personalDetails: personalDetails.map(d => ({
          memberId: d.memberId,
          totalAmount: d.totalAmount,
          paidAmount: d.paidAmount,
          pending: d.totalAmount - d.paidAmount
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
