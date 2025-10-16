const authDatabase = require('../../middlewares/authDatabase');
const jwt = require('jsonwebtoken');
const User = require('../../models/usersModels');

jest.mock('jsonwebtoken');
jest.mock('../../models/usersModels');

describe('authDatabase middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    process.env.JWT_SECRET = 'testsecret';
    jest.clearAllMocks();
  });

  it('should return 401 if no Authorization header is present', async () => {
    mockReq.header.mockReturnValue(undefined);
    await authDatabase(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. No token provided.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header is not a Bearer token', async () => {
    mockReq.header.mockReturnValue('');
    await authDatabase(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. No token provided.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if jwt.verify throws JsonWebTokenError', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    jwt.verify.mockImplementation(() => { throw { name: 'JsonWebTokenError' }; });

    await authDatabase(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if jwt.verify throws TokenExpiredError', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    jwt.verify.mockImplementation(() => { throw { name: 'TokenExpiredError' }; });

    await authDatabase(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token expired.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 500 for any other error thrown', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    jwt.verify.mockImplementation(() => { throw { name: 'OtherError' }; });

    await authDatabase(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Server error in authentication.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if user not found', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    jwt.verify.mockReturnValue({ userId: 123 });
    User.findByPk.mockResolvedValue(null);

    await authDatabase(mockReq, mockRes, mockNext);

    expect(User.findByPk).toHaveBeenCalledWith(123);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token is not valid. User not found.'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should attach user to req and call next if valid token and user', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    jwt.verify.mockReturnValue({ userId: 456 });
    const fakeUser = { id: 456, name: 'Test User' };
    User.findByPk.mockResolvedValue(fakeUser);

    await authDatabase(mockReq, mockRes, mockNext);

    expect(User.findByPk).toHaveBeenCalledWith(456);
    expect(mockReq.user).toBe(fakeUser);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should handle a token with extra spaces correctly', async () => {
    mockReq.header.mockReturnValue('Bearer    faketoken');
    jwt.verify.mockReturnValue({ userId: 789 });
    const fakeUser = { id: 789, name: 'Space User' };
    User.findByPk.mockResolvedValue(fakeUser);

    await authDatabase(mockReq, mockRes, mockNext);

    expect(User.findByPk).toHaveBeenCalledWith(789);
    expect(mockReq.user).toBe(fakeUser);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle error object with message (for branch coverage)', async () => {
    mockReq.header.mockReturnValue('Bearer faketoken');
    const err = new Error('boom');
    err.name = 'OtherError';
    jwt.verify.mockImplementation(() => { throw err; });

    await authDatabase(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Server error in authentication.'
    });
  });

  it('should handle invalid header (not string) gracefully', async () => {
    mockReq.header.mockReturnValue(null);
    await authDatabase(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. No token provided.'
    });
  });
});