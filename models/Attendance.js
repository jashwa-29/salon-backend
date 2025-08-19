const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Staff", 
    required: [true, 'Staff ID is required'] 
  },
  date: { 
    type: Date, 
    required: [true, 'Date is required'],
    index: true 
  },
  checkIn: { 
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v <= new Date();
      },
      message: 'Check-in time cannot be in the future'
    }
  },
  checkOut: { 
    type: Date,
    validate: [
      {
        validator: function(v) {
          if (!v) return true;
          return v <= new Date();
        },
        message: 'Check-out time cannot be in the future'
      },
      {
        validator: function(v) {
          if (!this.checkIn || !v) return true;
          return v >= this.checkIn;
        },
        message: 'Check-out time must be after check-in time'
      }
    ]
  },
  status: { 
    type: String, 
    enum: {
      values: ["Present", "Absent", "Late", "Half-Day", "Holiday"],
      message: '{VALUE} is not a valid status'
    }, 
    default: "Present" 
  },
  isHoliday: { 
    type: Boolean, 
    default: false 
  },
  notes: { 
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for working hours
attendanceSchema.virtual('workingHours').get(function() {
  if (!this.checkIn || !this.checkOut) return 0;
  const diff = this.checkOut - this.checkIn;
  return (diff / (1000 * 60 * 60)).toFixed(2); // hours with 2 decimal places
});

// Compound index for unique staffId + date combination
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Indexes for better query performance
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ staffId: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isHoliday: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);