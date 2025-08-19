const Inventory = require('../models/Inventory');
const { validationResult } = require('express-validator');

// Helper function to handle errors
const handleError = (res, err, status = 500) => {
  console.error(err.message);
  res.status(status).json({ 
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private (Admin/Staff)
exports.getInventory = async (req, res) => {
  try {
    const { category, lowStock, sort } = req.query;
    let query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter low stock items
    if (lowStock === 'true') {
      query.$expr = { $lt: ['$quantity', '$threshold'] };
    }

    // Sorting options
    const sortOptions = {
      'name-asc': { name: 1 },
      'name-desc': { name: -1 },
      'quantity-asc': { quantity: 1 },
      'quantity-desc': { quantity: -1 },
      'default': { name: 1 }
    };

    const sortBy = sortOptions[sort] || sortOptions.default;

    const inventory = await Inventory.find(query)
      .sort(sortBy)
      .populate('restockHistory.restockedBy', 'name')
      .populate('usageHistory.usedBy', 'name')
      .populate('usageHistory.service', 'name');

    res.json({
      success: true,
      count: inventory.length,
      data: inventory
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private (Admin/Staff)
exports.getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('restockHistory.restockedBy', 'name')
      .populate('usageHistory.usedBy', 'name')
      .populate('usageHistory.service', 'name');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }
    handleError(res, err);
  }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Admin)
exports.createInventoryItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { name, description, category, quantity, unit, threshold } = req.body;

    // Check for existing item
    const existingItem = await Inventory.findOne({ name });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Item with this name already exists'
      });
    }

    const item = new Inventory({
      name,
      description,
      category,
      quantity,
      unit,
      threshold
    });

    await item.save();

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin)
exports.updateInventoryItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { name, description, category, quantity, unit, threshold } = req.body;

    let item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check for name conflict
    if (name && name !== item.name) {
      const existingItem = await Inventory.findOne({ name });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'Item with this name already exists'
        });
      }
    }

    // Update fields
    item.name = name || item.name;
    item.description = description || item.description;
    item.category = category || item.category;
    item.quantity = quantity !== undefined ? quantity : item.quantity;
    item.unit = unit || item.unit;
    item.threshold = threshold !== undefined ? threshold : item.threshold;

    await item.save();

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Restock inventory item
// @route   PUT /api/inventory/:id/restock
// @access  Private (Admin/Staff)
exports.restockInventoryItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { amount, notes } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Restock amount must be positive'
      });
    }

    item.quantity += amount;
    item.lastRestocked = Date.now();
    
    item.restockHistory.push({
      amount,
      restockedBy: req.user.id,
      notes
    });

    await item.save();

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Record inventory usage
// @route   PUT /api/inventory/:id/use
// @access  Private (Staff)
exports.recordInventoryUsage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { amount, serviceId, notes } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Usage amount must be positive'
      });
    }

    if (amount > item.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    item.quantity -= amount;
    
    item.usageHistory.push({
      amount,
      usedBy: req.user.id,
      service: serviceId,
      notes
    });

    await item.save();

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin)
exports.deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.remove();

    res.json({
      success: true,
      message: 'Inventory item removed'
    });
  } catch (err) {
    handleError(res, err);
  }
};

// @desc    Get low stock alerts
// @route   GET /api/inventory/alerts
// @access  Private (Admin/Staff)
exports.getLowStockAlerts = async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lt: ['$quantity', '$threshold'] }
    }).sort({ quantity: 1 });

    res.json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (err) {
    handleError(res, err);
  }
};