const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Member = require('../models/member'); // Legacy support
const Details = require('../models/membersPersonalDetails'); // Legacy support
const Gym = require('../models/gym');
const Branch = require('../models/branch');
const OTP = require('../models/otp');
const { sendOTPEmail, sendPasswordResetSuccessEmail, verifyEmailConfig } = require('../utils/emailService');

const JWTSECRET = process.env.JWTSECRET || 'your_jwt_secret_key_here';
const JWTEXPIRESIN = '8h'; // Extended token expiry for better UX
const PRIVILEGED_LOGIN_EMAIL = 'signalflow16@gmail.com';
const PRIVILEGED_LOGIN_PASSWORD = 'Roar@123';
const PRIVILEGED_USER_ID = 'local-super-admin';

const isPrivilegedLoginEmail = (email) =>
  typeof email === 'string' &&
  email.trim().toLowerCase() === PRIVILEGED_LOGIN_EMAIL;

const createPrivilegedLocalUser = () => ({
  _id: PRIVILEGED_USER_ID,
  firstName: 'Local',
  lastName: 'Admin',
  email: PRIVILEGED_LOGIN_EMAIL,
  role: 'admin,manager',
  branchId: null,
  gymId: null,
  permissions: [{ resource: '*', actions: ['*'] }],
  isActive: true,
  status: 'active',
  comparePassword: async function(candidatePassword) {
    return candidatePassword === PRIVILEGED_LOGIN_PASSWORD;
  }
});

// Unified login function supporting both User (RBAC) and Member (Legacy) models
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    const normalizedEmail = email.toLowerCase();
    const isPrivilegedEmail = isPrivilegedLoginEmail(normalizedEmail);

    console.log('Login attempt for email:', email);

    // First try to find user in the new RBAC system
    let user = await User.findOne({ 
      email: normalizedEmail,
      isActive: true 
    }).populate('gymId', 'name status isFrozen').populate('branchId', 'name status');

    let isLegacyUser = false;
    
    // If not found in User model, check legacy Member model
    if (!user) {
      console.log('User not found in RBAC system, checking legacy Member model');
      const member = await Member.findOne({ email: normalizedEmail });
      
      if (member) {
        // Only allow admin and manager roles from legacy system
        const allowedRoles = ['admin', 'manager'];
        if (!allowedRoles.includes(member.role) && !isPrivilegedEmail) {
          return res.status(403).json({ 
            error: 'Access denied: Only admin and managers can login' 
          });
        }

        // Convert member to user-like object for consistent response
        user = {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          branchId: member.branchId,
          password: member.password,
          isActive: true,
          status: 'active',
          comparePassword: async function(candidatePassword) {
            return bcrypt.compare(candidatePassword, this.password);
          },
          resetLoginAttempts: async function() {
            // Legacy members don't have login attempt tracking
            return Promise.resolve();
          },
          incrementLoginAttempts: async function() {
            // Legacy members don't have login attempt tracking
            return Promise.resolve();
          },
          isFrozen: async function() {
            return false; // Legacy members don't have frozen status
          }
        };
        isLegacyUser = true;
      }
    }

    // Fallback local super-admin login when no DB record exists.
    if (!user && isPrivilegedEmail) {
      user = createPrivilegedLocalUser();
    }

    if (!user) {
      console.log('No user found for email:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    console.log('Found user:', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email,
      gymId: user.gymId?._id,
      branchId: user.branchId?._id,
      isLegacy: isLegacyUser
    });

    const isPrivilegedUser = isPrivilegedLoginEmail(user.email || normalizedEmail);

    // Check if user is locked due to failed login attempts (RBAC users only)
    if (!isLegacyUser && user.isLocked && !isPrivilegedUser) {
      return res.status(423).json({ 
        error: 'Account locked',
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check if user is frozen (RBAC users only)
    if (!isLegacyUser && !isPrivilegedUser) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({ 
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact the admin.'
        });
      }
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts for RBAC users
      if (!isLegacyUser) {
        await user.incrementLoginAttempts();
      }
      console.log('Password mismatch for user:', user.email);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Reset login attempts on successful login (RBAC users only)
    if (!isLegacyUser && !isPrivilegedUser) {
      await user.resetLoginAttempts();
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const tokenPayload = {
      id: user._id,
      role: isPrivilegedUser ? 'admin' : user.role,
      gymId: user.gymId?._id,
      branchId: user.branchId?._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isLegacy: isLegacyUser
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
        email: user.email,
        role: isPrivilegedUser ? 'admin' : user.role,
        gymId: user.gymId?._id,
        gymName: user.gymId?.name,
        branchId: user.branchId?._id,
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

// Helper endpoint to create a proper admin user
exports.createAdminUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, branchId } = req.body;
    
    if (!email || !password || !firstName || !lastName || !branchId) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName, branchId' 
      });
    }
    
    // Check if email already exists
    const existingDetails = await Details.findOne({ email: email.toLowerCase() });
    if (existingDetails) {
      return res.status(400).json({ 
        error: 'Email already exists',
        details: 'Please use a different email or update the existing record'
      });
    }
    
    // Create a new member with admin role
    const member = new Member({
      firstName,
      lastName,
      email: email.toLowerCase(),
      role: 'admin',
      password, // Will be automatically hashed by the pre-save middleware
      branchId
    });
    
    await member.save();
    console.log('Created member:', member._id, member.firstName, member.lastName);
    
    // Create personal details record
    const personalDetails = new Details({
      memberId: member._id,
      branchId,
      email: email.toLowerCase(),
      gender: 'male', // Default value
      phoneNumber: '0000000000' // Default value
    });
    
    await personalDetails.save();
    console.log('Created personal details for member:', member._id);
    
    res.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        member: {
          id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role
        },
        personalDetails: {
          email: personalDetails.email,
          memberId: personalDetails.memberId
        }
      }
    });
    
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ 
      error: 'Server error while creating admin user',
      details: error.message 
    });
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
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Forgot password request for email:', email);

    // Check if email exists in the system (try User model first, then Member model)
    let user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    let isLegacyUser = false;
    
    if (!user) {
      // Check legacy Member model
      const member = await Member.findOne({ email: email.toLowerCase() });
      if (member) {
        // Only allow admin and manager roles from legacy system
        const allowedRoles = ['admin', 'manager'];
        if (!allowedRoles.includes(member.role)) {
          return res.status(403).json({ 
            error: 'Password reset is only available for admin and manager accounts' 
          });
        }
        isLegacyUser = true;
        user = member; // Use member for the rest of the function
      }
    }

    if (!user) {
      console.log('No user found for email:', email);
      return res.status(404).json({ 
        error: 'No account found with this email address' 
      });
    }

    // For RBAC users, check if account is frozen
    if (!isLegacyUser) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({ 
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact the admin.'
        });
      }
    }

    // Verify email service configuration
    const emailServiceReady = await verifyEmailConfig();
    if (!emailServiceReady) {
      console.error('Email service is not configured properly');
      return res.status(500).json({ 
        error: 'Email service is temporarily unavailable. Please try again later.' 
      });
    }

    // Create OTP record
    const otpRecord = await OTP.createForEmail(email, 'password_reset');
    console.log('OTP created for email:', email);

    // Send OTP email
    try {
      await sendOTPEmail(email, otpRecord.otp, 'password_reset');
      console.log('OTP email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again later.' 
      });
    }

    res.json({
      success: true,
      message: 'OTP has been sent to your email address',
      data: {
        email: email,
        expiresIn: '10 minutes'
      }
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
        error: 'Email, OTP, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    console.log('Reset password request for email:', email);

    // Verify OTP
    try {
      await OTP.verifyOTP(email, otp, 'password_reset');
      console.log('OTP verified successfully for email:', email);
    } catch (otpError) {
      console.log('OTP verification failed:', otpError.message);
      return res.status(400).json({ 
        error: otpError.message 
      });
    }

    // Find user (try User model first, then Member model)
    let user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    let isLegacyUser = false;
    
    if (!user) {
      user = await Member.findOne({ email: email.toLowerCase() });
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
    console.log('Password updated successfully for email:', email);

    // Send success email (non-blocking)
    sendPasswordResetSuccessEmail(email, user.firstName)
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
        email: email,
        resetAt: new Date().toISOString()
      }
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

    console.log('OTP verification request for email:', email);

    // Verify OTP
    try {
      await OTP.verifyOTP(email, otp, 'password_reset');
      console.log('OTP verified successfully for email:', email);
      
      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          email: email,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (otpError) {
      console.log('OTP verification failed:', otpError.message);
      return res.status(400).json({ 
        error: otpError.message 
      });
    }

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Server error during OTP verification',
      details: error.message 
    });
  }
};

// Resend OTP endpoint
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    console.log('Resend OTP request for email:', email);

    // Check if email exists (try User model first, then Member model)
    let user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    let isLegacyUser = false;
    
    if (!user) {
      // Check legacy Member model
      const member = await Member.findOne({ email: email.toLowerCase() });
      if (member) {
        // Only allow admin and manager roles from legacy system
        const allowedRoles = ['admin', 'manager'];
        if (!allowedRoles.includes(member.role)) {
          return res.status(403).json({ 
            error: 'OTP resend is only available for admin and manager accounts' 
          });
        }
        isLegacyUser = true;
        user = member;
      }
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this email address' 
      });
    }

    // For RBAC users, check if account is frozen
    if (!isLegacyUser) {
      const isFrozen = await user.isFrozen();
      if (isFrozen) {
        return res.status(403).json({ 
          error: 'Account frozen',
          message: 'Your account is frozen. Please contact the admin.'
        });
      }
    }

    // Check if there's a recent OTP request (rate limiting)
    const recentOTP = await OTP.findOne({
      email: email.toLowerCase(),
      type: 'password_reset',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes ago
    });

    if (recentOTP) {
      return res.status(429).json({ 
        error: 'Please wait at least 2 minutes before requesting a new OTP' 
      });
    }

    // Verify email service
    const emailServiceReady = await verifyEmailConfig();
    if (!emailServiceReady) {
      return res.status(500).json({ 
        error: 'Email service is temporarily unavailable. Please try again later.' 
      });
    }

    // Create new OTP
    const otpRecord = await OTP.createForEmail(email, 'password_reset');
    console.log('New OTP created for email:', email);

    // Send OTP email
    try {
      await sendOTPEmail(email, otpRecord.otp, 'password_reset');
      console.log('OTP email resent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again later.' 
      });
    }

    res.json({
      success: true,
      message: 'New OTP has been sent to your email address',
      data: {
        email: email,
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

// ========== RBAC USER MANAGEMENT FUNCTIONS ==========

// Create first admin user (no authentication required)
exports.createFirstAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName' 
      });
    }

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ 
        error: 'Admin already exists',
        message: 'An admin user already exists. Use the regular create-admin endpoint with proper authentication.'
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

    // Create first admin user
    const admin = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      status: 'active',
      isActive: true,
      createdBy: 'system'
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'First admin user created successfully',
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Create first admin error:', error);
    res.status(500).json({ 
      error: 'Server error while creating first admin',
      message: error.message 
    });
  }
};

// Create admin user (super admin only)
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName' 
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

    // Create admin user
    const admin = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      status: 'active',
      isActive: true,
      createdBy: req.user?.id || 'system'
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      error: 'Server error while creating admin',
      message: error.message 
    });
  }
};

// Create gym owner
exports.createGymOwner = async (req, res) => {
  try {
    const { email, password, firstName, lastName, gymId } = req.body;
    
    if (!email || !password || !firstName || !lastName || !gymId) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName, gymId' 
      });
    }

    // Verify gym exists and is not frozen
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ 
        error: 'Gym not found',
        message: 'The specified gym does not exist'
      });
    }

    if (gym.isFrozen) {
      return res.status(400).json({ 
        error: 'Gym frozen',
        message: 'Cannot create users for a frozen gym'
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

    // Create gym owner
    const gymOwner = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: 'gym_owner',
      gymId,
      status: 'active',
      isActive: true,
      createdBy: req.user?.id || 'system'
    });

    await gymOwner.save();

    res.status(201).json({
      success: true,
      message: 'Gym owner created successfully',
      data: {
        id: gymOwner._id,
        firstName: gymOwner.firstName,
        lastName: gymOwner.lastName,
        email: gymOwner.email,
        role: gymOwner.role,
        gymId: gymOwner.gymId,
        gymName: gym.name
      }
    });

  } catch (error) {
    console.error('Create gym owner error:', error);
    res.status(500).json({ 
      error: 'Server error while creating gym owner',
      message: error.message 
    });
  }
};

// Create manager
exports.createManager = async (req, res) => {
  try {
    const { email, password, firstName, lastName, gymId, branchId } = req.body;
    
    if (!email || !password || !firstName || !lastName || !gymId || !branchId) {
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

    if (branch.gymId !== gymId) {
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
    if (isPrivilegedLoginEmail(req.user?.email)) {
      return res.json({
        success: true,
        data: {
          id: req.user?.id || PRIVILEGED_USER_ID,
          firstName: req.user?.firstName || 'Local',
          lastName: req.user?.lastName || 'Admin',
          email: PRIVILEGED_LOGIN_EMAIL,
          role: 'admin',
          gymId: null,
          gymName: null,
          branchId: null,
          branchName: null,
          status: 'active',
          isActive: true,
          permissions: [{ resource: '*', actions: ['*'] }],
          profile: {},
          authMethods: { password: true, faceRecognition: false, fingerprint: false },
          lastLogin: new Date().toISOString(),
          createdAt: null,
          isLegacyUser: false
        }
      });
    }

    // First try to find user in the new RBAC system
    let user = await User.findById(req.user.id)
      .populate('gymId', 'name status isFrozen')
      .populate('branchId', 'name status')
      .select('-password');

    let isLegacyUser = false;

    // If not found in User model, check legacy Member model
    if (!user) {
      console.log('User not found in RBAC system, checking legacy Member model');
      const member = await Member.findById(req.user.id);
      
      if (member) {
        // Only allow admin and manager roles from legacy system
        const allowedRoles = ['admin', 'manager'];
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
        email: user.email,
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
    const { firstName, lastName, profile } = req.body;
    
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
    
    user.lastModifiedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
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
