require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Add this import
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const methodOverride = require('method-override');

const app = express();
const prisma = new PrismaClient();

require('./config/passport');

// CORS configuration - MUST be before other middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid', // Explicit session name
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false, // Set to true in production with HTTPS
    httpOnly: true, // Prevent XSS
    sameSite: 'lax' // Allow cross-site requests
  },
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined
  })
}));

app.use(passport.initialize());
app.use(passport.session());

// Simple middleware to make user available in templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/files', require('./routes/files'));
app.use('/folders', require('./routes/folders'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});