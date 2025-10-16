const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

// Send OTP to email - POST /api/password-reset/send-otp
router.post('/send-otp', passwordResetController.sendOTP);

// Verify OTP - POST /api/password-reset/verify-otp
router.post('/verify-otp', passwordResetController.verifyOTP);

// Reset password - POST /api/password-reset/reset-password
router.post('/reset-password', passwordResetController.resetPassword);

// Check reset status - GET /api/password-reset/check-status
router.get('/check-status', passwordResetController.checkResetStatus);

module.exports = router;