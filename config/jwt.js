const jwt = require('jsonwebtoken');
const { findUserById } = require('./user');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, email, username
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'carpiem-app',
    subject: user.id.toString()
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
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

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Middleware to authenticate JWT tokens
 * Adds user object to req.user if token is valid
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Verify user still exists in database
    try {
      const user = await findUser(decoded.id);
      req.user = {
        id: user.id,
        email: user.email
      };
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    
    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  authenticateToken
};