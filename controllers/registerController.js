// This just shows the new stuff we're adding to the existing contents
const { body } = require("express-validator");

const registerValidation = [
  body('password2').custom((value, {req}) => {
    if (value !== req.body.password) {
      throw new Error('Passwords must match');
    }
    return true;
  })
];

module.exports = { registerValidation };