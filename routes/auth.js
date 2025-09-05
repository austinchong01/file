const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.get('/register', (req, res) => res.render('register', { title: 'Register' }));

router.post('/register', async (req, res) => {
  const { name, email, password, password2 } = req.body;
  const errors = [];

  if (!name || !email || !password || !password2) errors.push({ msg: 'Please enter all fields' });
  if (password !== password2) errors.push({ msg: 'Passwords do not match' });
  if (password.length < 6) errors.push({ msg: 'Password must be at least 6 characters' });

  if (errors.length > 0) {
    return res.render('register', { errors, name, email, title: 'Register' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      errors.push({ msg: 'Email already exists' });
      return res.render('register', { errors, name, email, title: 'Register' });
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10)
      }
    });

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Something went wrong');
    res.redirect('/auth/register');
  }
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/auth/login',
  failureFlash: true
}));

router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success_msg', 'You are logged out');
    res.redirect('/auth/login');
  });
});

module.exports = router;