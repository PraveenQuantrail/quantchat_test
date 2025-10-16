const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/usersModels');
const otpStore = require('../utils/otpStore');

const ORGANIZATION_NAME = process.env.ORGANIZATION_NAME || 'Your Organization';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.getOrganization = (req, res) => {
    res.json({ name: ORGANIZATION_NAME });
};

// Function to refresh session
exports.refreshSession = async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new token with updated user info
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        name: user.name,
        is_super_admin: user.is_super_admin 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update session storage
    const sessionData = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_super_admin: user.is_super_admin
      }
    };

    res.json({
      success: true,
      session: sessionData,
      message: 'Session refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh session'
    });
  }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email address'
            });
        }

        // Check if there's a pending password reset for this user
        const storedData = otpStore.get(email);
        if (storedData) {
            // If password reset was initiated but not completed
            if (storedData.oldPasswordHash === user.password) {
                return res.status(403).json({
                    success: false,
                    message: 'Password reset in progress. Please complete the password reset process or use the new password.'
                });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid password'
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact your administrator.'
            });
        }

        // Updated token with more user information
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name,
                is_super_admin: user.is_super_admin // CRITICAL: include this in JWT!
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const currentDate = new Date();
        await user.update({ lastLogin: currentDate });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_super_admin: user.is_super_admin, // CRITICAL: include this in UI response!
                lastLogin: currentDate.toISOString()
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.googleLogin = async (req, res, next) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ 
                success: false,
                message: 'Google token is required'
            });
        }

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        // Check if user exists in database
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Please contact your administrator.'
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact your administrator.'
            });
        }

        // Google login token
        const jwtToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name,
                is_super_admin: user.is_super_admin // CRITICAL: include this in JWT!
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const currentDate = new Date();
        await user.update({ lastLogin: currentDate });

        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_super_admin: user.is_super_admin, // CRITICAL: include this in UI response!
                lastLogin: currentDate.toISOString()
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.getSelectedDatabase = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      selectedDatabase: user.selected_database || null
    });
  } catch (error) {
    console.error('Error getting selected database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get selected database'
    });
  }
};

exports.setSelectedDatabase = async (req, res) => {
  try {
    const { databaseId } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ selected_database: databaseId || null });

    res.json({
      success: true,
      message: 'Selected database updated successfully'
    });
  } catch (error) {
    console.error('Error setting selected database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set selected database'
    });
  }
};