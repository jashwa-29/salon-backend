const Staff = require("../models/Staff");
const Attendance = require("../models/Attendance");
const mongoose = require('mongoose');

// Helper function to validate date format
// Helper function
function isValidDate(dateString) {
  return !isNaN(Date.parse(dateString)) && 
         /^\d{4}-\d{2}-\d{2}$/.test(dateString);
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


// Record attendance (check-in/check-out)
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
    
    // Date handling - allow manual date or use today
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
      recordDate = new Date(date);
      recordDate.setHours(0, 0, 0, 0); // Normalize to start of day
    } else {
      recordDate = new Date();
      recordDate.setHours(0, 0, 0, 0);
    }
    
    // Time handling
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
      
      // Parse time
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
      
      // Combine date and time
      recordTime = new Date(recordDate);
      recordTime.setHours(hours, minutes || 0, 0, 0);
    } else {
      // Use current time if not provided
      recordTime = new Date();
    }
    
    // Check for existing attendance record
    const existingRecord = await Attendance.findOne({ 
      staffId, 
      date: recordDate 
    });
    
    // Validate against duplicate actions
    if (existingRecord) {
      if (action === 'checkIn' && existingRecord.checkIn) {
        const existingTime = existingRecord.checkIn.toLocaleTimeString();
        return res.status(400).json({
          success: false,
          error: 'Already checked in today',
          existingCheckIn: existingTime,
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
          const existingTime = existingRecord.checkOut.toLocaleTimeString();
          return res.status(400).json({
            success: false,
            error: 'Already checked out today',
            existingCheckOut: existingTime
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
    
    // Update status if checking out late
    // if (action === 'checkOut') {
    //   const checkInTime = attendance.checkIn.getHours() * 60 + attendance.checkIn.getMinutes();
    //   attendance.status = checkInTime > 10 * 60 ? 'Late' : 'Present';
    // }
    
    await attendance.save();
    
    // Format response
    const formattedDate = recordDate.toISOString().split('T')[0];
    const formattedTime = recordTime.toLocaleTimeString('en-US', {
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
        time: formattedTime,
        status: attendance.status
      },
      message: `Attendance ${action} recorded successfully for ${formattedDate} at ${formattedTime}`
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
    
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
        date: holidayDate,
        staffCount: activeStaff.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount
      },
      message: `Holiday declared for ${holidayDate.toDateString()}`
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
    
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
        date: holidayDate,
        deletedCount: result.deletedCount
      },
      message: `Holiday removed for ${holidayDate.toDateString()}`
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// Get attendance by date range
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

    // Convert to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
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
      .lean(); // Convert to plain JS objects

    // Format dates for better readability
    const formattedResults = attendance.map(record => ({
      ...record,
      date: record.date.toISOString().split('T')[0],
      checkIn: record.checkIn?.toLocaleTimeString(),
      checkOut: record.checkOut?.toLocaleTimeString()
    }));

    res.status(200).json({
      success: true,
      count: formattedResults.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      data: formattedResults
    });

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

// Get staff attendance summary
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
    const queryMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const queryYear = year ? parseInt(year) : currentDate.getFullYear();
    
    // Validate month/year
    if (queryMonth < 1 || queryMonth > 12 || queryYear < 2000 || queryYear > 2100) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid month or year' 
      });
    }
    
    // Calculate date range for the month
    const startDate = new Date(queryYear, queryMonth - 1, 1);
    const endDate = new Date(queryYear, queryMonth, 0);
    
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
      totalDays: endDate.getDate(),
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


// Get today's attendance status (present/absent lists)
exports.getTodaysAttendanceStatus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
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
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut
          });
        } else {
          presentStaff.push({
            staffId: staff._id,
            name: staff.name,
            role: staff.role,
            status: attendanceRecord.status,
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut,
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
    
    // Format today's date for display
    const formattedDate = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    res.status(200).json({
      success: true,
      data: {
        date: formattedDate,
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