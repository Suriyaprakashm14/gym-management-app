const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const Member = require("../models/member");
const Attendance = require("../models/attendance");
const User = require("../models/user");
const Gym = require("../models/gym");
const Branch = require("../models/branch");
const { checkMembershipStatus } = require("../middleware/membershipValidation");

const LUXAND_TOKEN = process.env.LUXAND_TOKEN;

// Multer middleware for image upload
const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single('image');

exports.markAttendanceWithFace = async (req, res) => {
  const { memberId } = req.body;

  if (!req.file || !memberId) {
    return res.status(400).json({ error: "Image file and memberId are required" });
  }

  try {
    console.log("===== FACE ATTENDANCE REQUEST =====");
    console.log("Member ID:", memberId);
    console.log("Looking for member with ID:", memberId);
    console.log("ID type:", typeof memberId, "Length:", memberId.length);
    
    // Try to find member by ID (works for both ObjectId and String IDs)
    const member = await Member.findById(memberId);
    
    if (!member) {
      console.log("Member not found with ID:", memberId);
      
      // Try alternative search methods for debugging
      const allMembers = await Member.find({}).limit(5);
      console.log("Sample member IDs in database:", allMembers.map(m => ({ id: m._id, type: typeof m._id })));
      
      return res.status(404).json({ 
        error: "Member not found",
        details: `No member found with ID: ${memberId}. Please check if the member exists and the ID format is correct.`
      });
    }

    if (!member.personId) {
      console.log("Member found but no personId:", member.firstName, member.lastName);
      return res.status(404).json({ 
        error: "Reference image not found",
        details: `Member ${member.firstName} ${member.lastName} does not have a reference image for face recognition. Please update the member's profile with a new image.`
      });
    }

    console.log("Member found:", member.firstName, member.lastName);
    console.log("Stored member.personId:", member.personId);

    const formData = new FormData();
    formData.append("photo", req.file.buffer, { filename: req.file.originalname });

    console.log("Sending image to Luxand API (search v2)...");
    const response = await axios.post(
      "https://api.luxand.cloud/photo/search/v2",
      formData,
      {
        headers: {
          token: LUXAND_TOKEN,
          ...formData.getHeaders(),
        },
      }
    );

    const matches = response.data;
    console.log("Luxand response (search results):", matches);

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ error: "No face detected in the image" });
    }

    // Match using uuid
    const match = matches.find(f => f.uuid === member.personId);

    if (match) {
      console.log("Match found with confidence:", match.confidence || 95);
      await Attendance.create({
        memberId,
        attendanceDate: new Date(), // allow multiple entries per day
        status: "Present",
        authMethod: "face_recognition",
        authData: {
          confidence: match.confidence || 95,
          deviceInfo: {
            deviceIP: "camera",
            deviceModel: "Luxand Face Recognition",
            deviceType: "camera"
          }
        },
        location: {
          branchId: member.branchId,
          deviceId: "face_recognition_camera"
        }
      });
      console.log("Attendance record created successfully.");
      return res.json({ 
        success: true, 
        message: "Attendance marked successfully with face recognition",
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          authMethod: "face_recognition",
          confidence: match.confidence || 95,
          attendanceDate: new Date()
        }
      });
    } else {
      return res.status(401).json({ error: "Face does not match" });
    }
  } catch (error) {
    console.error("Luxand error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Server error during attendance check" });
  }
};

// Helper endpoint to check if member has reference image
exports.checkMemberReference = async (req, res) => {
  const { memberId } = req.params;

  try {
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ 
        error: "Member not found",
        details: `No member found with ID: ${memberId}`
      });
    }

    const hasReferenceImage = !!member.personId;
    
    res.json({
      memberId: member._id,
      firstName: member.firstName,
      lastName: member.lastName,
      hasReferenceImage,
      personId: member.personId || null,
      message: hasReferenceImage 
        ? "Member has reference image for face recognition"
        : "Member does not have reference image. Please update member profile with a new image."
    });
  } catch (error) {
    console.error("Error checking member reference:", error);
    res.status(500).json({ error: "Server error while checking member reference" });
  }
};

// Helper endpoint to enroll/register a member's face for recognition
exports.enrollMemberFace = async (req, res) => {
  const { memberId } = req.body;

  if (!req.file || !memberId) {
    return res.status(400).json({ error: "Image file and memberId are required" });
  }

  try {
    console.log("Enrolling face for member ID:", memberId);
    
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ 
        error: "Member not found",
        details: `No member found with ID: ${memberId}`
      });
    }

    // Create form data for Luxand API
    const formData = new FormData();
    formData.append("photo", req.file.buffer, { filename: req.file.originalname });
    // Luxand expects a person name for the record
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || `Member ${member._id}`;
    formData.append("name", fullName);

    // Call Luxand API to add person
    const response = await axios.post(
      "https://api.luxand.cloud/person",
      formData,
      {
        headers: {
          token: LUXAND_TOKEN,
          ...formData.getHeaders(),
        },
      }
    );

    const personData = response.data;
    console.log("Luxand person creation response:", personData);

    if (!personData.uuid) {
      return res.status(400).json({ 
        error: personData?.message || "Failed to create person in face recognition system",
        details: personData
      });
    }

    // Update member with personId
    member.personId = personData.uuid;
    member.authMethods.faceRecognition = true;
    await member.save();

    return res.json({
      success: true,
      message: "Face enrolled successfully",
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        personId: personData.uuid,
        faceRecognitionEnabled: true
      }
    });

  } catch (error) {
    console.error("Face enrollment error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: "Invalid API token",
        message: "Face recognition service is not properly configured."
      });
    }
    
    return res.status(500).json({ 
      error: "Server error during face enrollment",
      message: "An error occurred while enrolling the face. Please try again."
    });
  }
};

// Helper endpoint to list all members (for debugging ID issues)
exports.listAllMembers = async (req, res) => {
  try {
    const members = await Member.find({})
      .select('_id firstName lastName role')
      .limit(20); // Limit to first 20 members
    
    const memberList = members.map(member => ({
      id: member._id,
      idType: typeof member._id,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role
    }));
    
    res.json({
      success: true,
      message: `Found ${members.length} members (showing first 20)`,
      data: {
        totalMembers: await Member.countDocuments(),
        members: memberList
      }
    });
  } catch (error) {
    console.error("Error listing members:", error);
    res.status(500).json({ error: "Server error while listing members" });
  }
};

// Dual authentication: Face + Fingerprint
exports.markAttendanceDualAuth = async (req, res) => {
  const { memberId } = req.body;

  if (!req.file || !memberId) {
    return res.status(400).json({ error: "Image file and memberId are required" });
  }

  try {
    console.log("Dual authentication for member ID:", memberId);
    console.log("ID type:", typeof memberId, "Length:", memberId.length);
    
    const member = await Member.findById(memberId);
    
    if (!member) {
      console.log("Member not found with ID:", memberId);
      
      // Try alternative search methods for debugging
      const allMembers = await Member.find({}).limit(5);
      console.log("Sample member IDs in database:", allMembers.map(m => ({ id: m._id, type: typeof m._id })));
      
      return res.status(404).json({ 
        error: "Member not found",
        details: `No member found with ID: ${memberId}. Please check if the member exists and the ID format is correct.`
      });
    }

    // Check if member has both authentication methods
    if (!member.personId) {
      return res.status(400).json({ 
        error: "Face recognition not available",
        details: `Member ${member.firstName} ${member.lastName} does not have face recognition enrolled.`
      });
    }

    if (!member.hasFingerprint) {
      return res.status(400).json({ 
        error: "Fingerprint not available",
        details: `Member ${member.firstName} ${member.lastName} does not have fingerprint enrolled.`
      });
    }

    // Step 1: Face Recognition
    console.log("Step 1: Verifying face recognition...");
    const formData = new FormData();
    formData.append("photo", req.file.buffer, { filename: req.file.originalname });

    const faceResponse = await axios.post(
      "https://api.luxand.cloud/photo/search/v2",
      formData,
      {
        headers: {
          token: LUXAND_TOKEN,
          ...formData.getHeaders(),
        },
      }
    );

    const faceMatches = faceResponse.data;
    console.log("Face recognition response:", faceMatches);

    if (!Array.isArray(faceMatches) || faceMatches.length === 0) {
      return res.status(400).json({ error: "No face detected in the image" });
    }

    const faceMatch = faceMatches.find(f => f.uuid === member.personId);
    if (!faceMatch) {
      return res.status(401).json({ error: "Face recognition failed" });
    }

    // Step 2: Fingerprint Verification
    console.log("Step 2: Verifying fingerprint...");
    const ZKJUBAER = require('zk-jubaer');
    const device = new ZKJUBAER(
      process.env.ZKFINGER_IP || '192.168.1.201', // Device ip
      parseInt(process.env.ZKFINGER_PORT) || 4370, // Device PORT
      parseInt(process.env.ZKFINGER_TIMEOUT) || 5000, // Device TIMEOUT
      process.env.ZKFINGER_PASSWORD || 0 // Device PASSWORD
    );

    await device.createSocket();
    
    // Note: In a real implementation, you would capture and verify the fingerprint
    // This is a simplified version for demonstration
    const fingerprintVerified = true; // Replace with actual fingerprint verification
    
    await device.disconnect();

    if (!fingerprintVerified) {
      return res.status(401).json({ error: "Fingerprint verification failed" });
    }

    // Both authentications successful - mark attendance
    await Attendance.create({
      memberId,
      attendanceDate: new Date(),
      status: "Present",
      authMethod: "dual_auth",
      authData: {
        confidence: faceMatch.confidence || 95,
        deviceInfo: {
          deviceIP: process.env.ZKFINGER_IP || '192.168.1.201',
          deviceModel: "ZKFinger + Luxand Face Recognition",
          deviceType: "dual_biometric"
        }
      },
      location: {
        branchId: member.branchId,
        deviceId: "dual_biometric_station"
      }
    });

    res.json({ 
      success: true, 
      message: "Attendance marked successfully with dual authentication",
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        authMethod: "dual_auth",
        faceConfidence: faceMatch.confidence || 95,
        fingerprintVerified: true,
        attendanceDate: new Date(),
        securityLevel: "high"
      }
    });

  } catch (error) {
    console.error("Dual authentication error:", error);
    res.status(500).json({ error: "Server error during dual authentication" });
  }
};

// Face recognition attendance without member ID - only photo upload (no authentication required)
exports.markAttendanceWithPhotoOnly = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Photo file is required" });
  }

  try {
    console.log("Processing face recognition attendance with photo only...");

    // Create form data for Luxand API
    const formData = new FormData();
    formData.append("photo", req.file.buffer, { filename: req.file.originalname });

    // Call Luxand API to search for faces
    const response = await axios.post(
      "https://api.luxand.cloud/photo/search/v2",
      formData,
      {
        headers: {
          token: LUXAND_TOKEN,
          ...formData.getHeaders(),
        },
      }
    );

    const matches = response.data;
    console.log("Luxand search response:", matches);

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ 
        error: "No face detected in the image",
        message: "Please ensure the photo contains a clear face and try again."
      });
    }

    // Find the best match (highest confidence)
    const bestMatch = matches.reduce((prev, current) => 
      (prev.confidence > current.confidence) ? prev : current
    );

    console.log("Best match found:", bestMatch);

    // Find member by personId (Luxand UUID) - no authentication required
    const member = await Member.findOne({ personId: bestMatch.uuid });
    
    if (!member) {
      return res.status(404).json({ 
        error: "Person not recognized",
        message: "The face in the photo is not registered in our system. Please contact your gym owner or manager to register your face.",
        details: {
          detectedFaces: matches.length,
          bestMatchConfidence: bestMatch.confidence
        }
      });
    }

    // Validate membership using our comprehensive validation
    const membershipValidation = await checkMembershipStatus(member._id);
    if (!membershipValidation.isValid) {
      return res.status(403).json(membershipValidation);
    }

    // Check if member already has attendance for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      memberId: member._id,
      attendanceDate: { $gte: today, $lt: tomorrow },
      status: "Present"
    });

    if (existingAttendance) {
      return res.status(200).json({
        success: true,
        message: "Attendance already marked for today",
        data: {
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          authMethod: "face_recognition",
          confidence: bestMatch.confidence,
          attendanceDate: existingAttendance.attendanceDate,
          alreadyMarked: true
        }
      });
    }

    // Mark attendance
    const attendanceRecord = await Attendance.create({
      gymId: member.gymId,
      memberId: member._id,
      attendanceDate: new Date(),
      status: "Present",
      authMethod: "face_recognition",
      authData: {
        confidence: bestMatch.confidence,
        deviceInfo: {
          deviceIP: req.ip || "unknown",
          deviceModel: "Luxand Face Recognition",
          deviceType: "camera"
        }
      },
      location: {
        branchId: member.branchId,
        deviceId: "face_recognition_camera"
      },
      checkInTime: new Date()
    });

    return res.json({ 
      success: true, 
      message: "Attendance marked successfully",
      data: {
        memberId: member._id,
        memberName: `${member.firstName} ${member.lastName}`,
        authMethod: "face_recognition",
        confidence: bestMatch.confidence,
        attendanceDate: attendanceRecord.attendanceDate,
        attendanceId: attendanceRecord._id
      }
    });

  } catch (error) {
    console.error("Face recognition attendance error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: "Invalid API token",
        message: "Face recognition service is not properly configured. Please contact your gym owner or manager."
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many requests to face recognition service. Please try again later."
      });
    }
    
    return res.status(500).json({ 
      error: "Server error during face recognition",
      message: "An error occurred while processing the photo. Please try again."
    });
  }
};

// GET endpoint to check membership status for a member
exports.checkMembershipStatus = async (req, res) => {
  try {
    const { memberId } = req.params;
    
    if (!memberId) {
      return res.status(400).json({
        error: 'Member ID required',
        message: 'Member ID is required to check membership status'
      });
    }

    const membershipValidation = await checkMembershipStatus(memberId);
    
    if (membershipValidation.isValid) {
      res.json({
        success: true,
        message: 'Membership is valid and active',
        data: {
          memberId: membershipValidation.member._id,
          memberName: `${membershipValidation.member.firstName} ${membershipValidation.member.lastName}`,
          membershipStatus: 'active',
          membershipType: membershipValidation.member.membership.type,
          membershipStartDate: membershipValidation.member.membership.startDate,
          membershipEndDate: membershipValidation.member.membership.endDate,
          isActive: membershipValidation.member.isActive,
          status: membershipValidation.member.status
        }
      });
    } else {
      res.status(403).json(membershipValidation);
    }

  } catch (error) {
    console.error('Error checking membership status:', error);
    res.status(500).json({
      error: 'Server error while checking membership status',
      message: 'An error occurred while checking membership status. Please try again.'
    });
  }
};

// GET attendance report with present/absent members and counts
exports.getAttendanceReport = async (req, res) => {
  try {
    const { period = 'day', branchId, date } = req.query;
    
    // Calculate date range based on period
    let startDate, endDate;
    const today = new Date();
    
    switch (period) {
      case 'day':
        startDate = date ? new Date(date) : new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      default:
        return res.status(400).json({ error: "Invalid period. Use 'day', 'week', or 'month'" });
    }

    // Build query for attendance records
    const attendanceQuery = {
      attendanceDate: { $gte: startDate, $lte: endDate }
    };
    
    if (branchId) {
      attendanceQuery['location.branchId'] = branchId;
    }

    // Get all attendance records for the period
    const attendanceRecords = await Attendance.find(attendanceQuery)
      .populate('memberId', 'firstName lastName branchId')
      .populate('location.branchId', 'name')
      .sort({ attendanceDate: -1 });

    console.log(`Found ${attendanceRecords.length} attendance records for period ${period}`);

    // Get all members for the branch (to identify absent members)
    const memberQuery = branchId ? { branchId } : {};
    const allMembers = await Member.find(memberQuery)
      .populate('branchId', 'name')
      .select('firstName lastName branchId');


    // Process attendance data
    const memberAttendanceMap = new Map();
    const presentMembers = [];
    const absentMembers = [];

    // Group attendance by member and date
    attendanceRecords.forEach(record => {
      // Skip records with null memberId (orphaned attendance records)
      if (!record.memberId) {
        console.warn('Skipping attendance record with null memberId:', record._id);
        return;
      }
      
      const memberId = record.memberId._id ? record.memberId._id.toString() : record.memberId.toString();
      const dateKey = record.attendanceDate.toISOString().split('T')[0];
      
      if (!memberAttendanceMap.has(memberId)) {
        memberAttendanceMap.set(memberId, {
          member: record.memberId,
          attendance: new Map(),
          totalPresent: 0,
          totalDays: 0
        });
      }
      
      const memberData = memberAttendanceMap.get(memberId);
      memberData.attendance.set(dateKey, {
        status: record.status,
        time: record.attendanceDate,
        authMethod: record.authMethod,
        confidence: record.authData?.confidence
      });
      
      if (record.status === 'Present') {
        memberData.totalPresent++;
      }
      memberData.totalDays++;
    });

    // Generate list of all dates in the period
    const allDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Categorize members as present or absent
    allMembers.forEach(member => {
      // Skip null members
      if (!member || !member._id) {
        console.warn('Skipping null member in attendance report');
        return;
      }
      
      const memberId = member._id.toString();
      const memberData = memberAttendanceMap.get(memberId);
      
      if (memberData && memberData.totalPresent > 0) {
        // Member has at least one present record
        presentMembers.push({
          memberId: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          branchName: member.branchId?.name || 'Unknown',
          totalPresent: memberData.totalPresent,
          totalDays: memberData.totalDays,
          attendanceRate: ((memberData.totalPresent / memberData.totalDays) * 100).toFixed(1),
          lastAttendance: memberData.attendance.size > 0 ? 
            Array.from(memberData.attendance.values()).sort((a, b) => b.time - a.time)[0].time : null,
          attendanceDetails: Array.from(memberData.attendance.entries()).map(([date, data]) => ({
            date,
            status: data.status,
            time: data.time,
            authMethod: data.authMethod,
            confidence: data.confidence
          }))
        });
      } else {
        // Member has no attendance records (absent)
        absentMembers.push({
          memberId: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          branchName: member.branchId?.name || 'Unknown',
          totalPresent: 0,
          totalDays: allDates.length,
          attendanceRate: 0,
          lastAttendance: null,
          attendanceDetails: []
        });
      }
    });

    // Calculate summary statistics
    const totalMembers = allMembers.length;
    const totalPresent = presentMembers.length;
    const totalAbsent = absentMembers.length;
    const overallAttendanceRate = totalMembers > 0 ? ((totalPresent / totalMembers) * 100).toFixed(1) : 0;

    // Response data
    const response = {
      period,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      summary: {
        totalMembers,
        presentCount: totalPresent,
        absentCount: totalAbsent,
        overallAttendanceRate: parseFloat(overallAttendanceRate),
        totalDaysInPeriod: allDates.length
      },
      presentMembers,
      absentMembers,
      allDates
    };

    res.json({
      success: true,
      message: `Attendance report for ${period} period`,
      data: response
    });

  } catch (error) {
    console.error("Error getting attendance report:", error);
    res.status(500).json({ 
      error: "Server error while fetching attendance report",
      details: error.message 
    });
  }
};

// Weekly Attendance Report - Dedicated endpoint
exports.getWeeklyAttendanceReport = async (req, res) => {
  try {
    const { weekStart, branchId } = req.query;
    
    let startDate, endDate;
    
    if (weekStart) {
      // Use provided week start date
      startDate = new Date(weekStart);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default to current week (Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, so go back 6 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() + daysToMonday);
      startDate.setHours(0, 0, 0, 0);
    }
    
    // Calculate end date (7 days later)
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    
    let query = {
      attendanceDate: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Add branch filter if specified
    if (branchId) {
      query.branchId = branchId;
    }
    
    // Get all attendance records for the week
    const attendanceRecords = await Attendance.find(query)
      .populate('memberId', 'firstName lastName email')
      .sort({ attendanceDate: 1 });
    
    // Get all members for comparison
    let memberQuery = { role: 'member' };
    if (branchId) {
      memberQuery.branchId = branchId;
    }
    const allMembers = await Member.find(memberQuery);
    
    // Group attendance by date
    const dailyAttendance = {};
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Initialize daily attendance structure
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = weekDays[i];
      
      dailyAttendance[dateKey] = {
        date: dateKey,
        dayName,
        presentMembers: [],
        absentMembers: [],
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0
      };
    }
    
    // Process attendance records (guard against null/deleted memberId)
    attendanceRecords.forEach(record => {
      if (!record.memberId) return;
      const dateKey = record.attendanceDate.toISOString().split('T')[0];
      if (dailyAttendance[dateKey]) {
        const mid = record.memberId._id || record.memberId;
        const name = record.memberId.firstName != null && record.memberId.lastName != null
          ? `${record.memberId.firstName} ${record.memberId.lastName}`.trim()
          : 'Unknown';
        dailyAttendance[dateKey].presentMembers.push({
          memberId: mid,
          memberName: name || 'Unknown',
          checkInTime: record.attendanceDate,
          status: record.status
        });
      }
    });
    
    // Calculate absent members for each day
    Object.keys(dailyAttendance).forEach(dateKey => {
      const dayData = dailyAttendance[dateKey];
      const presentMemberIds = dayData.presentMembers.map(m => m.memberId.toString());
      
      dayData.absentMembers = allMembers
        .filter(member => !presentMemberIds.includes(member._id.toString()))
        .map(member => ({
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`
        }));
      
      dayData.presentCount = dayData.presentMembers.length;
      dayData.absentCount = dayData.absentMembers.length;
      dayData.attendanceRate = allMembers.length > 0 ? 
        Math.round((dayData.presentCount / allMembers.length) * 10000) / 100 : 0;
    });
    
    // Calculate weekly summary
    const totalPresentDays = Object.values(dailyAttendance).reduce((sum, day) => sum + day.presentCount, 0);
    const totalPossibleDays = allMembers.length * 7;
    const weeklyAttendanceRate = totalPossibleDays > 0 ? 
      Math.round((totalPresentDays / totalPossibleDays) * 10000) / 100 : 0;
    
    // Find most and least active days
    const dayStats = Object.values(dailyAttendance).map(day => ({
      date: day.date,
      dayName: day.dayName,
      attendanceRate: day.attendanceRate,
      presentCount: day.presentCount
    }));
    
    const mostActiveDay = dayStats.length > 0
      ? dayStats.reduce((max, day) => day.attendanceRate > max.attendanceRate ? day : max, dayStats[0])
      : { date: null, dayName: 'N/A', attendanceRate: 0, presentCount: 0 };
    const leastActiveDay = dayStats.length > 0
      ? dayStats.reduce((min, day) => day.attendanceRate < min.attendanceRate ? day : min, dayStats[0])
      : { date: null, dayName: 'N/A', attendanceRate: 0, presentCount: 0 };
    
    // Top attendees (members who came most days)
    const memberAttendanceCount = {};
    Object.values(dailyAttendance).forEach(day => {
      day.presentMembers.forEach(member => {
        const memberId = member.memberId.toString();
        memberAttendanceCount[memberId] = (memberAttendanceCount[memberId] || 0) + 1;
      });
    });
    
    const topAttendees = Object.entries(memberAttendanceCount)
      .map(([memberId, count]) => {
        const member = allMembers.find(m => m && m._id && m._id.toString() === memberId);
        const name = member && (member.firstName != null || member.lastName != null)
          ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
          : 'Unknown';
        return {
          memberId,
          memberName: name || 'Unknown',
          attendanceDays: count,
          attendanceRate: Math.round((count / 7) * 10000) / 100
        };
      })
      .sort((a, b) => b.attendanceDays - a.attendanceDays)
      .slice(0, 10);
    
    res.json({
      weekPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        weekStart: weekStart || startDate.toISOString().split('T')[0]
      },
      summary: {
        totalMembers: allMembers.length,
        totalPossibleDays: totalPossibleDays,
        totalPresentDays: totalPresentDays,
        weeklyAttendanceRate: weeklyAttendanceRate,
        mostActiveDay: mostActiveDay,
        leastActiveDay: leastActiveDay
      },
      dailyBreakdown: Object.values(dailyAttendance),
      topAttendees: topAttendees,
      branchId: branchId || 'All Branches'
    });
  } catch (error) {
    console.error('Error getting weekly attendance report:', error);
    res.status(500).json({ error: 'Server error while generating weekly attendance report' });
  }
};
