const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Show login form
exports.getLogin = (req, res) => {
  res.render('login', { title: 'Login' });
};

// Show registration form
exports.getRegister = (req, res) => {
  res.render('register', { title: 'Register' });
};

// Handle user registration
exports.postRegister = async (req, res) => {
  const { name, email, password, password2 } = req.body;
  const errors = [];

  // Validation
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password && password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push({ msg: 'Please enter a valid email address' });
  }

  if (errors.length > 0) {
    return res.render('register', {
      errors,
      name: name || '',
      email: email || '',
      title: 'Register'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('register', {
        errors,
        name,
        email,
        title: 'Register'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword
      }
    });

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Something went wrong during registration. Please try again.');
    res.redirect('/auth/register');
  }
};

// Handle logout
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }
    req.flash('success_msg', 'You have been logged out successfully');
    res.redirect('/auth/login');
  });
};