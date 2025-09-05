// middleware/auth.js

// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.flash('error', 'Please log in to access this page');
    res.redirect('/auth/login');
  }
};

// Ensure user is not authenticated (for login/register pages)
const ensureNotAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  } else {
    return next();
  }
};

module.exports = {
  ensureAuthenticated,
  ensureNotAuthenticated
};