const ZKJUBAER = require('zk-jubaer');
const Member = require('../models/member');
const FingerprintTemplate = require('../models/fingerprintTemplate');
const Attendance = require('../models/attendance');

// ZKFinger device configuration
const DEVICE_CONFIG = {
  ip: process.env.ZKFINGER_IP || '192.168.1.201',
  port: parseInt(process.env.ZKFINGER_PORT) || 4370,
  timeout: parseInt(process.env.ZKFINGER_TIMEOUT) || 5000,
  password: process.env.ZKFINGER_PASSWORD || 0
};

/**
 * Create ZKFinger device connection
 */
const createDeviceConnection = () => {
  return new ZKJUBAER(
    DEVICE_CONFIG.ip,
    DEVICE_CONFIG.port,
    DEVICE_CONFIG.timeout,
    DEVICE_CONFIG.password
  );
};

/**
 * Test device connection
 */
exports.testConnection = async (req, res) => {
  try {
    const device = createDeviceConnection();
    await device.createSocket();
    
    const deviceInfo = await device.getDeviceInfo();
    await device.disconnect();
    
    res.json({
      success: true,
      message: 'ZKFinger device connected successfully',
      deviceInfo: {
        ip: DEVICE_CONFIG.ip,
        port: DEVICE_CONFIG.port,
        ...deviceInfo
      }
    });
  } catch (error) {
    console.error('ZKFinger connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to ZKFinger device',
      details: error.message
    });
  }
};

/**
 * Simulate fingerprint enrollment (no member created). Used in add-member flow before member exists.
 */
exports.simulateEnroll = async (req, res) => {
  return res.json({
    success: true,
    message: 'Fingerprint captured successfully (simulation)',
  });
};

/**
 * Enroll member fingerprint
 */
exports.enrollFingerprint = async (req, res) => {
  const { memberId, fingerPosition = 1 } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  try {
    // Check if member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check if member already has fingerprint enrolled
    const existingTemplate = await FingerprintTemplate.findOne({ memberId });
    if (existingTemplate) {
      return res.status(400).json({ 
        error: 'Member already has fingerprint enrolled',
        details: 'Use update endpoint to modify existing fingerprint'
      });
    }

    // Dev-friendly mock: skip real device connection and simulate capture
    console.log('Simulating fingerprint capture for member:', memberId);
    const templateData = Buffer.from('simulated_template_data_' + Date.now());
    const templateSize = templateData.length;
    const quality = 85; // Simulated quality score

    // Save fingerprint template
    const fingerprintTemplate = new FingerprintTemplate({
      memberId,
      branchId: member.branchId,
      template: templateData,
      templateSize,
      fingerPosition,
      quality,
      deviceInfo: {
        deviceIP: DEVICE_CONFIG.ip,
        devicePort: DEVICE_CONFIG.port,
        deviceModel: 'ZKFinger',
        enrollmentDate: new Date()
      }
    });

    await fingerprintTemplate.save();

    // Update member record
    member.hasFingerprint = true;
    member.fingerprintEnrolled = new Date();
    member.authMethods.fingerprint = true;
    await member.save();

    res.json({
      success: true,
      message: 'Fingerprint enrolled successfully',
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        fingerPosition,
        quality,
        enrollmentDate: fingerprintTemplate.createdAt
      }
    });

  } catch (error) {
    console.error('Fingerprint enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll fingerprint',
      details: error.message
    });
  }
};

/**
 * Verify fingerprint for attendance
 */
exports.verifyFingerprint = async (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  try {
    // Check if member exists and has fingerprint
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!member.hasFingerprint) {
      return res.status(400).json({ 
        error: 'Member does not have fingerprint enrolled',
        details: 'Please enroll fingerprint first'
      });
    }

    // Get member's fingerprint template (no real device in mock mode)
    const fingerprintTemplate = await FingerprintTemplate.findOne({ 
      memberId, 
      status: 'active' 
    });

    if (!fingerprintTemplate) {
      return res.status(404).json({ 
        error: 'Fingerprint template not found',
        details: 'Member fingerprint template is missing or inactive'
      });
    }

    // Dev-friendly mock verification
    console.log('Simulating fingerprint verification for member:', memberId);
    const verificationResult = {
      success: true,
      confidence: 95,
      match: true
    };

    if (verificationResult.success && verificationResult.match) {
      // Mark attendance
      await Attendance.create({
        memberId,
        attendanceDate: new Date(),
        status: 'Present',
        authMethod: 'fingerprint'
      });

      res.json({
        success: true,
        message: 'Fingerprint verified and attendance marked',
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          attendanceDate: new Date(),
          authMethod: 'fingerprint',
          confidence: verificationResult.confidence
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Fingerprint verification failed',
        details: 'Fingerprint does not match'
      });
    }

  } catch (error) {
    console.error('Fingerprint verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify fingerprint',
      details: error.message
    });
  }
};

/**
 * Get member fingerprint status
 */
exports.getFingerprintStatus = async (req, res) => {
  const { memberId } = req.params;

  try {
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const fingerprintTemplate = await FingerprintTemplate.findOne({ 
      memberId, 
      status: 'active' 
    });

    res.json({
      memberId: member._id,
      memberName: `${member.firstName} ${member.lastName}`,
      hasFingerprint: member.hasFingerprint,
      fingerprintEnrolled: member.fingerprintEnrolled,
      authMethods: member.authMethods,
      fingerprintDetails: fingerprintTemplate ? {
        fingerPosition: fingerprintTemplate.fingerPosition,
        quality: fingerprintTemplate.quality,
        enrollmentDate: fingerprintTemplate.createdAt,
        deviceInfo: fingerprintTemplate.deviceInfo
      } : null
    });

  } catch (error) {
    console.error('Get fingerprint status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fingerprint status',
      details: error.message
    });
  }
};

/**
 * Delete member fingerprint
 */
exports.deleteFingerprint = async (req, res) => {
  const { memberId } = req.params;

  try {
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Delete fingerprint template
    const result = await FingerprintTemplate.deleteOne({ memberId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Fingerprint template not found',
        details: 'Member does not have fingerprint enrolled'
      });
    }

    // Update member record
    member.hasFingerprint = false;
    member.fingerprintEnrolled = null;
    member.authMethods.fingerprint = false;
    await member.save();

    res.json({
      success: true,
      message: 'Fingerprint deleted successfully',
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`
      }
    });

  } catch (error) {
    console.error('Delete fingerprint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fingerprint',
      details: error.message
    });
  }
};

/**
 * Get all members with fingerprint status
 */
exports.getMembersWithFingerprint = async (req, res) => {
  try {
    const members = await Member.find({}).select('firstName lastName hasFingerprint fingerprintEnrolled authMethods');
    
    const membersWithStatus = await Promise.all(
      members.map(async (member) => {
        const fingerprintTemplate = await FingerprintTemplate.findOne({ 
          memberId: member._id, 
          status: 'active' 
        });

        return {
          memberId: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          hasFingerprint: member.hasFingerprint,
          fingerprintEnrolled: member.fingerprintEnrolled,
          authMethods: member.authMethods,
          fingerprintDetails: fingerprintTemplate ? {
            fingerPosition: fingerprintTemplate.fingerPosition,
            quality: fingerprintTemplate.quality,
            enrollmentDate: fingerprintTemplate.createdAt
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: membersWithStatus,
      summary: {
        total: members.length,
        withFingerprint: members.filter(m => m.hasFingerprint).length,
        withoutFingerprint: members.filter(m => !m.hasFingerprint).length
      }
    });

  } catch (error) {
    console.error('Get members with fingerprint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get members with fingerprint status',
      details: error.message
    });
  }
};

