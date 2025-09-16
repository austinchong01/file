// utils/jwt.js - JWT utility functions
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (user) => {
  console.log('=== GENERATING JWT TOKEN ===');
  console.log('JWT_SECRET exists:', !!JWT_SECRET);
  console.log('JWT_SECRET (first 10 chars):', JWT_SECRET.substring(0, 10) + '...');
  console.log('JWT_EXPIRES_IN:', JWT_EXPIRES_IN);
  console.log('User data for token:', { id: user.id, email: user.email, name: user.name });
  
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  console.log('Token payload:', payload);
  
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'file-uploader-app',
    subject: user.id
  });
  
  console.log('Generated token length:', token.length);
  console.log('Generated token (first 100 chars):', token.substring(0, 100) + '...');
  console.log('=== END TOKEN GENERATION ===');
  
  return token;
};

const verifyToken = (token) => {
  console.log('=== VERIFYING JWT TOKEN ===');
  console.log('Token to verify (first 50 chars):', token.substring(0, 50) + '...');
  console.log('JWT_SECRET exists for verification:', !!JWT_SECRET);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verification SUCCESS');
    console.log('Decoded payload:', decoded);
    console.log('Token expires at:', new Date(decoded.exp * 1000));
    console.log('Current time:', new Date());
    console.log('=== END TOKEN VERIFICATION (SUCCESS) ===');
    return decoded;
  } catch (error) {
    console.log('Token verification FAILED');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('=== END TOKEN VERIFICATION (FAILED) ===');
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

const extractTokenFromHeader = (authHeader) => {
  console.log('=== EXTRACTING TOKEN FROM HEADER ===');
  console.log('Auth header:', authHeader);
  
  if (!authHeader) {
    console.log('No auth header provided');
    return null;
  }

  const parts = authHeader.split(' ');
  console.log('Auth header parts:', parts);
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('Invalid auth header format');
    return null;
  }

  const token = parts[1];
  console.log('Extracted token (first 50 chars):', token.substring(0, 50) + '...');
  console.log('=== END TOKEN EXTRACTION ===');
  return token;
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