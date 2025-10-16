const { login, googleLogin, getOrganization, getSelectedDatabase, setSelectedDatabase } = require('../../controllers/authController');
const User = require('../../models/usersModels');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

jest.mock('../../models/usersModels');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('google-auth-library');
jest.mock('../../utils/otpStore'); // auto-mock

const otpStore = require('../../utils/otpStore');
otpStore.get = jest.fn();

describe('Auth Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    process.env.JWT_SECRET = 'testsecret';
    process.env.ORGANIZATION_NAME = 'Test Org';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    otpStore.get.mockReset();
  });

  describe('getOrganization', () => {
    it('should return organization name', () => {
      getOrganization(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ name: 'Test Org' });
    });
  });

  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      await login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required'
      });
    });

    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      User.findOne.mockResolvedValue(null);
      await login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email address'
      });
    });

    it('should return 403 if password reset is in progress', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        role: 'Admin',
        status: 'Active',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      otpStore.get.mockReturnValue({
        oldPasswordHash: 'hashedpassword'
      });
      await login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Password reset in progress')
      });
    });

    it('should return 401 if password does not match', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        role: 'Admin',
        status: 'Active',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      otpStore.get.mockReturnValue(null);
      bcrypt.compare.mockResolvedValue(false);
      await login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid password'
      });
    });

    it('should return 403 if user is not active', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        role: 'Admin',
        status: 'Inactive',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      otpStore.get.mockReturnValue(null);
      bcrypt.compare.mockResolvedValue(true);
      await login(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your account is not active. Please contact your administrator.'
      });
    });

    it('should return token and user data on successful login', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedpassword',
        role: 'Admin',
        name: 'Admin User',
        status: 'Active',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      otpStore.get.mockReturnValue(null);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mocktoken');
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      await login(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: 'mocktoken',
        user: {
          id: 1,
          name: 'Admin User',
          email: 'test@test.com',
          role: 'Admin',
          lastLogin: now.toISOString()
        }
      });

      global.Date.mockRestore();
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password' };
      User.findOne.mockRejectedValue(new Error('DB error'));
      await login(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('googleLogin', () => {
    it('should return 400 if token is missing', async () => {
      await googleLogin(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Google token is required'
      });
    });

    it('should return 403 if user not found', async () => {
      mockReq.body = { token: 'googletoken' };
      OAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'test@test.com' })
      });
      User.findOne.mockResolvedValue(null);

      await googleLogin(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Please contact your administrator.'
      });
    });

    it('should return 403 if user is not active', async () => {
      mockReq.body = { token: 'googletoken' };
      OAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'test@test.com' })
      });
      const mockUser = {
        id: 2,
        email: 'test@test.com',
        role: 'Editor',
        status: 'Inactive',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);

      await googleLogin(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your account is not active. Please contact your administrator.'
      });
    });

    it('should return token and user data on successful google login', async () => {
      mockReq.body = { token: 'googletoken' };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        role: 'Admin',
        name: 'Admin User',
        status: 'Active',
        update: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);
      OAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'test@test.com' })
      });
      jwt.sign.mockReturnValue('mocktoken');
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      await googleLogin(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: 'mocktoken',
        user: {
          id: 1,
          name: 'Admin User',
          email: 'test@test.com',
          role: 'Admin',
          lastLogin: now.toISOString()
        }
      });

      global.Date.mockRestore();
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = { token: 'googletoken' };
      OAuth2Client.prototype.verifyIdToken.mockRejectedValue(new Error('Google error'));
      await googleLogin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getSelectedDatabase', () => {
    it('should return 404 if user is not found', async () => {
      mockReq.user = { id: 123 };
      User.findByPk.mockResolvedValue(null);
      await getSelectedDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should return selected database if present', async () => {
      mockReq.user = { id: 123 };
      const mockUser = { selected_database: 'db_123' };
      User.findByPk.mockResolvedValue(mockUser);
      await getSelectedDatabase(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        selectedDatabase: 'db_123'
      });
    });

    it('should return selected database as null if not set', async () => {
      mockReq.user = { id: 123 };
      const mockUser = {}; // no selected_database property
      User.findByPk.mockResolvedValue(mockUser);
      await getSelectedDatabase(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        selectedDatabase: null
      });
    });

    it('should return 500 on error', async () => {
      mockReq.user = { id: 123 };
      User.findByPk.mockRejectedValue(new Error('db error'));
      const origError = console.error;
      console.error = jest.fn();
      await getSelectedDatabase(mockReq, mockRes);
      expect(console.error).toHaveBeenCalledWith(
        'Error getting selected database:',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get selected database'
      });
      console.error = origError;
    });
  });

  describe('setSelectedDatabase', () => {
    it('should return 404 if user is not found', async () => {
      mockReq.user = { id: 55 };
      mockReq.body = { databaseId: 'dbid' };
      User.findByPk.mockResolvedValue(null);
      await setSelectedDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should update and return success if user found', async () => {
      mockReq.user = { id: 55 };
      mockReq.body = { databaseId: 'dbid' };
      const update = jest.fn().mockResolvedValue(true);
      const mockUser = { update };
      User.findByPk.mockResolvedValue(mockUser);

      await setSelectedDatabase(mockReq, mockRes);

      expect(update).toHaveBeenCalledWith({ selected_database: 'dbid' });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Selected database updated successfully'
      });
    });

    it('should set selected_database to null if databaseId is missing', async () => {
      mockReq.user = { id: 55 };
      mockReq.body = {};
      const update = jest.fn().mockResolvedValue(true);
      const mockUser = { update };
      User.findByPk.mockResolvedValue(mockUser);

      await setSelectedDatabase(mockReq, mockRes);

      expect(update).toHaveBeenCalledWith({ selected_database: null });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Selected database updated successfully'
      });
    });

    it('should return 500 on error', async () => {
      mockReq.user = { id: 55 };
      mockReq.body = { databaseId: 'dbid' };
      User.findByPk.mockRejectedValue(new Error('db error'));
      const origError = console.error;
      console.error = jest.fn();
      await setSelectedDatabase(mockReq, mockRes);
      expect(console.error).toHaveBeenCalledWith(
        'Error setting selected database:',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to set selected database'
      });
      console.error = origError;
    });
  });
});