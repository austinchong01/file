// middleware/jwtAuth.js - JWT Authentication Middleware
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// JWT Authentication middleware for API routes
exports.authenticateJWT = async (req, res, next) => {
  console.log('=== JWT AUTHENTICATION MIDDLEWARE ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  try {    
    let token = null;

    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);
    
    if (authHeader) {
      token = extractTokenFromHeader(authHeader);
      console.log('Token from header:', token ? 'Found' : 'Not found');
    }

    // Fallback: try to get token from httpOnly cookie
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
      console.log('Token from cookie:', token ? 'Found' : 'Not found');
      console.log('Cookie token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'N/A');
    }

    if (!token) {
      console.log('❌ No token provided - Authentication failed');
      return res.status(401).json({
        success: false,
        message: 'Authentication required - no token provided',
        redirect: '/login'
      });
    }

    console.log('Token found, proceeding to verify...');
    
    // Verify the token
    const decoded = verifyToken(token);
    console.log('Token verification result:', decoded);

    // Optional: Verify user still exists in database
    console.log('Looking up user in database:', decoded.id);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.log('❌ User not found in database:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed - user not found',
        redirect: '/login'
      });
    }

    console.log('✅ User found in database:', user);
    console.log('✅ JWT Authentication successful');
    
    // Add user to request object
    req.user = user;
    console.log('Added user to req.user:', req.user);
    console.log('=== END JWT AUTHENTICATION (SUCCESS) ===');
    
    next();

  } catch (error) {
    console.error('❌ JWT Authentication error:', error.message);
    console.log('Error stack:', error.stack);
    console.log('=== END JWT AUTHENTICATION (ERROR) ===');
    
    return res.status(401).json({
      success: false,
      message: `Authentication failed - ${error.message}`,
      redirect: '/login'
    });
  }
};

// Middleware to redirect authenticated users away from auth pages
exports.redirectIfAuthenticated = async (req, res, next) => {
  try {
    let token = null;

    // Check for token in Authorization header or cookie
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = extractTokenFromHeader(authHeader);
    }

    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        
        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (user) {
          return res.status(200).json({
            success: false,
            message: 'Already authenticated',
            redirect: '/dashboard'
          });
        }
      } catch (error) {
        // Token invalid, continue to login/register
        console.log('Invalid token in redirectIfAuthenticated, continuing...');
      }
    }

    next();
  } catch (error) {
    console.error('redirectIfAuthenticated error:', error);
    next(); // Continue even if there's an error
  }
};