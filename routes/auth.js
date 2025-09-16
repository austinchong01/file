const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { registerValidation } = require("../controllers/registerController");
const { validationResult } = require('express-validator');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/jwt');
const { redirectIfAuthenticated } = require('../middleware/jwtAuth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', redirectIfAuthenticated, registerValidation, async (req, res) => {
  const { name, email, password } = req.body;

  let err = validationResult(req);
  let errors = err.array().map(error => (error.msg));
  console.log(errors);

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
        message: 'Email already exists',
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10)
      }
    });

    // Generate JWT token
    const token = generateToken(user);

    // Option 1: Send token in response body (for localStorage)
    res.json({ 
      success: true, 
      message: 'Registration successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    // Option 2: Set token as httpOnly cookie (uncomment if preferred)
    // setTokenCookie(res, user);
    // res.json({ 
    //   success: true, 
    //   message: 'Registration successful',
    //   user: {
    //     id: user.id,
    //     name: user.name,
    //     email: user.email
    //   }
    // });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

router.post('/login', redirectIfAuthenticated, (req, res, next) => {
  console.log('=== Login Attempt ===');
  console.log('Request body:', req.body);
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Passport error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error' 
      });
    }
    
    if (!user) {
      console.log('Login failed:', info);
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Invalid credentials' 
      });
    }
    
    console.log('=== Login Success ===');
    console.log('User authenticated:', user.email);
    
    // Generate JWT token instead of creating session
    const token = generateToken(user);
    
    console.log('JWT token generated for user:', user.id);
    
    // Option 1: Send token in response body (for localStorage)
    return res.json({ 
      success: true, 
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    // Option 2: Set token as httpOnly cookie (uncomment if preferred)
    // setTokenCookie(res, user);
    // return res.json({ 
    //   success: true, 
    //   message: 'Login successful',
    //   user: {
    //     id: user.id,
    //     name: user.name,
    //     email: user.email
    //   }
    // });

  })(req, res, next);
});

router.post('/logout', (req, res) => {
  console.log('Logout request received');
  
  // Clear httpOnly cookie if you're using that approach
  clearTokenCookie(res);
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
  
  // Note: With JWT, logout is mainly handled on the frontend
  // by removing the token from localStorage/memory
  // The server-side logout mainly clears cookies if you use them
});

module.exports = router;