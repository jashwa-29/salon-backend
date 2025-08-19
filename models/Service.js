const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  duration: { type: Number, required: true }, // in minutes
  price: { type: Number, required: true },
  category: String,
  gender: { 
    type: String,
    enum: ['male', 'female', 'unisex'],
    default: 'unisex'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);