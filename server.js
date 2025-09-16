// server.js - Updated for production deployment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');

const app = express();
const prisma = new PrismaClient();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Configure CORS origins
const corsOrigins = isProduction 
  ? [process.env.FRONTEND_URL] 
  : [
      process.env.FRONTEND_URL,
      'http://localhost:5173', 
      'http://localhost:3000',
      'http://localhost:4173' // Vite preview
    ];

// Remove any undefined origins
const allowedOrigins = corsOrigins.filter(origin => origin);

console.log('CORS Origins:', allowedOrigins);
console.log('Production mode:', isProduction);

// 1. CORS CONFIGURATION
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3. SESSION CONFIGURATION
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: isProduction, // Use secure cookies in production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
    domain: isProduction ? undefined : undefined // Let browser handle domain
  },
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined
  })
}));

// Initialize Passport
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/files', require('./routes/files'));
app.use('/folders', require('./routes/folders'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS policy violation' });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});