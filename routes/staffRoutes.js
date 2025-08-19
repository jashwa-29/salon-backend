const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");

// Staff CRUD operations
router.post("/staff", staffController.createStaff);
router.get("/staff", staffController.getAllStaff);
router.get("/staff/:id", staffController.getStaffById);
router.put("/staff/:id", staffController.updateStaff);
router.delete("/staff/:id", staffController.deleteStaff);

// Staff attendance summary
router.get("/staff/:id/attendance/summary", staffController.getAttendanceSummary);

// Attendance operations
router.post("/attendance", staffController.recordAttendance);
router.get("/attendance", staffController.getAttendanceByDateRange);
router.get("/attendance/today", staffController.getTodaysAttendanceStatus);

// Holiday management
router.post("/attendance/holiday", staffController.declareHoliday);
router.delete("/attendance/holiday", staffController.deleteHoliday);

module.exports = router;