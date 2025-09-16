// middleware/auth.js - Updated with debugging

// Authentication middleware for API routes
exports.ensureAuthenticated = (req, res, next) => {
  console.log('=== Authentication Check ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('Is Authenticated:', req.isAuthenticated());
  console.log('Cookies:', req.headers.cookie);
  console.log('=== End Auth Check ===');
  
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