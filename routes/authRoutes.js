const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authDatabase = require('../middlewares/authDatabase');

// Get organization name - GET /api/auth/organization
router.get('/organization', authController.getOrganization);

// Login route - POST /api/auth/login
router.post('/login', authController.login);

// Google login route - POST /api/auth/google
router.post('/google', authController.googleLogin);

// Refresh session route - GET /api/auth/refresh-session
router.get('/refresh-session', authDatabase, authController.refreshSession);

// Selecting Database - GET /api/auth/selected-database
router.get('/selected-database', authDatabase, authController.getSelectedDatabase);

// Selecting Database - POST /api/auth/selected-database
router.post('/selected-database', authDatabase, authController.setSelectedDatabase);

// Get current user info - GET /api/auth/me
router.get('/me', authDatabase, (req, res) => {
  // Returns current user info (protected)
  const user = req.user;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      is_super_admin: user.is_super_admin
    }
  });
});

module.exports = router;