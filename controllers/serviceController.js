const Service = require('../models/Service');
const { validationResult } = require('express-validator');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    const { category, active } = req.query;
    
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (active) {
      query.isActive = active === 'true';
    }
    
    const services = await Service.find(query).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    
    res.json(service);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Admin
exports.createService = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, duration, price, category, gender } = req.body;
    
    const service = new Service({
      name,
      description,
      duration,
      price,
      category,
      gender: gender || 'unisex' // Default to unisex if not provided
    });

    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Admin
exports.updateService = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, duration, price, category, isActive, gender } = req.body;
    
    let service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    
    service.name = name || service.name;
    service.description = description || service.description;
    service.duration = duration || service.duration;
    service.price = price || service.price;
    service.category = category || service.category;
    service.gender = gender || service.gender;
    if (typeof isActive !== 'undefined') {
      service.isActive = isActive;
    }
    
    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Admin
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    
    await service.deleteOne();
    res.json({ msg: 'Service removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Toggle service status
// @route   PATCH /api/services/:id/status
// @access  Private/Admin
exports.toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    
    service.isActive = !service.isActive;
    await service.save();
    
    res.json({
      _id: service._id,
      isActive: service.isActive,
      msg: `Service ${service.isActive ? 'activated' : 'deactivated'}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};