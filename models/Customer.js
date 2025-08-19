const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    default: null // Explicitly set default to null
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  isRegisteredUser: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook remains the same
customerSchema.pre('save', async function(next) {
  if (!this.customerId) {
    const lastCustomer = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastId = lastCustomer ? parseInt(lastCustomer.customerId?.replace('C', '')) || 0 : 0;
    this.customerId = `C${(lastId + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);