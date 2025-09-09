const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getLogin = (req, res) => res.render('login', { title: 'Login' });
exports.getRegister = (req, res) => res.render('register', { title: 'Register' });

exports.postRegister = async (req, res) => {
  const { name, email, password, password2 } = req.body;
  const errors = [];

  if (!name || !email || !password || !password2) errors.push({ msg: 'Please enter all fields' });
  if (password !== password2) errors.push({ msg: 'Passwords do not match' });
  if (password && password.length < 6) errors.push({ msg: 'Password must be at least 6 characters' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ msg: 'Please enter a valid email address' });

  if (errors.length > 0) {
    return res.render('register', { errors, name: name || '', email: email || '', title: 'Register' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('register', { errors, name, email, title: 'Register' });
    }

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password, 12)
      }
    });

    res.redirect('/auth/login');
  } catch (error) {
    res.redirect('/auth/register');
  }
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/auth/login');
  });
};