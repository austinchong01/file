// middleware/auth.js - Updated for API responses

// Authentication middleware for API routes
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // For API routes, return JSON instead of redirect
  res.status(401).json({
    success: false,
    message: 'Authentication required',
    redirect: '/login'
  });
};

// Redirect authenticated users away from auth pages
exports.ensureGuest = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.status(200).json({
      success: false,
      message: 'Already authenticated',
      redirect: '/dashboard'
    });
  }
  next();
};