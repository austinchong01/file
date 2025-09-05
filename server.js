require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const flash = require('express-flash');
const methodOverride = require('method-override');

const app = express();
const prisma = new PrismaClient();

// Passport config
require('./config/passport');

// View engine
app.set('view engine', 'ejs');

// Static files and uploads
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, // Check expired sessions every 2 minutes
    dbRecordIdIsSessionId: true
  })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/files', require('./routes/files'));
app.use('/folders', require('./routes/folders'));

// Home route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }
  
  // Use the dashboard controller
  require('./controllers/dashboardController').getDashboard(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});