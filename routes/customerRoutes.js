const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');


router.post('/',  [
    authMiddleware,
    adminMiddleware
  ],  customerController.createCustomer);
router.get('/',  [
    authMiddleware,
    adminMiddleware
  ], customerController.getAllCustomers);
router.get('/:id',  [
    authMiddleware,
    adminMiddleware
  ], customerController.getCustomer);
router.put('/:id',  [
    authMiddleware,
    adminMiddleware
  ],  customerController.updateCustomer);

module.exports = router;