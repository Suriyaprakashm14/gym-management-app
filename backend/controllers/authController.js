const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/user');
const Member = require('../models/member'); // Legacy support
const Details = require('../models/membersPersonalDetails'); // Legacy support
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const OTP = require('../models/otp');
const { sendOTPEmail, sendPasswordResetSuccessEmail, verifyEmailConfig } = require('../utils/emailService');
const sgMail = require('@sendgrid/mail');
const { getJwtSecret } = require('../config/env');
const { isUserEmailDuplicateKey, isUserPhoneDuplicateKey } = require('../utils/mongoErrors');
const { normalizeIndianMobile } = require('../utils/indianPhone');

const JWTSECRET = getJwtSecret();
const JWTEXPIRESIN = '8h'; // Extended token expiry for better UX

// Unified login function supporting both User (RBAC) and Member (Legacy) models
exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Phone or email, and password are required',
      });
    }

    const normalizedPhone = phone != null && String(phone).trim() ? normalizeIndianMobile(phone) : null;
    const normalizedEmail =
      email != null && String(email).trim() ? String(email).toLowerCase().trim() : null;

    if (phone != null && String(phone).trim() && !normalizedPhone) {
      return res.status(400).json({
        error: 'Invalid phone',
        message: 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)',
      });
    }

    if (!normalizedPhone && !normalizedEmail) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Phone or email, and password are required',
      });
    }

    // Find user in RBAC User model first (phone preferred; then email with case-insensitive match)
    let user = null;
    if (normalizedPhone) {
      user = await User.findOne({ phone: normalizedPhone })
        .populate('gymId', 'name status isFrozen logoUrl')
        .populate('branchId', 'name status');
    }
    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail })
        .collation({ locale: 'en', strength: 2 })
        .populate('gymId', 'name status isFrozen logoUrl')
        .populate('branchId', 'name status');
    }

    let isLegacyUser = false;

    // If not found in User model, check legacy Member model (email only)
    if (!user && normalizedEmail) {
      const member = await Member.findOne({ email: normalizedEmail });
      if (member) {
        const allowedRoles = ['manager'];
        if (!allowedRoles.includes(member.role)) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Only managers can login with legacy accounts'
          });
        }
        user = {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          branchId: member.branchId,
          gymId: member.gymId,
          password: member.password,
          isActive: true,
          status: 'active',
          comparePassword: async function(candidatePassword) {
            return bcrypt.compare(candidatePassword, this.password);
          },
          resetLoginAttempts: async function() { return Promise.resolve(); },
          incrementLoginAttempts: async function() { return Promise.resolve(); },
          isFrozen: async function() { return false; }
        };
        isLegacyUser = true;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Phone/email or password is incorrect',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (!isLegacyUser && user.incrementLoginAttempts) {
        await user.incrementLoginAttempts();
      }
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Phone/email or password is incorrect',
      });
    }

    if (!isLegacyUser && user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    if (!isLegacyUser && user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated',
        message: 'Account is deactivated. Contact your owner.'
      });
    }

    const devEmails = ['owner@gympro.com', 'manager@gympro.com'];
    const devPhones = ['9999999999'];
    const isDevUser =
      devEmails.includes((user.email || normalizedEmail || '').toLowerCase()) ||
      (!!normalizedPhone && devPhones.includes(normalizedPhone)) ||
      (!!user.phone && devPhones.includes(String(user.phone)));
    const skipLock = process.env.NODE_ENV === 'development' && isDevUser;
    if (!isLegacyUser && user.isLocked && !skipLock) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    if (!isLegacyUser && user.isFrozen) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact your gym owner or manager.'
        });
      }
    }

    if (!isLegacyUser && user.lastLogin !== undefined) {
      user.lastLogin = new Date();
      await user.save();
    }

    const tokenPayload = {
      id: user._id,
      role: user.role,
      gymId: user.gymId?._id || user.gymId,
      branchId: user.branchId?._id || user.branchId,
      email: user.email || null,
      phone: user.phone || null,
      firstName: user.firstName,
      lastName: user.lastName,
      isLegacy: isLegacyUser,
    };

    const token = jwt.sign(tokenPayload, JWTSECRET, { expiresIn: JWTEXPIRESIN });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email || null,
        phone: user.phone || null,
        role: user.role,
        gymId: user.gymId?._id || user.gymId,
        gymName: user.gymId?.name,
        gymLogo: user.gymId?.logoUrl || null,
        branchId: user.branchId?._id || user.branchId,
        branchName: user.branchId?.name,
        permissions: user.permissions || [],
        lastLogin: user.lastLogin,
        isLegacy: isLegacyUser
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error during login',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
};

// Helper endpoint to debug login issues
exports.debugLogin = async (req, res) => {
  try {
    // Get sample MembersPersonalDetails
    const details = await Details.find({}).limit(5);
    const detailsList = details.map(d => ({
      memberId: d.memberId,
      memberIdType: typeof d.memberId,
      email: d.email,
      firstName: d.firstName || 'N/A'
    }));

    // Get sample Members
    const members = await Member.find({}).limit(5);
    const membersList = members.map(m => ({
      id: m._id,
      idType: typeof m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role
    }));

    // Get sample Users (RBAC system)
    const users = await User.find({}).limit(5);
    const usersList = users.map(u => ({
      id: u._id,
      idType: typeof u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isActive: u.isActive
    }));

    res.json({
      success: true,
      message: 'Login debug information',
      data: {
        totalDetails: await Details.countDocuments(),
        totalMembers: await Member.countDocuments(),
        totalUsers: await User.countDocuments(),
        sampleDetails: detailsList,
        sampleMembers: membersList,
        sampleUsers: usersList
      }
    });
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({ error: 'Server error during debug' });
  }
};

// Helper endpoint to debug specific email
exports.debugEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('Debugging email:', email);
    
    // Check if email exists in MembersPersonalDetails
    const details = await Details.findOne({ email: email.toLowerCase() });
    
    if (!details) {
      // Check if email exists with different case
      const detailsCaseInsensitive = await Details.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
      
      // Get all emails to see what exists
      const allEmails = await Details.find({}, 'email').limit(10);
      
      return res.json({
        success: false,
        message: 'Email not found in MembersPersonalDetails',
        data: {
          searchedEmail: email,
          foundWithCaseInsensitive: !!detailsCaseInsensitive,
          sampleEmails: allEmails.map(d => d.email)
        }
      });
    }
    
    // Find the member
    const member = await Member.findById(details.memberId);
    
    if (!member) {
      return res.json({
        success: false,
        message: 'Member not found for this email',
        data: {
          email: details.email,
          memberId: details.memberId,
          memberIdType: typeof details.memberId
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Email and member found',
      data: {
        email: details.email,
        memberId: details.memberId,
        member: {
          id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          hasPassword: !!member.password
        }
      }
    });
    
  } catch (error) {
    console.error('Debug email error:', error);
    res.status(500).json({ error: 'Server error during email debug' });
  }
};

// Test endpoint for debugging Postman requests
exports.testLogin = async (req, res) => {
  try {
    console.log('=== POSTMAN TEST ENDPOINT ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Raw body:', JSON.stringify(req.body));
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        received: { email, password }
      });
    }
    
    // Test the same logic as login
    const member = await Member.findOne({ email: email.toLowerCase() });
    if (!member) {
      return res.status(401).json({ 
        error: 'Member not found',
        searchedEmail: email.toLowerCase()
      });
    }
    
    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Password mismatch',
        memberEmail: member.email,
        inputPassword: password
      });
    }
    
    res.json({
      success: true,
      message: 'Login test successful',
      member: {
        id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        email: member.email
      }
    });
    
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Forgot Password - Send OTP to email
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        error: 'Email or phone is required',
        message: 'Send your registered email or Indian mobile number',
      });
    }

    let user = null;
    if (phone != null && String(phone).trim()) {
      const np = normalizeIndianMobile(phone);
      if (!np) {
        return res.status(400).json({
          error: 'Invalid phone',
          message: 'Enter a valid 10-digit Indian mobile number',
        });
      }
      user = await User.findOne({ phone: np, isActive: true });
    }
    if (!user && email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim(), isActive: true }).collation({
        locale: 'en',
        strength: 2,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Owner account not found',
      });
    }
    if (user.role !== 'gym_owner') {
      return res.status(404).json({
        success: false,
        error: 'Owner account not found'
      });
    }
    const isLegacyUser = false;

    // For RBAC users, check if account is frozen
    if (!isLegacyUser) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({ 
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact your gym owner or manager.'
        });
      }
    }

    const recoveryEmail = user.email && String(user.email).trim();
    if (!recoveryEmail) {
      return res.status(400).json({
        success: false,
        error: 'NO_RECOVERY_EMAIL',
        message:
          'Password reset uses email. Add a recovery email to your profile (gym owner settings) or contact support.',
      });
    }

    // Create OTP record (keyed by recovery email)
    const otpRecord = await OTP.createForEmail(recoveryEmail, 'password_reset');

    // Send OTP email
    try {
      await sendOTPEmail(recoveryEmail, otpRecord.otp, 'password_reset');
    } catch (error) {
      console.error('🔥 REAL EMAIL ERROR:', error.response?.body || error);
      throw error; // don't wrap it
    }

    res.json({
      success: true,
      message: 'OTP has been sent to your email address',
      data: {
        email: recoveryEmail,
        expiresIn: '10 minutes',
      },
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Server error during password reset request',
      details: error.message 
    });
  }
};

// Reset Password - Verify OTP and reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Email, OTP, and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    const normalizedResetEmail = String(email).toLowerCase().trim();
    const tokenEmail = req.resetEmail ? String(req.resetEmail).toLowerCase().trim() : null;
    if (tokenEmail && tokenEmail !== normalizedResetEmail) {
      return res.status(403).json({
        error: 'Reset token does not match the requested account',
      });
    }

    // Verify OTP
    try {
      await OTP.verifyOTP(normalizedResetEmail, otp, 'password_reset');
    } catch (otpError) {
      console.log('OTP verification failed:', otpError.message);
      return res.status(400).json({ 
        error: otpError.message 
      });
    }

    // Find user (try User model first, then Member model)
    let user = await User.findOne({ email: normalizedResetEmail, isActive: true }).collation({
      locale: 'en',
      strength: 2,
    });
    let isLegacyUser = false;
    
    if (!user) {
      user = await Member.findOne({ email: normalizedResetEmail });
      if (user) {
        isLegacyUser = true;
      }
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'Account not found' 
      });
    }

    // Update password (will be automatically hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    // Send success email (non-blocking)
    sendPasswordResetSuccessEmail(normalizedResetEmail, user.firstName)
      .then(result => {
        console.log('Password reset success email result:', result);
      })
      .catch(error => {
        console.error('Failed to send success email:', error);
      });

    res.json({
      success: true,
      message: 'Password has been reset successfully',
      data: {
        email: normalizedResetEmail,
        resetAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      error: 'Server error during password reset',
      details: error.message 
    });
  }
};

// Verify OTP endpoint (for frontend validation)
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: 'Email and OTP are required'
      });
    }

    const normalizedOtpEmail = String(email).toLowerCase().trim();
    await OTP.verifyOTP(normalizedOtpEmail, otp, 'password_reset');

    // 🔥 NEW: Generate reset token
    const resetToken = jwt.sign(
      { email: normalizedOtpEmail, purpose: 'password_reset' },
      JWTSECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token: resetToken   // 👈 IMPORTANT
    });

  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};

// Resend OTP endpoint
exports.resendOTP = async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({
        error: 'Email or phone is required',
      });
    }

    let user = null;
    if (phone != null && String(phone).trim()) {
      const np = normalizeIndianMobile(phone);
      if (!np) {
        return res.status(400).json({ error: 'Invalid phone', message: 'Enter a valid Indian mobile number' });
      }
      user = await User.findOne({ phone: np, isActive: true });
    }
    if (!user && email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim(), isActive: true }).collation({
        locale: 'en',
        strength: 2,
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Owner account not found'
      });
    }
    if (user.role !== 'gym_owner') {
      return res.status(404).json({
        success: false,
        error: 'Owner account not found'
      });
    }
    const isLegacyUser = false;

    // For RBAC users, check if account is frozen
    if (!isLegacyUser) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({ 
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact your gym owner or manager.'
        });
      }
    }

    const recoveryEmail = user.email && String(user.email).trim();
    if (!recoveryEmail) {
      return res.status(400).json({
        success: false,
        error: 'NO_RECOVERY_EMAIL',
        message:
          'Password reset uses email. Add a recovery email to your profile or contact support.',
      });
    }

    // Check if there's a recent OTP request (rate limiting)
    const recentOTP = await OTP.findOne({
      email: recoveryEmail.toLowerCase(),
      type: 'password_reset',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes ago
    });

    if (recentOTP) {
      return res.status(429).json({ 
        error: 'Please wait at least 2 minutes before requesting a new OTP' 
      });
    }

    const otpRecord = await OTP.createForEmail(recoveryEmail, 'password_reset');
    try {
      await sendOTPEmail(recoveryEmail, otpRecord.otp, 'password_reset');
    } catch (sendErr) {
      console.error('Resend OTP email error:', sendErr);
      throw sendErr;
    }

    res.json({
      success: true,
      message: 'New OTP has been sent to your email address',
      data: {
        email: recoveryEmail,
        expiresIn: '10 minutes'
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      error: 'Server error during OTP resend',
      details: error.message 
    });
  }
};

// Owner resets password for manager or staff (authenticated, owner only)
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role === 'gym_owner') {
      return res.status(403).json({
        success: false,
        error: 'Cannot reset owner password here'
      });
    }

    // Owner can only reset users in their gym
    if (req.user.role === 'gym_owner' && req.user.gymId) {
      const targetGymId = (user.gymId && user.gymId._id) ? user.gymId._id.toString() : (user.gymId && user.gymId.toString()) || '';
      const ownerGymId = (req.user.gymId && req.user.gymId._id) ? req.user.gymId._id.toString() : (req.user.gymId && req.user.gymId.toString()) || '';
      if (targetGymId !== ownerGymId) {
        return res.status(403).json({
          success: false,
          error: 'You can only reset password for users in your gym'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    if (updateResult.matchedCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password',
        message: 'User document could not be updated'
      });
    }
    console.log('Password reset successfully for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset',
      details: error.message
    });
  }
};

// ========== RBAC USER MANAGEMENT FUNCTIONS ==========

// Public gym owner signup: creates Gym + User (gym_owner). No branch; owner adds branches via Branches page.
exports.signup = async (req, res) => {
  let gymCreated = null;
  let userPersisted = false;
  try {
    const { gymName, firstName, lastName, phone, email: bodyEmail, password, gymIcon } = req.body;

    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'firstName, lastName, phone, and password are required',
      });
    }

    const trimmedGymName = (gymName && String(gymName).trim()) || 'My Gym';

    if (String(password).length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 6 characters',
      });
    }

    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Invalid phone',
        message: 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210)',
      });
    }

    let normalizedOptionalEmail = null;
    if (bodyEmail != null && String(bodyEmail).trim()) {
      normalizedOptionalEmail = String(bodyEmail).toLowerCase().trim();
      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(normalizedOptionalEmail)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid recovery email or omit it',
        });
      }
      const existingByEmail = await User.findOne({ email: normalizedOptionalEmail })
        .collation({ locale: 'en', strength: 2 })
        .select('_id')
        .lean();
      if (existingByEmail) {
        return res.status(409).json({
          error: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email already exists. Try logging in instead.',
        });
      }
    }

    const existingByPhone = await User.findOne({ phone: normalizedPhone }).select('_id').lean();
    if (existingByPhone) {
      return res.status(409).json({
        error: 'PHONE_ALREADY_REGISTERED',
        message: 'An account with this phone number already exists. Try logging in instead.',
      });
    }

    const gym = new Gym({
      name: trimmedGymName,
      status: 'active',
      isFrozen: false,
      createdBy: 'system',
      ...(gymIcon && typeof gymIcon === 'string' && gymIcon.length > 0 ? { logoUrl: gymIcon } : {}),
    });
    await gym.save();
    gymCreated = gym;

    const gymOwner = new User({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: normalizedPhone,
      ...(normalizedOptionalEmail ? { email: normalizedOptionalEmail } : {}),
      password: String(password),
      role: 'gym_owner',
      gymId: gym._id,
      status: 'active',
      isActive: true,
      createdBy: 'system',
    });

    try {
      await gymOwner.save();
      userPersisted = true;
    } catch (saveErr) {
      // Some older DBs still have a legacy non-sparse unique email index.
      // For phone-only owners, that index causes false duplicate-email errors.
      const isLegacyEmailIndexConflict = !normalizedOptionalEmail && isUserEmailDuplicateKey(saveErr);
      if (isLegacyEmailIndexConflict) {
        try {
          await User.syncIndexes();
          await gymOwner.save();
          userPersisted = true;
        } catch (retryErr) {
          await Gym.findByIdAndDelete(gym._id).catch(() => {});
          gymCreated = null;
          if (isUserEmailDuplicateKey(retryErr)) {
            return res.status(409).json({
              error: 'EMAIL_ALREADY_REGISTERED',
              message: 'An account with this email already exists. Try logging in instead.',
            });
          }
          if (isUserPhoneDuplicateKey(retryErr)) {
            return res.status(409).json({
              error: 'PHONE_ALREADY_REGISTERED',
              message: 'An account with this phone number already exists. Try logging in instead.',
            });
          }
          throw retryErr;
        }
      } else {
        await Gym.findByIdAndDelete(gym._id).catch(() => {});
        gymCreated = null;
        if (isUserEmailDuplicateKey(saveErr)) {
          return res.status(409).json({
            error: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email already exists. Try logging in instead.',
          });
        }
        if (isUserPhoneDuplicateKey(saveErr)) {
          return res.status(409).json({
            error: 'PHONE_ALREADY_REGISTERED',
            message: 'An account with this phone number already exists. Try logging in instead.',
          });
        }
        throw saveErr;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
      data: {
        id: gymOwner._id,
        phone: gymOwner.phone,
        email: gymOwner.email || null,
        gymId: gym._id,
        gymName: gym.name,
      },
    });
  } catch (error) {
    if (gymCreated?._id && !userPersisted) {
      await Gym.findByIdAndDelete(gymCreated._id).catch(() => {});
    }
    console.error('Signup error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server error during signup',
        message: error.message || 'An unexpected error occurred. Please try again.'
      });
    }
  }
};

// Create manager
exports.createManager = async (req, res) => {
  try {
    const { email, password, firstName, lastName, gymId, branchId } = req.body;
    
    if (!email || !password || !firstName || !lastName || !gymId || !branchId) {
    const requester = req.currentUser || req.user || {};
    const requesterGymId = requester.gymId ? String(requester.gymId) : null;
    const targetGymId = String(gymId);
    if (!requesterGymId || requesterGymId !== targetGymId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can create managers only for your own gym',
      });
    }

      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName, gymId, branchId' 
      });
    }

    // Verify gym exists and user has access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ 
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    // Verify branch exists and belongs to gym
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ 
        error: 'Branch not found',
        message: 'The specified branch does not exist'
      });
    }

    if (String(branch.gymId) !== targetGymId) {
      return res.status(400).json({ 
        error: 'Invalid branch',
        message: 'Branch does not belong to the specified gym'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }

    // Create manager
    const manager = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: 'manager',
      gymId,
      branchId,
      status: 'active',
      isActive: true,
      createdBy: req.user?.id || 'system'
    });

    await manager.save();

    res.status(201).json({
      success: true,
      message: 'Manager created successfully',
      data: {
        id: manager._id,
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        role: manager.role,
        gymId: manager.gymId,
        gymName: gym.name,
        branchId: manager.branchId,
        branchName: branch.name
      }
    });

  } catch (error) {
    console.error('Create manager error:', error);
    res.status(500).json({ 
      error: 'Server error while creating manager',
      message: error.message 
    });
  }
};


// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    // First try to find user in the new RBAC system
    let user = await User.findById(req.user.id)
      .populate('gymId', 'name status isFrozen logoUrl')
      .populate('branchId', 'name status')
      .select('-password');

    let isLegacyUser = false;

    // If not found in User model, check legacy Member model
    if (!user) {
      console.log('User not found in RBAC system, checking legacy Member model');
      const member = await Member.findById(req.user.id);
      
      if (member) {
        // Only allow manager role from legacy system
        const allowedRoles = ['manager'];
        if (!allowedRoles.includes(member.role)) {
          return res.status(403).json({ 
            error: 'Access denied: Legacy users with this role cannot access this resource' 
          });
        }

        // Get gym and branch details for legacy users
        let gymDetails = null;
        let branchDetails = null;

        if (member.gymId) {
          gymDetails = await Gym.findById(member.gymId);
        }
        if (member.branchId) {
          branchDetails = await Branch.findById(member.branchId);
        }

        // Convert member to user-like object for consistent response
        user = {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          gymId: gymDetails,
          branchId: branchDetails,
          status: member.status || 'active',
          isActive: member.isActive !== false,
          permissions: member.permissions || [],
          profile: member.profile || {},
          authMethods: member.authMethods || {},
          lastLogin: member.lastLogin,
          createdAt: member.createdAt
        };
        isLegacyUser = true;
      }
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account does not exist'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email || null,
        phone: user.phone || (user.profile && user.profile.phone) || null,
        role: user.role,
        gymId: user.gymId?._id || user.gymId,
        gymName: user.gymId?.name,
        branchId: user.branchId?._id || user.branchId,
        branchName: user.branchId?.name,
        status: user.status,
        isActive: user.isActive,
        permissions: user.permissions,
        profile: user.profile,
        authMethods: user.authMethods,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isLegacyUser: isLegacyUser
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching profile',
      message: error.message 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, profile, email: bodyEmail } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account does not exist'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (profile) user.profile = { ...user.profile, ...profile };

    if (bodyEmail !== undefined) {
      const raw = String(bodyEmail).trim();
      if (raw === '') {
        user.set('email', undefined);
      } else {
        const ne = raw.toLowerCase();
        if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(ne)) {
          return res.status(400).json({ error: 'Invalid email', message: 'Please provide a valid email address' });
        }
        const dup = await User.findOne({ email: ne, _id: { $ne: user._id } })
          .collation({ locale: 'en', strength: 2 })
          .select('_id')
          .lean();
        if (dup) {
          return res.status(409).json({
            error: 'EMAIL_ALREADY_REGISTERED',
            message: 'This email is already used by another account',
          });
        }
        user.email = ne;
      }
    }

    user.lastModifiedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email || null,
        phone: user.phone || null,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Server error while updating profile',
      message: error.message 
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account does not exist'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        error: 'Invalid current password',
        message: 'The current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    user.lastModifiedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Server error while changing password',
      message: error.message 
    });
  }
};

// Logout (token blacklisting handled in tokenBlacklist middleware)
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Server error during logout',
      message: error.message 
    });
  }
};
