const bcrypt = require('bcryptjs');
const { generateOTP, sendOTPEmail } = require('../utils/emailSender');
const User = require('../models/usersModels');
const otpStore = require('../utils/otpStore');

exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User with this email does not exist'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    // Store OTP temporarily and mark password as pending reset
    otpStore.set(email, {
      otp,
      expiry: otpExpiry,
      verified: false,
      oldPasswordHash: user.password // Store the current password hash
    });

    // Send OTP via email
    await sendOTPEmail(email, user.name, otp);

    res.json({
      success: true,
      message: 'OTP sent to your email',
      email: email // Return email for frontend confirmation
    });

  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: 'No OTP request found for this email. Please request a new OTP.'
      });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as verified and generate a reset token for the final step
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    otpStore.set(email, {
      ...storedData,
      verified: true,
      resetToken: resetToken,
      resetTokenExpiry: Date.now() + 10 * 60 * 1000 // 10 minutes for password reset
    });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetToken,
      email: email
    });

  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, reset token and new password are required'
      });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: 'No password reset request found for this email. Please start the process again.'
      });
    }

    // Check if reset token matches and is not expired
    if (!storedData.resetToken || storedData.resetToken !== resetToken) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reset token'
      });
    }

    if (Date.now() > storedData.resetTokenExpiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'Reset token has expired. Please start the process again.'
      });
    }

    if (!storedData.verified) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP not verified. Please verify your OTP first.'
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, storedData.oldPasswordHash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: 'New password cannot be same as old password'
      });
    }

    // Update user password
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Clear OTP from store
    otpStore.delete(email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    next(error);
  }
};

// Endpoint to check reset status
exports.checkResetStatus = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required'
      });
    }

    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.json({
        success: false,
        message: 'No active reset process found',
        status: 'not_started'
      });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(email);
      return res.json({
        success: false,
        message: 'OTP expired',
        status: 'expired'
      });
    }

    if (storedData.verified && storedData.resetToken) {
      return res.json({
        success: true,
        message: 'OTP verified, ready for password reset',
        status: 'verified',
        email: email,
        resetToken: storedData.resetToken
      });
    }

    return res.json({
      success: true,
      message: 'OTP sent but not verified yet',
      status: 'otp_sent',
      email: email
    });

  } catch (error) {
    next(error);
  }
};