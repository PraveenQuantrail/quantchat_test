const {sendOTP,verifyOTP,resetPassword,checkResetStatus} = require('../../controllers/passwordResetController');
const User = require('../../models/usersModels');
const { generateOTP, sendOTPEmail } = require('../../utils/emailSender');
const otpStore = require('../../utils/otpStore');
const bcrypt = require('bcryptjs');

jest.mock('../../models/usersModels');
jest.mock('../../utils/emailSender');
jest.mock('../../utils/otpStore', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}));
jest.mock('bcryptjs');

describe('Password Reset Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    otpStore.get.mockClear();
    otpStore.set.mockClear();
    otpStore.delete.mockClear();
    User.findOne.mockClear();
    generateOTP.mockClear();
    sendOTPEmail.mockClear();
    bcrypt.compare.mockClear();
  });

  describe('sendOTP', () => {
    it('should return 400 if email is missing', async () => {
      await sendOTP(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required'
      });
    });

    it('should return 404 if user not found', async () => {
      mockReq.body = { email: 'notfound@test.com' };
      User.findOne.mockResolvedValue(null);

      await sendOTP(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email does not exist'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = { email: 'test@test.com' };
      User.findOne.mockRejectedValue(new Error('DB error'));

      await sendOTP(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should send OTP successfully', async () => {
      mockReq.body = { email: 'test@test.com' };
      const mockUser = { email: 'test@test.com', name: 'Test User', password: 'hashedpassword' };
      User.findOne.mockResolvedValue(mockUser);
      generateOTP.mockReturnValue('123456');
      sendOTPEmail.mockResolvedValue(true);

      await sendOTP(mockReq, mockRes, mockNext);
      expect(otpStore.set).toHaveBeenCalledWith('test@test.com', expect.objectContaining({
        otp: '123456',
        verified: false,
        oldPasswordHash: 'hashedpassword'
      }));
      expect(sendOTPEmail).toHaveBeenCalledWith('test@test.com', 'Test User', '123456');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP sent to your email',
        email: 'test@test.com'
      });
    });
  });

  describe('verifyOTP', () => {
    it('should return 400 if email or OTP is missing', async () => {
      await verifyOTP(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and OTP are required'
      });
    });

    it('should return 400 if no OTP request found', async () => {
      mockReq.body = { email: 'test@test.com', otp: '123456' };
      otpStore.get.mockReturnValue(undefined);

      await verifyOTP(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No OTP request found for this email. Please request a new OTP.'
      });
    });

    it('should return 400 if OTP expired', async () => {
      mockReq.body = { email: 'test@test.com', otp: '123456' };
      otpStore.get.mockReturnValue({
        otp: '123456',
        expiry: Date.now() - 1000,
        verified: false
      });

      await verifyOTP(mockReq, mockRes, mockNext);
      expect(otpStore.delete).toHaveBeenCalledWith('test@test.com');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    });

    it('should return 400 if OTP is invalid', async () => {
      mockReq.body = { email: 'test@test.com', otp: 'wrong' };
      otpStore.get.mockReturnValue({
        otp: '123456',
        expiry: Date.now() + 300000,
        verified: false
      });

      await verifyOTP(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid OTP'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = { email: 'test@test.com', otp: '123456' };
      otpStore.get.mockImplementation(() => { throw new Error('otp error'); });

      await verifyOTP(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should verify OTP successfully', async () => {
      mockReq.body = { email: 'test@test.com', otp: '123456' };
      otpStore.get.mockReturnValue({
        otp: '123456',
        expiry: Date.now() + 300000,
        verified: false
      });

      await verifyOTP(mockReq, mockRes, mockNext);

      expect(otpStore.set).toHaveBeenCalledWith('test@test.com', expect.objectContaining({
        otp: '123456',
        verified: true,
        resetToken: expect.any(String),
        resetTokenExpiry: expect.any(Number)
      }));
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'OTP verified successfully',
        resetToken: expect.any(String),
        email: 'test@test.com'
      }));
    });
  });

  describe('resetPassword', () => {
    it('should return 400 if required fields are missing', async () => {
      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email, reset token and new password are required'
      });
    });

    it('should return 400 if no password reset request found', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      otpStore.get.mockReturnValue(undefined);

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No password reset request found for this email. Please start the process again.'
      });
    });

    it('should return 400 if reset token is invalid', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'wrongtoken', newPassword: 'newpassword' };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() + 300000,
        verified: true,
        oldPasswordHash: 'oldhash'
      });

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid reset token'
      });
    });

    it('should return 400 if reset token expired', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() - 1000,
        verified: true,
        oldPasswordHash: 'oldhash'
      });

      await resetPassword(mockReq, mockRes, mockNext);
      expect(otpStore.delete).toHaveBeenCalledWith('test@test.com');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Reset token has expired. Please start the process again.'
      });
    });

    it('should return 400 if OTP not verified', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() + 300000,
        verified: false,
        oldPasswordHash: 'oldhash'
      });

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'OTP not verified. Please verify your OTP first.'
      });
    });

    it('should return 400 if new password is same as old password', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'samepass' };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() + 300000,
        verified: true,
        oldPasswordHash: 'oldhash'
      });
      bcrypt.compare.mockResolvedValue(true);

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password cannot be same as old password'
      });
    });

    it('should return 404 if user not found', async () => {
      mockReq.body = { email: 'notfound@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() + 300000,
        verified: true,
        oldPasswordHash: 'oldhash'
      });
      bcrypt.compare.mockResolvedValue(false);
      User.findOne.mockResolvedValue(null);

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      otpStore.get.mockImplementation(() => { throw new Error('otp error'); });

      await resetPassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reset password successfully', async () => {
      mockReq.body = { email: 'test@test.com', resetToken: 'resettoken', newPassword: 'newpassword' };
      const mockUser = {
        email: 'test@test.com',
        password: 'oldhashedpassword',
        save: jest.fn().mockResolvedValue(true)
      };
      otpStore.get.mockReturnValue({
        resetToken: 'resettoken',
        resetTokenExpiry: Date.now() + 300000,
        verified: true,
        oldPasswordHash: 'oldhashedpassword'
      });
      bcrypt.compare.mockResolvedValue(false);
      User.findOne.mockResolvedValue(mockUser);

      await resetPassword(mockReq, mockRes, mockNext);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
      expect(mockUser.password).toBe('newpassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(otpStore.delete).toHaveBeenCalledWith('test@test.com');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully'
      });
    });
  });

  describe('checkResetStatus', () => {
    it('should return 400 if email is missing', async () => {
      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required'
      });
    });

    it('should return status not_started if no storedData', async () => {
      mockReq.query = { email: 'test@test.com' };
      otpStore.get.mockReturnValue(undefined);

      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No active reset process found',
        status: 'not_started'
      });
    });

    it('should return status expired if OTP expired', async () => {
      mockReq.query = { email: 'test@test.com' };
      otpStore.get.mockReturnValue({
        expiry: Date.now() - 1000,
        verified: false
      });

      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(otpStore.delete).toHaveBeenCalledWith('test@test.com');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'OTP expired',
        status: 'expired'
      });
    });

    it('should return status verified if OTP verified and resetToken exists', async () => {
      mockReq.query = { email: 'test@test.com' };
      otpStore.get.mockReturnValue({
        expiry: Date.now() + 300000,
        verified: true,
        resetToken: 'resetToken'
      });

      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP verified, ready for password reset',
        status: 'verified',
        email: 'test@test.com',
        resetToken: 'resetToken'
      });
    });

    it('should return status otp_sent if not verified yet', async () => {
      mockReq.query = { email: 'test@test.com' };
      otpStore.get.mockReturnValue({
        expiry: Date.now() + 300000,
        verified: false
      });

      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'OTP sent but not verified yet',
        status: 'otp_sent',
        email: 'test@test.com'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.query = { email: 'test@test.com' };
      otpStore.get.mockImplementation(() => { throw new Error('oops'); });

      await checkResetStatus(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});