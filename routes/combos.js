const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const comboController = require('../controllers/comboController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// @route   POST /api/combos
// @desc    Create new combo
// @access  Private/Admin
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('services', 'At least one service is required').isArray({ min: 1 }),
      check('services.*.service', 'Invalid service ID').isMongoId(),
      check('discount', 'Discount must be a number between 0 and 100').optional().isFloat({ min: 0, max: 100 }),
      check('gender', 'Gender must be male, female or unisex').optional().isIn(['male', 'female', 'unisex'])
    ]
  ],
  comboController.createCombo
);

// @route   GET /api/combos
// @desc    Get all combos
// @access  Public
router.get('/', comboController.getCombos);

// @route   GET /api/combos/:id
// @desc    Get single combo
// @access  Public
router.get('/:id', comboController.getCombo);

// @route   PUT /api/combos/:id
// @desc    Update combo
// @access  Private/Admin
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').optional().not().isEmpty(),
      check('services', 'Services must be an array').optional().isArray(),
      check('services.*.service', 'Invalid service ID').optional().isMongoId(),
      check('discount', 'Discount must be a number between 0 and 100').optional().isFloat({ min: 0, max: 100 }),
      check('gender', 'Gender must be male, female or unisex').optional().isIn(['male', 'female', 'unisex'])
    ]
  ],
  comboController.updateCombo
);
// @route   PATCH /api/combos/:id/status
// @desc    Toggle combo status
// @access  Private/Admin
router.patch('/:id/status', [authMiddleware, adminMiddleware], comboController.toggleComboStatus);
// @route   DELETE /api/combos/:id
// @desc    Delete combo
// @access  Private/Admin
router.delete('/:id', [authMiddleware, adminMiddleware], comboController.deleteCombo);

module.exports = router;