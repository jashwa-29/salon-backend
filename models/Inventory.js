const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['hair', 'skincare', 'tools', 'chemicals', 'other'],
    default: 'other'
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0
  },
  unit: { 
    type: String, 
    required: true,
    enum: ['ml', 'g', 'bottles', 'pieces', 'units', 'packs']
  },
  threshold: { 
    type: Number, 
    default: 5,
    min: 0
  },
  lastRestocked: {
    type: Date
  },
  restockHistory: [{
    date: { type: Date, default: Date.now },
    amount: Number,
    restockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  usageHistory: [{
    date: { type: Date, default: Date.now },
    amount: Number,
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for low stock status
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity < this.threshold;
});

// Update timestamp before saving
inventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);