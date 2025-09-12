const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { registerValidation } = require("../controllers/registerController");
const { validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.get('/register', (req, res) => res.render('register', { title: 'Register' }));

router.post('/register', registerValidation, async (req, res) => {
  const { name, email, password } = req.body;

  let err = validationResult(req);
  let errors = err.array().map(error => ({ msg: error.msg }));

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

    res.redirect('/auth/login');
  } catch (error) {
    res.redirect('/auth/register');
  }
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/auth/login'
}));

router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/auth/login');
  });
});

module.exports = router;