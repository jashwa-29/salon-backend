const Combo = require('../models/Combo');
const Service = require('../models/Service');
const { validationResult } = require('express-validator');

// Helper to validate and retrieve services
async function validateAndGetServices(services) {
  const serviceDetails = [];
  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const service = await Service.findById(svc.service);
    if (!service || !service.isActive) {
      throw new Error(`Service ${svc.service} not found or inactive`);
    }
    serviceDetails.push({
      service: svc.service,
      sequence: svc.sequence || i + 1,
      name: service.name,
      duration: service.duration,
      price: service.price
    });
  }
  return serviceDetails;
}

// @desc    Create a new combo
exports.createCombo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, services, discount, gender } = req.body;


    const serviceDetails = await validateAndGetServices(services);

    const totalDuration = serviceDetails.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = serviceDetails.reduce((sum, s) => sum + s.price, 0);

    const finalPrice = discount
      ? Math.max(0, totalPrice - (totalPrice * discount / 100))
      : totalPrice;

    const combo = new Combo({
      name,
      description,
      gender: gender || 'unisex',
      services: serviceDetails,
      totalDuration,
      totalPrice: finalPrice,
      discount: discount || 0
    });

    await combo.save();
    res.status(201).json(combo);
    console.log(combo);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all combos
exports.getCombos = async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.active === 'false') filter.isActive = false;

    const combos = await Combo.find(filter)
      .populate('services.service', 'name duration price description');
    res.json(combos);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get single combo
exports.getCombo = async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id)
      .populate('services.service', 'name duration price description');

    if (!combo) {
      return res.status(404).json({ msg: 'Combo not found' });
    }

    res.json(combo);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Combo not found' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update combo
// Helper: safe price calculation
function calculatePrice(services, discount = 0) {
  const basePrice = services.reduce((sum, svc) => {
    // Use stored price OR populated service price OR default 0
    const price = svc.price || svc.service?.price || 0;
    return sum + price;
  }, 0);

  return Math.max(0, basePrice - (basePrice * discount / 100));
}

exports.updateCombo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, services, discount, gender } = req.body;

    let combo = await Combo.findById(req.params.id);
    if (!combo) {
      return res.status(404).json({ msg: 'Combo not found' });
    }

    // Debug: Log incoming request
    console.log('Update request body:', req.body);

    // Update basic fields
    if (name !== undefined) combo.name = name;
    if (description !== undefined) combo.description = description;
    if (gender !== undefined) combo.gender = gender;
    
    // Handle discount update - always update if provided
    if (discount !== undefined) {
      combo.discount = discount;
    }

    // If services are updated, validate & recalculate
    if (services && Array.isArray(services)) {
      const serviceDetails = await validateAndGetServices(services);
      combo.services = serviceDetails;
      combo.totalDuration = serviceDetails.reduce((sum, s) => sum + s.duration, 0);
    }

    // Always recalculate price after any changes
    // Populate to get real service prices if missing
    const populatedCombo = await combo.populate('services.service', 'price');
    combo.totalPrice = calculatePrice(populatedCombo.services, combo.discount);

    // Debug: Log before saving
    console.log('Combo before save:', {
      name: combo.name,
      discount: combo.discount,
      totalPrice: combo.totalPrice,
      services: combo.services.length
    });

    await combo.save();
    
    // Debug: Log after saving
    console.log('Combo after save:', {
      _id: combo._id,
      discount: combo.discount,
      totalPrice: combo.totalPrice
    });

    res.json(combo);
  } catch (err) {
    console.error('Error in updateCombo:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};


// @desc    Toggle combo status
exports.toggleComboStatus = async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) {
      return res.status(404).json({ msg: 'Combo not found' });
    }
    combo.isActive = !combo.isActive;
    await combo.save();
    res.json({
      _id: combo._id,
      isActive: combo.isActive,
      msg: `Combo ${combo.isActive ? 'activated' : 'deactivated'}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete a combo
exports.deleteCombo = async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo) {
      return res.status(404).json({ msg: 'Combo not found' });
    }
    await combo.deleteOne();
    res.json({ msg: 'Combo deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Combo not found' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
};
