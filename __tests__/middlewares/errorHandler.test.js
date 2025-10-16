const errorHandler = require('../../middlewares/errorHandler');

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles SequelizeValidationError', () => {
    const err = {
      name: 'SequelizeValidationError',
      stack: 'stacktrace',
      errors: [
        { message: 'Field is required' },
        { message: 'Must be a valid email' }
      ]
    };

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error:', err.stack);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation error',
      errors: ['Field is required', 'Must be a valid email']
    });
  });

  it('handles SequelizeUniqueConstraintError', () => {
    const err = {
      name: 'SequelizeUniqueConstraintError',
      stack: 'stacktrace',
      errors: [
        { message: 'Email must be unique' }
      ]
    };

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error:', err.stack);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unique constraint error',
      error: 'Email must be unique'
    });
  });

  it('handles other errors with development NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    const err = {
      name: 'SomeOtherError',
      stack: 'stacktrace',
      message: 'Something bad happened'
    };

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error:', err.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      error: 'Something bad happened'
    });
  });

  it('handles other errors with production NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    const err = {
      name: 'SomeOtherError',
      stack: 'stacktrace',
      message: 'Sensitive error message'
    };

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error:', err.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      error: 'Something went wrong'
    });
  });
});