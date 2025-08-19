const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  services: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service' 
  }],
  combo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Combo' 
  },
  appointmentDate: { 
    type: Date, 
    required: true 
  },
  timeSlot: {
    type: String,
    required: true,
    enum: [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
    ]
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'cancelled' , 'rescheduled'], 
    default: 'pending' 
  },
  notes: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for date and time slot to prevent double bookings
appointmentSchema.index({ appointmentDate: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);