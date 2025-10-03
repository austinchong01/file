// server.js - Updated for production deployment
require('dotenv').config();
const express = require('express');
const path = require('path');
const passport = require('passport');

const app = express();

// Passport
app.use(passport.initialize());

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});


// Routes
// app.use('/', require('./routes/index'));
// app.use('/auth', require('./routes/auth'));
app.use('/files', require('./routes/files'));
// app.use('/folders', require('./routes/folders'));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});