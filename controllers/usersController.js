const { Op } = require('sequelize');
const User = require('../models/usersModels');
const { generateStrongPassword, sendInitialPasswordEmail } = require('../utils/emailSender');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory revoked tokens/user IDs
const revokedTokens = new Set();

const availableRoles = ['Admin', 'Editor', 'Readonly'];
const allRoles = ['Super Admin', 'Admin', 'Editor', 'Readonly'];
const SUPER_ADMIN_LIMIT = 3;

// Initialize super admin if no users exist
exports.initializeSuperAdmin = async () => {
  try {
    const userCount = await User.count();

    if (userCount === 0) {
      console.log('No users found. Creating super admin...');

      const superAdminData = {
        name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        phone: process.env.SUPER_ADMIN_PHONE,
        address: process.env.SUPER_ADMIN_ADDRESS,
        role: 'Super Admin',
        status: 'Active',
        twoFA: false,
        is_super_admin: true
      };

      const initialPassword = generateStrongPassword();
      console.log(initialPassword)
      console.log(`Generated initial password for super admin: ${initialPassword}`);

      const superAdmin = await User.create({
        ...superAdminData,
        password: initialPassword
      });

      try {
        await sendInitialPasswordEmail(
          superAdminData.email,
          superAdminData.name,
          initialPassword
        );
      } catch (err) {
        console.error('Error sending initial password email for super admin:', err);
      }

      console.log(`Super admin created successfully.`);
    } else {
      console.log('Users already exist. Skipping super admin creation.');
      // Ensure existing super admins have correct role and flag
      await User.update(
        { role: 'Super Admin', is_super_admin: true },
        { where: { is_super_admin: true } }
      );
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// Get count of super admins
const getSuperAdminCount = async () => {
  return await User.count({ where: { role: 'Super Admin', is_super_admin: true } });
};

// Helper: is current user a (real) super admin
function isCurrentUserSuperAdmin(req) {
  // Use both role and is_super_admin
  return req.user && req.user.role === 'Super Admin' && req.user.is_super_admin === true;
}

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res, next) => {
  try {
    // Check if user token is revoked
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role && role !== 'All Roles') where.role = role;
    if (status && status !== 'All Status') where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['role', 'DESC'], // Super Admin first
        ['created_at', 'ASC'] // Earliest first
      ],
      attributes: { exclude: ['password'] }
    });

    // Determine available roles based on current user
    let rolesToShow = availableRoles;
    if (isCurrentUserSuperAdmin(req)) {
      rolesToShow = allRoles;
    }

    res.json({
      users,
      total: count,
      availableRoles: rolesToShow
    });
  } catch (error) {
    next(error);
  }
};

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    // Check if user token is revoked
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { name, email, phone, role, address } = req.body;

    if (!name || !email || !phone || !role || !address) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if trying to create Super Admin
    if (role === 'Super Admin') {
      if (!isCurrentUserSuperAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create Super Admin users'
        });
      }

      const superAdminCount = await getSuperAdminCount();
      if (superAdminCount >= SUPER_ADMIN_LIMIT) {
        return res.status(400).json({
          success: false,
          message: `Cannot create more than ${SUPER_ADMIN_LIMIT} Super Admins`
        });
      }
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const initialPassword = generateStrongPassword();
    console.log(`Generated initial password for ${email}: ${initialPassword}`);

    const newUser = await User.create({
      name,
      email,
      phone,
      role,
      address,
      password: initialPassword,
      status: 'Active',
      twoFA: false,
      is_super_admin: role === 'Super Admin'
    });

    try {
      await sendInitialPasswordEmail(email, name, initialPassword);
    } catch (err) {
      console.error('Error sending initial password email:', err);
    }

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      user: userResponse,
      message: 'User created successfully.'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    next(error);
  }
};

// Update user details (role assignment/fixes for super admin)
exports.updateUser = async (req, res, next) => {
  try {
    // Check if user token is revoked
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { id } = req.params;
    const { phone, role, address } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Phone and address are required'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = req.user;

    // Check if user is Super Admin
    const isTargetSuperAdmin = user.role === 'Super Admin' && user.is_super_admin;
    const isCurrentUserSuperAdminFlag = isCurrentUserSuperAdmin(req);

    // Non-Super Admins cannot edit Super Admins at all
    if (isTargetSuperAdmin && !isCurrentUserSuperAdminFlag) {
      return res.status(403).json({
        success: false,
        message: 'You cannot edit a Super Admin user'
      });
    }

    // Prevent users from editing their own role
    if (currentUser && currentUser.id.toString() === id.toString() && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Handle role changes
    if (role && role !== user.role) {
      // Changing TO Super Admin
      if (role === 'Super Admin') {
        if (!isCurrentUserSuperAdminFlag) {
          return res.status(403).json({
            success: false,
            message: 'Only Super Admins can assign Super Admin role'
          });
        }

        const superAdminCount = await getSuperAdminCount();
        // If target is not already a super admin, check limit
        if (!isTargetSuperAdmin && superAdminCount >= SUPER_ADMIN_LIMIT) {
          return res.status(400).json({
            success: false,
            message: `Cannot have more than ${SUPER_ADMIN_LIMIT} Super Admins`
          });
        }
        user.is_super_admin = true;
      }

      // Changing FROM Super Admin
      if (user.role === 'Super Admin' && role !== 'Super Admin') {
        if (!isCurrentUserSuperAdminFlag) {
          return res.status(403).json({
            success: false,
            message: 'Only Super Admins can change Super Admin role'
          });
        }

        // Prevent self-role change from Super Admin
        if (currentUser && currentUser.id.toString() === id.toString()) {
          return res.status(400).json({
            success: false,
            message: 'You cannot change your own role from Super Admin'
          });
        }
        user.is_super_admin = false;
      }
    }

    // Update fields - Super Admins can edit other Super Admins' phone/address
    if (isCurrentUserSuperAdminFlag || currentUser.id.toString() === id.toString()) {
      user.phone = phone;
      user.address = address;
    }

    // Update role if provided and allowed
    if (role && role !== user.role) {
      // Only allow role change if current user is Super Admin and not changing themselves
      if (isCurrentUserSuperAdminFlag && currentUser.id.toString() !== id.toString()) {
        user.role = role;
      } else if (!isCurrentUserSuperAdminFlag && user.role !== 'Super Admin') {
        // Non-Super Admins can change roles of non-Super Admin users
        user.role = role;
      }
    }

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    // If the current user updated their own role OR if any user's role was changed, generate a new token for the affected user
    let newToken = null;
    if (role && role !== user.role) {
      // Generate new token for the user whose role was changed
      newToken = jwt.sign(
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

      // Also clear any revoked token for this user
      exports.clearRevokedToken(user.id.toString());
    }

    const responseData = {
      success: true,
      user: userResponse,
      message: 'User updated successfully'
    };

    // Include new token in response if generated
    if (newToken) {
      responseData.newToken = newToken;
      responseData.message = 'User updated successfully. Role changes require refreshing permissions.';
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

// Delete a user (delete/demote logic for super admins)
exports.deleteUser = async (req, res, next) => {
  try {
    // Check if user token is revoked
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = req.user;

    // Check if user is Super Admin
    const isTargetSuperAdmin = user.role === 'Super Admin' && user.is_super_admin;
    const isCurrentUserSuperAdminFlag = isCurrentUserSuperAdmin(req);

    if (isTargetSuperAdmin) {
      // Prevent deletion of Super Admin by non-Super Admins
      if (!isCurrentUserSuperAdminFlag) {
        return res.status(403).json({
          success: false,
          message: 'You cannot delete a Super Admin user'
        });
      }

      // Prevent self-deletion for Super Admins
      if (currentUser.id.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Super Admin cannot delete their own account'
        });
      }
    }

    // Prevent self-deletion for regular users
    if (currentUser && currentUser.id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Add deleted user's id to revokedTokens set
    exports.revokeToken(user.id.toString());

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUserId: id
    });
  } catch (error) {
    next(error);
  }
};

// Check if token is revoked (i.e., user deleted)
exports.isTokenRevoked = (userId) => {
  return revokedTokens.has(userId.toString());
};

// Revoke token for a user
exports.revokeToken = (userId) => {
  revokedTokens.add(userId.toString());
};

// Clear revoked token
exports.clearRevokedToken = (userId) => {
  revokedTokens.delete(userId.toString());
};

// Cleanup revoked tokens older than specified hours
exports.cleanupRevokedTokens = (hours = 24) => {
  console.log('Revoked tokens cleanup called (in-memory store persists until server restart)');
};

// Get current user info with fresh data
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Check if user token is revoked
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    // Get fresh user data from database
    const freshUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user status is active
    if (freshUser.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact your administrator.'
      });
    }

    const userResponse = freshUser.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    next(error);
  }
};