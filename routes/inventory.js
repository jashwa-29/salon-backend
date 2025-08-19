const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const staffMiddleware = require('../middleware/staffMiddleware');

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private (Admin/Staff)
router.get('/', [authMiddleware, staffMiddleware], inventoryController.getInventory);

// @route   GET /api/inventory/alerts
// @desc    Get low stock alerts
// @access  Private (Admin/Staff)
router.get('/alerts', [authMiddleware, staffMiddleware], inventoryController.getLowStockAlerts);

// @route   GET /api/inventory/:id
// @desc    Get single inventory item
// @access  Private (Admin/Staff)
router.get('/:id', [authMiddleware, staffMiddleware], inventoryController.getInventoryItem);

// @route   POST /api/inventory
// @desc    Create new inventory item
// @access  Private (Admin)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').trim().not().isEmpty(),
      check('description', 'Description must be a string').optional().trim().isString(),
      check('category', 'Invalid category').optional().isIn(['hair', 'skincare', 'tools', 'chemicals', 'other']),
      check('quantity', 'Quantity is required and must be a positive number').isFloat({ min: 0 }),
      check('unit', 'Unit is required').isIn(['ml', 'g', 'bottles', 'pieces', 'units', 'packs']),
      check('threshold', 'Threshold must be a positive number').optional().isFloat({ min: 0 })
    ]
  ],
  inventoryController.createInventoryItem
);

// @route   PUT /api/inventory/:id
// @desc    Update inventory item
// @access  Private (Admin)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').optional().trim().not().isEmpty(),
      check('description', 'Description must be a string').optional().trim().isString(),
      check('category', 'Invalid category').optional().isIn(['hair', 'skincare', 'tools', 'chemicals', 'other']),
      check('quantity', 'Quantity must be a positive number').optional().isFloat({ min: 0 }),
      check('unit', 'Invalid unit').optional().isIn(['ml', 'g', 'bottles', 'pieces', 'units', 'packs']),
      check('threshold', 'Threshold must be a positive number').optional().isFloat({ min: 0 })
    ]
  ],
  inventoryController.updateInventoryItem
);

// @route   PUT /api/inventory/:id/restock
// @desc    Restock inventory item
// @access  Private (Admin/Staff)
router.put(
  '/:id/restock',
  [
    authMiddleware,
    staffMiddleware,
    [
      check('amount', 'Amount is required and must be positive').isFloat({ min: 0.01 }),
      check('notes', 'Notes must be a string').optional().trim().isString()
    ]
  ],
  inventoryController.restockInventoryItem
);

// @route   PUT /api/inventory/:id/use
// @desc    Record inventory usage
// @access  Private (Staff)
router.put(
  '/:id/use',
  [
    authMiddleware,
    staffMiddleware,
    [
      check('amount', 'Amount is required and must be positive').isFloat({ min: 0.01 }),
      check('serviceId', 'Invalid service ID').optional().isMongoId(),
      check('notes', 'Notes must be a string').optional().trim().isString()
    ]
  ],
  inventoryController.recordInventoryUsage
);

// @route   DELETE /api/inventory/:id
// @desc    Delete inventory item
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], inventoryController.deleteInventoryItem);

module.exports = router;