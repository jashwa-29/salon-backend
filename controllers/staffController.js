const Staff = require("../models/Staff");
const Attendance = require("../models/Attendance");
const mongoose = require('mongoose');

// Helper function to validate date format
function isValidDate(dateString) {
  return !isNaN(Date.parse(dateString)) && 
         /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

// Helper function to convert local time to UTC
function convertToUTC(date, timeString) {
  if (!timeString) return new Date(date);
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const localDate = new Date(date);
  localDate.setHours(hours, minutes || 0, 0, 0);
  
  // Convert to UTC
  return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
}

// Helper function to get current UTC date (start of day)
function getCurrentUTCDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Helper function to get current UTC datetime
function getCurrentUTCDateTime() {
  return new Date();
}

// Create a new staff member
exports.createStaff = async (req, res) => {
  try {
    // Validate request body
    if (!req.body.name || !req.body.phone || !req.body.aadhaar || !req.body.dob || !req.body.gender || !req.body.role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const staff = new Staff(req.body);
    await staff.save();
    
    res.status(201).json({
      success: true,
      data: staff,
      message: 'Staff member created successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ 
        success: false,
        error: errors.join(', ')
      });
    } else if (err.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: 'Duplicate value entered. Phone or Aadhaar already exists'
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Get all staff members with optional filtering
exports.getAllStaff = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive) filter.isActive = isActive === 'true';
    
    const staff = await Staff.find(filter).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Get a single staff member by ID
exports.getStaffById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid staff ID' 
      });
    }
    
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Update staff details
exports.updateStaff = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid staff ID' 
      });
    }
    
    // Prevent updating immutable fields
    if (req.body.joiningDate || req.body._id) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot update joining date or ID' 
      });
    }
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { 
        new: true,
        runValidators: true
      }
    );
    
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: staff,
      message: 'Staff member updated successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ 
        success: false,
        error: errors.join(', ')
      });
    } else if (err.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: 'Duplicate value entered. Phone or Aadhaar already exists'
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Delete a staff member and their attendance records
exports.deleteStaff = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid staff ID' 
      });
    }

    // First, delete attendance records
    await Attendance.deleteMany({ staffId: req.params.id });

    // Then, delete staff member
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff member and all associated attendance records deleted successfully'
    });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: err.message 
    });
  }
};

// Record attendance (check-in/check-out) with UTC timezone handling
exports.recordAttendance = async (req, res) => {
  try {
    const { staffId, action, time, date } = req.body;
    
    // Validate required fields
    if (!staffId || !action) {
      return res.status(400).json({ 
        success: false,
        error: 'Staff ID and action are required',
        example: { staffId: "65a1b2c3d4e5f6g7h8i9j0k", action: "checkIn" }
      });
    }
    
    // Validate action
    if (!['checkIn', 'checkOut'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        error: 'Action must be either checkIn or checkOut',
        validActions: ["checkIn", "checkOut"]
      });
    }
    
    // Validate staff ID
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid staff ID format',
        example: "65a1b2c3d4e5f6g7h8i9j0k"
      });
    }
    
    // Check if staff exists and is active
    const staff = await Staff.findById(staffId);
    if (!staff || !staff.isActive) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found or inactive',
        suggestion: 'Check staff ID or activate the staff member'
      });
    }
    
    // Date handling - allow manual date or use today (in UTC)
    let recordDate;
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format',
          correctFormat: 'YYYY-MM-DD',
          received: date
        });
      }
      // Parse date as UTC
      const [year, month, day] = date.split('-').map(Number);
      recordDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Use current UTC date
      recordDate = getCurrentUTCDate();
    }
    
    // Time handling with UTC conversion
    let recordTime;
    if (time) {
      // Validate time format (accepts both 12-hour and 24-hour formats)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s?[APap][mM])?$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid time format',
          validFormats: ["HH:MM", "HH:MM AM/PM"],
          example: { time: "09:30 AM" }
        });
      }
      
      // Parse time and convert to UTC
      let hours, minutes;
      const timeLower = time.toLowerCase();
      
      if (timeLower.includes('am') || timeLower.includes('pm')) {
        // 12-hour format
        const [timePart, period] = time.split(/(?=[APap][mM])/);
        [hours, minutes] = timePart.split(':').map(Number);
        
        if (period.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
      } else {
        // 24-hour format
        [hours, minutes] = time.split(':').map(Number);
      }
      
      // Validate time values
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid time values',
          validRange: { hours: "0-23", minutes: "0-59" }
        });
      }
      
      // Create date with local time, then convert to UTC
      const localDateTime = new Date(recordDate);
      localDateTime.setHours(hours, minutes || 0, 0, 0);
      
      // Convert to UTC
      recordTime = new Date(localDateTime.getTime() - (localDateTime.getTimezoneOffset() * 60000));
    } else {
      // Use current UTC time if not provided
      recordTime = getCurrentUTCDateTime();
    }
    
    // // Validate that time is not in the future (UTC comparison)
    // const currentUTCTime = getCurrentUTCDateTime();
    // if (recordTime > currentUTCTime) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Cannot record attendance for future time',
    //     currentUTCTime: currentUTCTime.toISOString(),
    //     providedTime: recordTime.toISOString(),
    //     suggestion: 'Check your timezone settings'
    //   });
    // }
    
    // Check for existing attendance record
    const existingRecord = await Attendance.findOne({ 
      staffId, 
      date: recordDate 
    });
    
    // Validate against duplicate actions
    if (existingRecord) {
      if (action === 'checkIn' && existingRecord.checkIn) {
        const existingTime = existingRecord.checkIn.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit'
        });
        return res.status(400).json({
          success: false,
          error: 'Already checked in today',
          existingCheckIn: existingTime + ' UTC',
          suggestion: 'Record check-out instead'
        });
      }
      
      if (action === 'checkOut') {
        if (!existingRecord.checkIn) {
          return res.status(400).json({
            success: false,
            error: 'Cannot check out without checking in first',
            suggestion: 'Record check-in first'
          });
        }
        if (existingRecord.checkOut) {
          const existingTime = existingRecord.checkOut.toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit'
          });
          return res.status(400).json({
            success: false,
            error: 'Already checked out today',
            existingCheckOut: existingTime + ' UTC'
          });
        }
      }
    }
    
    // Create or update attendance record
    let attendance = existingRecord || new Attendance({ 
      staffId, 
      date: recordDate,
      status: 'Present' // Default status
    });
    
    // Set the action time
    attendance[action] = recordTime;
    
    await attendance.save();
    
    // Format response with UTC times
    const formattedDate = recordDate.toISOString().split('T')[0];
    const formattedTime = recordTime.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          role: staff.role
        },
        date: formattedDate,
        action,
        time: formattedTime + ' UTC',
        status: attendance.status
      },
      message: `Attendance ${action} recorded successfully for ${formattedDate} at ${formattedTime} UTC`
    });
    
  } catch (err) {
    console.error('Attendance recording error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: errors.join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to record attendance',
      ...(process.env.NODE_ENV === 'development' && { debug: err.message })
    });
  }
};

exports.declareHoliday = async (req, res) => {
  try {
    const { date, notes } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false,
        error: 'Date is required' 
      });
    }
    
    if (!isValidDate(date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format' 
      });
    }
    
    // Parse date as UTC
    const [year, month, day] = date.split('-').map(Number);
    const holidayDate = new Date(Date.UTC(year, month - 1, day));
    
    const today = getCurrentUTCDate();
    
    // Prevent declaring holidays in the past (except today)
    if (holidayDate < today) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot declare holiday for past dates' 
      });
    }
    
    // Get all active staff
    const activeStaff = await Staff.find({ isActive: true });
    
    // Prepare bulk operations
    const bulkOps = activeStaff.map(staff => ({
      updateOne: {
        filter: { 
          staffId: staff._id, 
          date: holidayDate 
        },
        update: { 
          $set: { 
            status: "Holiday",
            isHoliday: true,
            notes: notes || "Public Holiday",
            checkIn: null,
            checkOut: null
          } 
        },
        upsert: true
      }
    }));
    
    // Execute bulk write
    const result = await Attendance.bulkWrite(bulkOps);
    
    res.status(200).json({
      success: true,
      data: {
        date: holidayDate.toISOString().split('T')[0],
        staffCount: activeStaff.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount
      },
      message: `Holiday declared for ${holidayDate.toISOString().split('T')[0]} (UTC)`
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Remove holiday declaration
exports.deleteHoliday = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false,
        error: 'Date is required' 
      });
    }
    
    if (!isValidDate(date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format' 
      });
    }
    
    // Parse date as UTC
    const [year, month, day] = date.split('-').map(Number);
    const holidayDate = new Date(Date.UTC(year, month - 1, day));
    
    const today = getCurrentUTCDate();
    
    // Prevent deleting holidays in the past
    if (holidayDate < today) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete holiday for past dates' 
      });
    }
    
    // Delete all holiday records for this date
    const result = await Attendance.deleteMany({ 
      date: holidayDate, 
      isHoliday: true 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No holiday found for the specified date' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        date: holidayDate.toISOString().split('T')[0],
        deletedCount: result.deletedCount
      },
      message: `Holiday removed for ${holidayDate.toISOString().split('T')[0]} (UTC)`
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Get attendance by date range (UTC dates)
exports.getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, staffId } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Both startDate and endDate are required',
        example: '/attendance?startDate=2024-01-01&endDate=2024-01-31'
      });
    }

    // Validate date formats
    const isValidStartDate = isValidDate(startDate);
    const isValidEndDate = isValidDate(endDate);
    
    if (!isValidStartDate || !isValidEndDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        correctFormat: 'YYYY-MM-DD',
        received: {
          startDate,
          endDate
        }
      });
    }

    // Convert to UTC Date objects
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
    
    // Validate date range
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before endDate',
        received: {
          startDate,
          endDate
        }
      });
    }

    // Build query
    const query = {
      date: {
        $gte: start,
        $lte: end
      }
    };

    // Add staff filter if provided
    if (staffId) {
      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid staff ID format',
          example: '65a1b2c3d4e5f6g7h8i9j0k'
        });
      }
      query.staffId = new mongoose.Types.ObjectId(staffId);
    }

    // Execute query
    const attendance = await Attendance.find(query)
      .populate('staffId', 'name role phone')
      .sort({ date: 1, 'staffId.name': 1 })
      .lean();

    // Format dates for better readability (convert UTC to local time for display)
    const formattedResults = attendance.map(record => ({
      ...record,
      date: record.date.toISOString().split('T')[0],
      checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST' : null,
      checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' IST' : null
    }));

    res.status(200).json({
      success: true,
      count: formattedResults.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        timezone: 'UTC'
      },
      data: formattedResults
    });
    console.log('Attendance records retrieved successfully:', formattedResults);

  } catch (err) {
    console.error('Error in getAttendanceByDateRange:', err);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendance records',
      systemError: process.env.NODE_ENV === 'development' ? err.message : undefined,
      suggestion: 'Check your query parameters and try again'
    });
  }
};

// Get staff attendance summary (UTC dates)
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const staffId = req.params.id;
    
    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid staff ID is required' 
      });
    }
    
    // Default to current month/year if not provided
    const currentDate = new Date();
    const queryMonth = month ? parseInt(month) : currentDate.getUTCMonth() + 1;
    const queryYear = year ? parseInt(year) : currentDate.getUTCFullYear();
    
    // Validate month/year
    if (queryMonth < 1 || queryMonth > 12 || queryYear < 2000 || queryYear > 2100) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid month or year' 
      });
    }
    
    // Calculate date range for the month (UTC)
    const startDate = new Date(Date.UTC(queryYear, queryMonth - 1, 1));
    const endDate = new Date(Date.UTC(queryYear, queryMonth, 0, 23, 59, 59, 999));
    
    // Get all attendance records for the staff member in the specified month
    const attendanceRecords = await Attendance.find({
      staffId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    // Calculate summary
    const summary = {
      staffId,
      month: queryMonth,
      year: queryYear,
      totalDays: endDate.getUTCDate(),
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      holidays: 0,
      workingHours: 0
    };
    
    attendanceRecords.forEach(record => {
      if (record.isHoliday) {
        summary.holidays++;
      } else {
        switch (record.status) {
          case 'Present':
            summary.present++;
            break;
          case 'Absent':
            summary.absent++;
            break;
          case 'Late':
            summary.late++;
            break;
          case 'Half-Day':
            summary.halfDay++;
            break;
        }
      }
      
      if (record.workingHours) {
        summary.workingHours += parseFloat(record.workingHours);
      }
    });
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Get today's attendance status (present/absent lists) with UTC
exports.getTodaysAttendanceStatus = async (req, res) => {
  try {
    const today = getCurrentUTCDate();
    
    // Get all active staff
    const activeStaff = await Staff.find({ isActive: true }).select('_id name role');
    
    // Get today's attendance records
    const todaysAttendance = await Attendance.find({ 
      date: today 
    }).populate('staffId', 'name role');
    
    // Create sets for present and absent staff
    const presentStaff = [];
    const absentStaff = [];
    const holidayStaff = [];
    
    // Create a map of staff who have attendance records today
    const attendedStaffMap = new Map();
    todaysAttendance.forEach(record => {
      attendedStaffMap.set(record.staffId._id.toString(), record);
    });
    
    // Categorize each active staff member
    activeStaff.forEach(staff => {
      const staffId = staff._id.toString();
      const attendanceRecord = attendedStaffMap.get(staffId);
      
      if (attendanceRecord) {
        if (attendanceRecord.isHoliday) {
          holidayStaff.push({
            staffId: staff._id,
            name: staff.name,
            role: staff.role,
            status: 'Holiday',
            checkIn: attendanceRecord.checkIn ? new Date(attendanceRecord.checkIn).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' IST' : null,
            checkOut: attendanceRecord.checkOut ? new Date(attendanceRecord.checkOut).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' IST' : null
          });
        } else {
          presentStaff.push({
            staffId: staff._id,
            name: staff.name,
            role: staff.role,
            status: attendanceRecord.status,
            checkIn: attendanceRecord.checkIn ? new Date(attendanceRecord.checkIn).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' IST' : null,
            checkOut: attendanceRecord.checkOut ? new Date(attendanceRecord.checkOut).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' IST' : null,
            workingHours: attendanceRecord.workingHours
          });
        }
      } else {
        absentStaff.push({
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          status: 'Absent'
        });
      }
    });
    
    // Format today's date for display (convert UTC to IST)
    const istDate = new Date(today.getTime() + (5.5 * 60 * 60 * 1000)); // Convert UTC to IST
    const formattedDate = istDate.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    res.status(200).json({
      success: true,
      data: {
        date: formattedDate + ' (IST)',
        utcDate: today.toISOString().split('T')[0] + ' (UTC)',
        totalStaff: activeStaff.length,
        presentCount: presentStaff.length,
        absentCount: absentStaff.length,
        holidayCount: holidayStaff.length,
        presentStaff,
        absentStaff,
        holidayStaff
      },
      message: `Today's attendance status retrieved successfully`
    });
    
  } catch (err) {
    console.error('Error in getTodaysAttendanceStatus:', err);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve today\'s attendance status',
      systemError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};