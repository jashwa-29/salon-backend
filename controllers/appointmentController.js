const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Combo = require('../models/Combo');
const { validationResult } = require('express-validator');

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { services, combo, appointmentDate, timeSlot, notes } = req.body;
    const customer = req.user.id;

    // Validate at least services or combo is provided
    if ((!services || services.length === 0) && !combo) {
      return res.status(400).json({ msg: 'Please select services or a combo' });
    }

    // Check for existing appointment at same date/time
    const existingAppointment = await Appointment.findOne({
    
      appointmentDate,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ msg: 'This time slot is already booked' });
    }

    // Validate services/combos exist and are active
    if (combo) {
      const comboExists = await Combo.findOne({ 
        _id: combo, 
        isActive: true 
      });
      if (!comboExists) {
        return res.status(400).json({ msg: 'Selected combo is not available' });
      }
    } else {
      const servicesExist = await Service.countDocuments({ 
        _id: { $in: services }, 
        isActive: true 
      });
      if (servicesExist !== services.length) {
        return res.status(400).json({ msg: 'Some selected services are not available' });
      }
    }

    const appointment = new Appointment({
      customer,
      services: combo ? undefined : services,
      combo: combo || undefined,
      appointmentDate,
      timeSlot,
      notes,
      status: 'pending'
    });

    await appointment.save();
    res.status(201).json(appointment);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private/Admin
exports.getAppointments = async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = {};

    if (date) {
      query.appointmentDate = new Date(date);
    }
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('customer', 'name email')
      .populate('services', 'name price')
      .populate('combo', 'name totalPrice')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user's appointments
// @route   GET /api/appointments/my
// @access  Private
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user.id })
      .populate('services', 'name price')
      .populate('combo', 'name totalPrice')
      .sort({ appointmentDate: -1, timeSlot: 1 });

    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private/Admin
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();
    res.json(appointment);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ 
        msg: `Cannot cancel an appointment that is ${appointment.status}` 
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    res.json(appointment);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};




// @desc    Reschedule appointment (admin only)
// @route   PUT /api/appointments/:id/reschedule
// @access  Private/Admin
exports.rescheduleAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { appointmentDate, timeSlot } = req.body;
    
    // Find the appointment
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Check if the appointment is already completed or cancelled
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ 
        msg: `Cannot reschedule an appointment that is ${appointment.status}` 
      });
    }

    // Check if the new date/time is already booked
    const existingAppointment = await Appointment.findOne({
      appointmentDate,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: req.params.id } // Exclude current appointment from check
    });

    if (existingAppointment) {
      return res.status(400).json({ msg: 'This time slot is already booked' });
    }

    // Update the appointment
    appointment.appointmentDate = appointmentDate;
    appointment.timeSlot = timeSlot;
      appointment.status = 'rescheduled';
    
    // If it was pending, keep it pending. If confirmed, keep it confirmed.
    // Optionally, you could set it back to pending for admin approval
    // appointment.status = 'pending';
    
    await appointment.save();

    // Populate the data for the response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('customer', 'name email')
      .populate('services', 'name price')
      .populate('combo', 'name totalPrice');

    res.json(populatedAppointment);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


// @desc    Get today's appointments
// @route   GET /api/appointments/today
// @access  Private/Admin
exports.getTodaysAppointments = async (req, res) => {
  try {
    // Get today's date at midnight (start of day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Get today's date at 23:59:59 (end of day)
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Query for appointments between todayStart and todayEnd
    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: { $in: ['pending', 'confirmed', 'rescheduled'] } // Only active appointments
    })
    .populate('customer', 'name phone') // Include phone for contact
    .populate('services', 'name duration')
    .populate('combo', 'name totalDuration')
    .sort({ timeSlot: 1 }); // Sort by time slot

    // Calculate total duration for each appointment
    const appointmentsWithDuration = appointments.map(appointment => {
      let totalDuration = 0;
      
      if (appointment.combo) {
        totalDuration = appointment.combo.totalDuration;
      } else if (appointment.services && appointment.services.length > 0) {
        totalDuration = appointment.services.reduce(
          (sum, service) => sum + (service.duration || 0), 0
        );
      }
      
      return {
        ...appointment.toObject(),
        totalDuration
      };
    });

    res.json(appointmentsWithDuration);
  } catch (err) {
    console.error('Error fetching today\'s appointments:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};