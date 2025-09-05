const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController.js');
const { ensureAuthenticated } = require('../middleware/auth');

// Home page - show all people (protected route)
router.get('/', ensureAuthenticated, indexController.getElements);

module.exports = router;