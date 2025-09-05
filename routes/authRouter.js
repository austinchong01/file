// routes/authRouter.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureNotAuthenticated, ensureAuthenticated } = require('../middleware/auth');

// Login routes
router.get('/login', ensureNotAuthenticated, authController.showLogin);
router.post('/login', ensureNotAuthenticated, authController.login);

// Register routes
router.get('/register', ensureNotAuthenticated, authController.showRegister);
router.post('/register', ensureNotAuthenticated, authController.register);

// Logout route
router.post('/logout', ensureAuthenticated, authController.logout);
router.get('/logout', ensureAuthenticated, authController.logout);

// Dashboard
router.get('/dashboard', ensureAuthenticated, authController.dashboard);

module.exports = router;