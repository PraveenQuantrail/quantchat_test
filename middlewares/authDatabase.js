const jwt = require('jsonwebtoken');
const User = require('../models/usersModels');
const usersController = require('../controllers/usersController');

const authDatabase = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is revoked (user was deleted)
    if (usersController.isTokenRevoked(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    // Check if user exists in DB
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      // User record is deleted
      usersController.revokeToken(decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    // Additional check: if user status is not Active
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact your administrator.'
      });
    }

    // Attach full user object (with role and is_super_admin flags) to req
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

module.exports = authDatabase;