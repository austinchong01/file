// utils/jwt.js - JWT utility functions
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'file-uploader-app',
    subject: user.id
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Generate token and set as httpOnly cookie (optional approach)
const setTokenCookie = (res, user) => {
  const token = generateToken(user);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('jwt', token, {
    httpOnly: true, // Prevent XSS
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  });

  return token;
};

// Clear token cookie
const clearTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0), // Expire immediately
  });
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  setTokenCookie,
  clearTokenCookie
};