const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { registerValidation } = require("../controllers/registerController");
const { validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Remove the GET routes for login/register pages since React will handle them
// Keep only API endpoints

router.post('/register', registerValidation, async (req, res) => {
  const { name, email, password } = req.body;

  let err = validationResult(req);
  let errors = err.array().map(error => ({ msg: error.msg }));

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors 
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10)
      }
    });

    // Return success response instead of redirect
    res.json({ 
      success: true, 
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Invalid credentials' 
      });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Login failed' 
        });
      }
      
      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    });
  })(req, res, next);
});

// Get current user info
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

module.exports = router;