const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  services: [{ 
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    sequence: Number // for ordering services in combo
  }],

    gender: { 
    type: String,
    enum: ['male', 'female', 'unisex'],
    default: 'unisex'
  },

  totalDuration: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Combo', comboSchema);