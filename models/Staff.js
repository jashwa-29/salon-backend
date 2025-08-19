const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  aadhaar: { 
    type: String, 
    required: [true, 'Aadhaar number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{12}$/.test(v);
      },
      message: props => `${props.value} is not a valid Aadhaar number!`
    }
  },
  dob: { 
    type: Date, 
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(v) {
        return v < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  gender: { 
    type: String, 
    enum: {
      values: ["Male", "Female", "Other"],
      message: '{VALUE} is not a valid gender'
    }, 
    required: [true, 'Gender is required'] 
  },
  address: { 
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  joiningDate: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  },
  salary: { 
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  role: { 
    type: String, 
    enum: {
      values: ["Barber", "Stylist", "Receptionist", "Manager"],
      message: '{VALUE} is not a valid role'
    }, 
    required: [true, 'Role is required'] 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for staff's age
staffSchema.virtual('age').get(function() {
  const diff = Date.now() - this.dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// Indexes for better query performance
staffSchema.index({ name: 1 });
staffSchema.index({ phone: 1 }, { unique: true });
staffSchema.index({ aadhaar: 1 }, { unique: true });
staffSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("Staff", staffSchema);