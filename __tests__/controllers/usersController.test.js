const { getAllUsers, createUser, updateUser, deleteUser } = require('../../controllers/usersController');
const User = require('../../models/usersModels');
const emailSender = require('../../utils/emailSender');
const { Op } = require('sequelize');

jest.mock('../../models/usersModels');
jest.mock('../../utils/emailSender');

describe('Users Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    User.findAndCountAll.mockClear();
    User.findOne.mockClear();
    User.create.mockClear();
    User.findByPk.mockClear();
    emailSender.generateOTP.mockClear?.();
    emailSender.generateStrongPassword?.mockClear?.();
    emailSender.sendOTPEmail.mockClear?.();
    emailSender.sendInitialPasswordEmail.mockClear?.();
  });

  describe('getAllUsers', () => {
    it('should return all users with pagination', async () => {
      const mockUsers = [{ id: 1, name: 'Test User' }];
      User.findAndCountAll.mockResolvedValue({ count: 1, rows: mockUsers });

      await getAllUsers(mockReq, mockRes, mockNext);
      expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {},
        limit: 10,
        offset: 0,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password'] }
      }));
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        users: mockUsers,
        total: 1,
        availableRoles: expect.any(Array)
      }));
    });

    it('should apply role/status/search filters', async () => {
      mockReq.query = { role: 'Admin', status: 'Active', search: 'Test', page: 2, limit: 5 };
      const mockUsers = [{ id: 2, name: 'Admin User' }];
      User.findAndCountAll.mockResolvedValue({ count: 1, rows: mockUsers });

      await getAllUsers(mockReq, mockRes, mockNext);

      const callArgs = User.findAndCountAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(5);
      expect(callArgs.offset).toBe(5);
      expect(callArgs.order).toEqual([['created_at', 'DESC']]);
      expect(callArgs.attributes).toEqual({ exclude: ['password'] });
      expect(callArgs.where.role).toBe('Admin');
      expect(callArgs.where.status).toBe('Active');
      const orKey = Object.getOwnPropertySymbols(callArgs.where)[0];
      expect(orKey).toBe(Op.or);
      expect(callArgs.where[orKey]).toEqual([
        { name: { [Op.iLike]: '%Test%' } },
        { email: { [Op.iLike]: '%Test%' } }
      ]);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        users: mockUsers,
        total: 1
      }));
    });

    it('should handle numeric limit/page query params', async () => {
      mockReq.query = { limit: "3", page: "2" };
      User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await getAllUsers(mockReq, mockRes, mockNext);
      expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 3,
        offset: 3
      }));
    });

    it('should call next(error) on exception', async () => {
      User.findAndCountAll.mockRejectedValue(new Error('DB error'));
      await getAllUsers(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createUser', () => {
    it('should return 400 if any field is missing', async () => {
      await createUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required'
      });
    });

    it('should return 400 if user already exists', async () => {
      mockReq.body = {
        name: 'Existing User',
        email: 'exist@test.com',
        phone: '1234567890',
        role: 'Admin',
        address: 'Test Address'
      };
      User.findOne.mockResolvedValue({ id: 1 });
      await createUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.body = {
        name: 'New User',
        email: 'new@test.com',
        phone: '1234567890',
        role: 'Editor',
        address: 'Test Address'
      };
      User.findOne.mockRejectedValue(new Error('DB error'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await createUser(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      spy.mockRestore();
    });

    it('should create a new user successfully', async () => {
      mockReq.body = {
        name: 'New User',
        email: 'new@test.com',
        phone: '1234567890',
        role: 'Editor',
        address: 'Test Address'
      };
      emailSender.generateStrongPassword.mockReturnValue('StrongPass123!');
      User.findOne.mockResolvedValue(null);
      const createdUser = {
        id: 1,
        ...mockReq.body,
        password: 'hashedpassword',
        status: 'Active',
        twoFA: false,
        toJSON: function () { return { id: 1, ...mockReq.body, password: 'hashedpassword', status: 'Active', twoFA: false }; }
      };
      User.create.mockResolvedValue(createdUser);
      emailSender.sendInitialPasswordEmail.mockResolvedValue(true);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await createUser(mockReq, mockRes, mockNext);
      expect(emailSender.generateStrongPassword).toHaveBeenCalled();
      expect(emailSender.sendInitialPasswordEmail).toHaveBeenCalledWith(
        'new@test.com',
        'New User',
        'StrongPass123!'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('User created successfully'),
        user: expect.objectContaining({
          id: 1,
          name: 'New User',
          email: 'new@test.com',
          phone: '1234567890',
          role: 'Editor',
          address: 'Test Address',
          status: 'Active',
          twoFA: false
        })
      }));
      const userResponse = mockRes.json.mock.calls[0][0].user;
      expect(userResponse.password).toBeUndefined();
      logSpy.mockRestore();
    });

    it('should still succeed if email sending fails', async () => {
      mockReq.body = {
        name: 'New User',
        email: 'new@test.com',
        phone: '1234567890',
        role: 'Editor',
        address: 'Test Address'
      };
      emailSender.generateStrongPassword.mockReturnValue('StrongPass123!');
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 1,
        ...mockReq.body,
        password: 'hashedpassword',
        toJSON: function () { return { id: 1, ...mockReq.body, password: 'hashedpassword' }; }
      });
      emailSender.sendInitialPasswordEmail.mockResolvedValue(false);

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await createUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
      spy.mockRestore();
      logSpy.mockRestore();
    });

    it('should handle sendInitialPasswordEmail throwing error and still create user', async () => {
      mockReq.body = {
        name: 'Edge User',
        email: 'edge@test.com',
        phone: '2222222222',
        role: 'Admin',
        address: 'Edge Address'
      };
      emailSender.generateStrongPassword.mockReturnValue('edgePass!@#');
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 2,
        ...mockReq.body,
        password: 'hashedpassword',
        toJSON: function () { return { id: 2, ...mockReq.body, password: 'hashedpassword' }; }
      });
      emailSender.sendInitialPasswordEmail.mockImplementation(() => Promise.reject(new Error('SMTP error')));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await createUser(mockReq, mockRes, mockNext);
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('User created successfully')
      }));
      spy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('updateUser', () => {
    it('should return 400 if any field is missing', async () => {
      mockReq.params = { id: 1 };
      mockReq.body = { phone: '', role: '', address: '' };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Phone, role and address are required'
      });
      mockReq.body = { phone: '123', role: '', address: 'a' };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      mockReq.body = { phone: '', role: 'Admin', address: 'a' };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 1 };
      mockReq.body = {
        phone: '9876543210',
        role: 'Admin',
        address: 'New Address'
      };
      User.findByPk.mockResolvedValue(null);
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.params = { id: 1 };
      mockReq.body = {
        phone: '9876543210',
        role: 'Admin',
        address: 'New Address'
      };
      User.findByPk.mockRejectedValue(new Error('DB error'));
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should update user successfully', async () => {
      mockReq.params = { id: 1 };
      mockReq.body = {
        phone: '9876543210',
        role: 'Admin',
        address: 'New Address'
      };
      const mockUser = {
        id: 1,
        phone: '1234567890',
        role: 'Editor',
        address: 'Old Address',
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ id: 1, ...mockReq.body })
      };
      User.findByPk.mockResolvedValue(mockUser);

      await updateUser(mockReq, mockRes, mockNext);
      expect(mockUser.phone).toBe('9876543210');
      expect(mockUser.role).toBe('Admin');
      expect(mockUser.address).toBe('New Address');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'User updated successfully'
      }));
      const userResponse = mockRes.json.mock.calls[0][0].user;
      expect(userResponse.password).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 1 };
      User.findByPk.mockResolvedValue(null);
      await deleteUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should call next(error) on exception', async () => {
      mockReq.params = { id: 1 };
      User.findByPk.mockRejectedValue(new Error('DB error'));
      await deleteUser(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should delete user successfully', async () => {
      mockReq.params = { id: 1 };
      const mockUser = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };
      User.findByPk.mockResolvedValue(mockUser);

      await deleteUser(mockReq, mockRes, mockNext);
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully'
      });
    });

    it('should handle destroy throwing error', async () => {
      mockReq.params = { id: 3 };
      const mockUser = {
        id: 3,
        destroy: jest.fn().mockRejectedValue(new Error('Destroy error'))
      };
      User.findByPk.mockResolvedValue(mockUser);

      await deleteUser(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Extra/Edge Coverage', () => {
    it('getAllUsers: default limit/offset', async () => {
      User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await getAllUsers({ query: {} }, mockRes, mockNext);
      expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 10,
        offset: 0
      }));
    });

    it('updateUser: not all body fields present', async () => {
      mockReq.params = { id: 2 };
      mockReq.body = { phone: undefined, role: 'Admin', address: 'A' };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      mockReq.body = { phone: '1', role: undefined, address: 'A' };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      mockReq.body = { phone: '1', role: 'Admin', address: undefined };
      await updateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});