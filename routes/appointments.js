const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private
router.post(
  '/',
  [
    authMiddleware,
    [
      check('appointmentDate', 'Date is required').isISO8601().toDate(),
      check('timeSlot', 'Time slot is required').isIn([
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
      ]),
      check('services', 'Services must be an array of IDs').optional().isArray(),
      check('services.*', 'Invalid service ID').optional().isMongoId(),
      check('combo', 'Invalid combo ID').optional().isMongoId()
    ]
  ],
  appointmentController.createAppointment
);

// @route   GET /api/appointments
// @desc    Get all appointments (admin only)
// @access  Private/Admin
router.get('/', [authMiddleware, adminMiddleware], appointmentController.getAppointments);

// @route   GET /api/appointments/my
// @desc    Get current user's appointments
// @access  Private
router.get('/my', authMiddleware, appointmentController.getMyAppointments);

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (admin only)
// @access  Private/Admin
router.put(
  '/:id/status',
  [
    authMiddleware,
    adminMiddleware,
    check('status', 'Invalid status').isIn(['pending', 'confirmed', 'completed', 'cancelled' , 'rescheduled'])
  ],
  appointmentController.updateAppointmentStatus
);

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment
// @access  Private
router.put('/:id/cancel', authMiddleware, appointmentController.cancelAppointment);

// @route   PUT /api/appointments/:id/reschedule
// @desc    Reschedule appointment (admin only)
// @access  Private/Admin
router.put(
  '/:id/reschedule',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('appointmentDate', 'Date is required').isISO8601().toDate(),
      check('timeSlot', 'Time slot is required').isIn([
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
      ])
    ]
  ],
  appointmentController.rescheduleAppointment
);


// router.get('/today', auth, admin, appointmentsController.getTodaysAppointments);
router.get('/today', [authMiddleware, adminMiddleware], appointmentController.getTodaysAppointments);

module.exports = router;