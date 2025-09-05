// controllers/authController.js
const bcrypt = require('bcryptjs');
const passport = require('../config/passport');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

// Show login form
const showLogin = (req, res) => {
  res.render('auth/login', { 
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
};

// Show register form
const showRegister = (req, res) => {
  res.render('auth/register', { 
    title: 'Register',
    error: req.flash('error')
  });
};

// Handle registration
const register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, name } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      req.flash('error', 'All fields are required');
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/register');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/auth/register');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      req.flash('error', 'User with that email or username already exists');
      return res.redirect('/auth/register');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || username
      }
    });

    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/auth/login');

  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/auth/register');
  }
};

// Handle login
const login = (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
};

// Handle logout
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.flash('success', 'You have been logged out');
    res.redirect('/auth/login');
  });
};

// Dashboard (protected route)
const dashboard = (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    user: req.user 
  });
};

module.exports = {
  showLogin,
  showRegister,
  register,
  login,
  logout,
  dashboard
};