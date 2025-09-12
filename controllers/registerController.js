// This just shows the new stuff we're adding to the existing contents
const { body } = require("express-validator");

const registerValidation = [
  body('name').trim().isLength({min: 1, max: 10}).withMessage('Name is required and must be 10 characters or less'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({min: 6}).withMessage('Password must be 6+ characters'),
  body('password2').custom((value, {req}) => {
    if (value !== req.body.password) {
      throw new Error('Passwords must match');
    }
    return true;
  })
];

module.exports = { registerValidation };