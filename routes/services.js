const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// @route   GET /api/services
// @desc    Get all services
// @access  Public
router.get('/', serviceController.getServices);

// @route   GET /api/services/:id
// @desc    Get single service
// @access  Public
router.get('/:id', serviceController.getService);

// @route   POST /api/services
// @desc    Create new service
// @access  Private/Admin
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('duration', 'Duration is required and must be a number').isNumeric(),
      check('price', 'Price is required and must be a number').isNumeric()
    ]
  ],
  serviceController.createService
);

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private/Admin
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    [
      check('name', 'Name is required').optional().not().isEmpty(),
      check('duration', 'Duration must be a number').optional().isNumeric(),
      check('price', 'Price must be a number').optional().isNumeric()
    ]
  ],
  serviceController.updateService
);

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private/Admin
router.delete('/:id', [authMiddleware, adminMiddleware], serviceController.deleteService);

// @route   PATCH /api/services/:id/status
// @desc    Toggle service status
// @access  Private/Admin
router.patch('/:id/status', [authMiddleware, adminMiddleware], serviceController.toggleServiceStatus);

module.exports = router;