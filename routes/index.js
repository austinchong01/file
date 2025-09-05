const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

// Home route - redirect to dashboard if authenticated, otherwise to login
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Dashboard route
router.get('/dashboard', ensureAuthenticated, getDashboard);

module.exports = router;