// Authentication middleware
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/auth/login');
};

// Redirect authenticated users away from auth pages
exports.ensureGuest = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};