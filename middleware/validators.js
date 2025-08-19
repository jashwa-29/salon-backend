const { check } = require('express-validator');

exports.serviceValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('duration', 'Duration is required and must be a number').isNumeric(),
  check('price', 'Price is required and must be a number').isNumeric(),
  check('category', 'Category is required').optional().not().isEmpty()
];