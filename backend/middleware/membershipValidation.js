const Member = require('../models/member');
const { todayMidnightIST } = require('../utils/istTime');

function validateMemberAccess(member) {
  if (!member) {
    return { isValid: false, status: 404, error: 'Member not found', message: 'The specified member does not exist' };
  }
  if (!member.isActive) {
    return {
      isValid: false,
      status: 403,
      error: 'Member inactive',
      message: 'Your account is inactive. Please contact your gym owner or manager.',
      data: { memberId: member._id, memberName: `${member.firstName} ${member.lastName}`, status: member.status },
    };
  }
  if (member.status === 'suspended') {
    return {
      isValid: false,
      status: 403,
      error: 'Membership suspended',
      message: 'Your membership is suspended. Please contact the gym.',
      data: { memberId: member._id, memberName: `${member.firstName} ${member.lastName}`, status: member.status },
    };
  }
  if (!member.membership || !member.membership.startDate || !member.membership.endDate) {
    return {
      isValid: false,
      status: 403,
      error: 'No active membership',
      message: 'You do not have an active membership plan. Please renew your membership.',
      data: { memberId: member._id, memberName: `${member.firstName} ${member.lastName}`, membershipStatus: 'none' },
    };
  }
  if (!member.membership.isActive) {
    return {
      isValid: false,
      status: 403,
      error: 'Membership inactive',
      message: 'Your membership is inactive. Please renew your membership.',
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipStatus: 'inactive',
        membershipType: member.membership.type,
        membershipStartDate: member.membership.startDate,
        membershipEndDate: member.membership.endDate,
      },
    };
  }

  const today = todayMidnightIST();
  const startDate = new Date(member.membership.startDate);
  const endDate = new Date(member.membership.endDate);
  if (startDate > today) {
    return {
      isValid: false,
      status: 400,
      error: 'Membership not started',
      message: 'Membership not started yet',
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipStatus: 'upcoming',
        membershipStartDate: member.membership.startDate,
        membershipEndDate: member.membership.endDate,
      },
    };
  }
  if (endDate < today) {
    return {
      isValid: false,
      status: 403,
      error: 'Membership expired',
      message: 'Your membership has expired. Please renew your membership to access the gym.',
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipStatus: 'expired',
        membershipType: member.membership.type,
        membershipStartDate: member.membership.startDate,
        membershipEndDate: member.membership.endDate,
        expiredOn: member.membership.endDate,
      },
    };
  }

  return { isValid: true, member };
}

/**
 * Middleware to validate if a member has an active membership
 * This middleware should be used before allowing attendance marking
 */
const validateMembership = async (req, res, next) => {
  try {
    const { memberId } = req.body;
    
    if (!memberId) {
      return res.status(400).json({
        error: 'Member ID required',
        message: 'Member ID is required to validate membership'
      });
    }

    // Find the member
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'The specified member does not exist'
      });
    }

    const membershipResult = validateMemberAccess(member);
    if (!membershipResult.isValid) {
      return res.status(membershipResult.status || 403).json(membershipResult);
    }

    // Check if member's gym is frozen
    const isGymFrozen = await member.isFrozen();
    if (isGymFrozen) {
      return res.status(403).json({
        error: 'Gym frozen',
        message: 'Your gym is currently frozen. Please contact your gym owner or manager.',
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          gymStatus: 'frozen'
        }
      });
    }

    // All validations passed - attach member to request for use in controller
    req.validatedMember = member;
    next();

  } catch (error) {
    console.error('Membership validation error:', error);
    res.status(500).json({
      error: 'Server error during membership validation',
      message: 'An error occurred while validating membership. Please try again.'
    });
  }
};

/**
 * Middleware to validate membership for face recognition attendance (without memberId in body)
 * This middleware works with the member found through face recognition
 */
const validateMembershipForFaceRecognition = async (req, res, next) => {
  try {
    // This middleware should be called after face recognition has identified the member
    // The member should be attached to req.recognizedMember by the face recognition logic
    
    const member = req.recognizedMember;
    
    if (!member) {
      return res.status(400).json({
        error: 'Member not identified',
        message: 'Could not identify member for membership validation'
      });
    }

    const membershipResult = validateMemberAccess(member);
    if (!membershipResult.isValid) {
      return res.status(membershipResult.status || 403).json(membershipResult);
    }

    // Check if member's gym is frozen
    const isGymFrozen = await member.isFrozen();
    if (isGymFrozen) {
      return res.status(403).json({
        error: 'Gym frozen',
        message: 'Your gym is currently frozen. Please contact your gym owner or manager.',
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          gymStatus: 'frozen'
        }
      });
    }

    // All validations passed - attach validated member to request
    req.validatedMember = member;
    next();

  } catch (error) {
    console.error('Membership validation error for face recognition:', error);
    res.status(500).json({
      error: 'Server error during membership validation',
      message: 'An error occurred while validating membership. Please try again.'
    });
  }
};

/**
 * Helper function to check membership status (can be used in controllers)
 */
const checkMembershipStatus = async (memberId) => {
  try {
    const member = await Member.findById(memberId);
    
    const membershipResult = validateMemberAccess(member);
    if (!membershipResult.isValid) return membershipResult;

    const isGymFrozen = await member.isFrozen();
    if (isGymFrozen) {
      return {
        isValid: false,
        error: 'Gym frozen',
        message: 'Your gym is currently frozen. Please contact your gym owner or manager.',
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          gymStatus: 'frozen'
        }
      };
    }

    return {
      isValid: true,
      member: member
    };

  } catch (error) {
    console.error('Check membership status error:', error);
    return {
      isValid: false,
      error: 'Server error',
      message: 'An error occurred while checking membership status. Please try again.'
    };
  }
};

module.exports = {
  validateMemberAccess,
  validateMembership,
  validateMembershipForFaceRecognition,
  checkMembershipStatus
};
