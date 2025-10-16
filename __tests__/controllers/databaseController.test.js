jest.mock('../../models/databaseModels', () => {
  const model = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    syncTable: jest.fn(),
  };
  model.get = jest.fn().mockImplementation(function () {
    return this;
  });
  return model;
});

const databaseController = require('../../controllers/databaseController');
const DatabaseConnection = require('../../models/databaseModels');
const Sequelize = require('sequelize');

jest.mock('sequelize');
jest.mock('mongodb', () => {
  const mClient = {
    connect: jest.fn(),
    db: jest.fn(() => ({
      command: jest.fn().mockResolvedValue({}),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ name: 'users' }, { name: 'posts' }])
      }),
      collection: jest.fn(() => ({
        find: jest.fn(() => ({
          limit: jest.fn(() => ({
            toArray: jest.fn().mockResolvedValue([{ _id: 1, name: "doc1" }])
          }))
        }))
      }))
    })),
    close: jest.fn(),
  };
  return {
    MongoClient: jest.fn(() => mClient),
  };
});

const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  query: jest.fn().mockResolvedValue([{ table_name: 'table1' }, { table_name: 'table2' }])
};

Sequelize.prototype.authenticate = mockSequelize.authenticate;
Sequelize.prototype.close = mockSequelize.close;
Sequelize.prototype.query = mockSequelize.query;

// Silence console.error/log
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('Database Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  // getAllDatabases
  describe('getAllDatabases', () => {
    it('should return databases with pagination', async () => {
      DatabaseConnection.findAndCountAll.mockResolvedValue({
        count: 12,
        rows: [{ id: 1, name: 'db1' }, { id: 2, name: 'db2' }]
      });
      mockReq.query = { page: 1, limit: 2 };

      await databaseController.getAllDatabases(mockReq, mockRes);

      expect(DatabaseConnection.findAndCountAll).toHaveBeenCalledWith({
        limit: 2,
        offset: 0,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password'] }
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        databases: [{ id: 1, name: 'db1' }, { id: 2, name: 'db2' }],
        total: 12,
        totalPages: 6,
        currentPage: 1
      });
    });

    it('should handle fetch error', async () => {
      DatabaseConnection.findAndCountAll.mockRejectedValue(new Error('error'));
      await databaseController.getAllDatabases(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch databases',
        error: 'error'
      });
    });

    it('should handle missing query params', async () => {
      DatabaseConnection.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });
      mockReq.query = {};
      await databaseController.getAllDatabases(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        databases: [],
        total: 0,
        totalPages: 0,
        currentPage: 1
      });
    });
  });

  // addDatabase
  describe('addDatabase', () => {
    it('should return 400 if local missing host/port/username/password', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        type: 'PostgreSQL',
        host: '',
        port: '',
        username: '',
        password: ''
      };
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Host, port, username, and password are required for local connections'
      });
    });

    it('should return 400 if external missing connection_string', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'PostgreSQL',
        connection_string: ''
      };
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Connection string is required for external connections'
      });
    });

    it('should return 400 if database name already exists', async () => {
      mockReq.body = {
        name: 'used',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce({ id: 1 });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection with this name already exists'
      });
    });

    it('should return 400 if local connection already exists', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2 });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A connection to this database already exists'
      });
    });

    it('should return 400 if external connection already exists', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'PostgreSQL',
        connection_string: 'postgres://user:pass@host/db'
      };
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2 });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'This external connection already exists'
      });
    });

    it('should return 400 if connection fails', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ message: 'fail' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0]).toMatchObject({
        success: false,
        status: 'Disconnected'
      });
    });

    it('should create connection and return success', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test',
        ssl: true
      };
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      DatabaseConnection.create.mockResolvedValue({
        get: () => ({
          id: 1, name: 'test', password: 'pass'
        })
      });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        database: expect.objectContaining({ id: 1, name: 'test' })
      }));
    });

    it('should handle error from create', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockResolvedValueOnce(true);
      DatabaseConnection.create.mockRejectedValueOnce(new Error('fail'));
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to add database connection',
        error: 'fail'
      }));
    });

    it('should handle error from findOne', async () => {
      DatabaseConnection.findOne.mockRejectedValueOnce(new Error('fail'));
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test'
      };
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to add database connection',
        error: 'fail'
      }));
    });

    it('should handle error from findOne (external)', async () => {
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('fail'));
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'PostgreSQL',
        connection_string: 'postgres://user:pass@host/db'
      };
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to add database connection',
        error: 'fail'
      }));
    });

    it('should return error for unsupported external type', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'Oracle',
        connection_string: 'oracle://user:pass@host/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        status: 'Disconnected',
        message: expect.stringContaining('Unsupported database type for external connection')
      }));
    });

    it('should return error for unsupported local type', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        type: 'Oracle',
        host: 'localhost',
        port: '1521',
        username: 'oracle',
        password: 'pw',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        status: 'Disconnected',
        message: expect.stringContaining('Unsupported database type')
      }));
    });

    it('should add with warning for default credentials', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      DatabaseConnection.create.mockResolvedValue({
        get: () => ({
          id: 1, name: 'test', password: 'pw'
        })
      });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('Warning: Using default PostgreSQL credentials')
      }));
    });

    it('should add with generic success message when not secure and no warning', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'remotehost',
        port: '5432',
        username: 'admin',
        password: 'pw',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      DatabaseConnection.create.mockResolvedValue({
        get: () => ({
          id: 1, name: 'test', password: 'pw'
        })
      });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Database connection added successfully'
      }));
    });

    // testDatabaseConnection
    it('should handle statement and branch for testDatabaseConnection error.original (ECONNREFUSED)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { code: 'ECONNREFUSED' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Connection refused');
    });

    it('should handle statement and branch for testDatabaseConnection error.original (ENOTFOUND)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'nohost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { code: 'ENOTFOUND' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Host not found');
    });

    it('should handle statement and branch for testDatabaseConnection error.original (ETIMEDOUT)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'remotehost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { code: 'ETIMEDOUT' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Connection timed out');
    });

    it('should handle statement and branch for testDatabaseConnection error.original (3D000)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        type: 'PostgreSQL',
        database: 'notexist'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { code: '3D000' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain("does not exist");
    });

    it('should handle statement and branch for testDatabaseConnection error.original (28P01)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'wrongpw',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { code: '28P01' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Authentication failed');
    });

    it('should handle statement and branch for testDatabaseConnection error.original message (password authentication failed)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'wrongpw',
        type: 'PostgreSQL',
        database: 'test'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { message: 'password authentication failed' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Authentication failed');
    });

    it('should handle statement and branch for testDatabaseConnection error.original message (database)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        type: 'PostgreSQL',
        database: 'notexist'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockSequelize.authenticate.mockRejectedValueOnce({ original: { message: 'database error' } });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('does not exist');
    });

    it('should handle statement and branch for testDatabaseConnection error.message (Authentication failed)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'MongoDB',
        connection_string: 'mongodb://user:wrongpw@host:27017/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const MongoClient = require('mongodb').MongoClient;
      MongoClient().connect.mockRejectedValueOnce({ message: 'Authentication failed' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Authentication failed');
    });

    it('should handle statement and branch for testDatabaseConnection error.message (getaddrinfo ENOTFOUND)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'MongoDB',
        connection_string: 'mongodb://user:pw@nohost:27017/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const MongoClient = require('mongodb').MongoClient;
      MongoClient().connect.mockRejectedValueOnce({ message: 'getaddrinfo ENOTFOUND' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Host not found');
    });

    it('should handle statement and branch for testDatabaseConnection error.message (connection timed out)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'MongoDB',
        connection_string: 'mongodb://user:pw@host:27017/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const MongoClient = require('mongodb').MongoClient;
      MongoClient().connect.mockRejectedValueOnce({ message: 'connection timed out' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Connection timed out');
    });

    it('should handle statement and branch for testDatabaseConnection error.message (bad auth)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'MongoDB',
        connection_string: 'mongodb://user:pw@host:27017/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const MongoClient = require('mongodb').MongoClient;
      MongoClient().connect.mockRejectedValueOnce({ message: 'bad auth' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Authentication failed');
    });

    it('should handle statement and branch for testDatabaseConnection error.message (other)', async () => {
      mockReq.body = {
        name: 'test',
        server_type: 'external',
        type: 'MongoDB',
        connection_string: 'mongodb://user:pw@host:27017/db'
      };
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const MongoClient = require('mongodb').MongoClient;
      MongoClient().connect.mockRejectedValueOnce({ message: 'something else' });
      await databaseController.addDatabase(mockReq, mockRes);
      expect(mockRes.json.mock.calls[0][0].message).toContain('something else');
    });
  });

  // testDatabase
  describe('testDatabase', () => {
    it('should return 404 if connection not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.testDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should update status and return success', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test',
        get: function () { return { ...this }; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);

      connection.port = '5432';
      connection.host = 'localhost';
      connection.username = 'postgres';

      await databaseController.testDatabase(mockReq, mockRes);

      expect(connection.update).toHaveBeenCalledWith({ status: 'Testing...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Connected (Warning)' });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'Connected (Warning)'
      }));
    });

    it('should update status and return error if test fails', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test',
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockSequelize.authenticate.mockRejectedValueOnce({ message: 'fail' });

      await databaseController.testDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith({ status: 'Testing...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnected' });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        status: 'Disconnected'
      }));
    });

    it('should handle error thrown in testDatabase', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.testDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to test database connection',
        error: 'fail'
      }));
    });

    it('should return error for unsupported type in testDatabase', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        type: 'Oracle',
        host: 'localhost',
        port: '1521',
        username: 'oracle',
        password: 'pw',
        database: 'test',
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      await databaseController.testDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith({ status: 'Testing...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnected' });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0]).toMatchObject({
        success: false,
        status: 'Disconnected',
        message: expect.stringContaining('Unsupported database type')
      });
    });
  });

  // connectDatabase
  describe('connectDatabase', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.connectDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should update status and return success', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test',
        get: function () { return { ...this }; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);

      connection.port = '5432';
      connection.host = 'localhost';
      connection.username = 'postgres';

      await databaseController.connectDatabase(mockReq, mockRes);

      expect(connection.update).toHaveBeenCalledWith({ status: 'Connecting...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Connected (Warning)' });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'Connected (Warning)'
      }));
    });

    it('should update status and return error if connect fails', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pass',
        type: 'PostgreSQL',
        database: 'test',
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockSequelize.authenticate.mockRejectedValueOnce({ message: 'fail' });

      await databaseController.connectDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith({ status: 'Connecting...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnected' });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        status: 'Disconnected'
      }));
    });

    it('should handle error thrown in connectDatabase', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.connectDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to connect to database',
        error: 'fail'
      }));
    });

    it('should return error for unsupported type in connectDatabase', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue(),
        id: 1,
        server_type: 'local',
        type: 'Oracle',
        host: 'localhost',
        port: '1521',
        username: 'oracle',
        password: 'pw',
        database: 'test',
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      await databaseController.connectDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith({ status: 'Connecting...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnected' });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0]).toMatchObject({
        success: false,
        status: 'Disconnected',
        message: expect.stringContaining('Unsupported database type')
      });
    });
  });

  // disconnectDatabase
  describe('disconnectDatabase', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.disconnectDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should update status and return success', async () => {
      const connection = {
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);

      await databaseController.disconnectDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnecting...' });
      expect(connection.update).toHaveBeenCalledWith({ status: 'Disconnected' });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Database disconnected successfully',
        status: 'Disconnected'
      });
    });

    it('should handle error thrown in disconnectDatabase', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.disconnectDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to disconnect from database',
        error: 'fail'
      }));
    });
  });

  // getDatabaseDetails
  describe('getDatabaseDetails', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.getDatabaseDetails(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should return details for external', async () => {
      const connection = {
        get: function () {
          return {
            id: 1,
            name: 'external',
            server_type: 'external',
            connection_string: 'some-conn-string'
          };
        }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      await databaseController.getDatabaseDetails(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        database: expect.objectContaining({
          server_type: 'external',
          connection_string: 'some-conn-string'
        })
      });
    });

    it('should return details for local (no password)', async () => {
      const connection = {
        get: function () {
          return {
            id: 1,
            name: 'local',
            server_type: 'local',
            password: 'secret'
          };
        }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      await databaseController.getDatabaseDetails(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        database: expect.objectContaining({
          server_type: 'local',
          password: ''
        })
      });
    });

    it('should handle error', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.getDatabaseDetails(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to get database details',
        error: 'fail'
      }));
    });
  });

  // getDatabaseSchema
  describe('getDatabaseSchema', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should return 400 if not connected', async () => {
      const connection = { status: 'Disconnected' };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params.id = 1;
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database is not connected. Please connect first to view schema.'
      });
    });

    it('should return tables for PostgreSQL', async () => {
      const connection = {
        status: 'Connected',
        type: 'PostgreSQL',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        database: 'test',
        ssl: false,
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params.id = 1;
      mockSequelize.query.mockResolvedValueOnce([{ table_name: 'table1' }, { table_name: 'table2' }]);
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        tables: ['table1', 'table2'],
        collections: [],
        databaseType: 'PostgreSQL'
      }));
    });

    it('should return tables for MySQL', async () => {
      const connection = {
        status: 'Connected',
        type: 'MySQL',
        server_type: 'local',
        host: 'localhost',
        port: '3306',
        username: 'mysql',
        password: 'pw',
        database: 'test',
        ssl: false,
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params.id = 1;
      mockSequelize.query.mockResolvedValueOnce([{ table_name: 'table1' }, { table_name: 'table2' }]);
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        tables: ['table1', 'table2'],
        collections: [],
        databaseType: 'MySQL'
      }));
    });

    it('should return collections for MongoDB', async () => {
      const connection = {
        status: 'Connected',
        type: 'MongoDB',
        server_type: 'local',
        host: 'localhost',
        port: '27017',
        username: 'mongo',
        password: 'pw',
        database: 'test',
        ssl: false,
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params.id = 1;
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        tables: [],
        collections: ['users', 'posts'],
        databaseType: 'MongoDB'
      }));
    });

    it('should handle error thrown in getDatabaseSchema', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.getDatabaseSchema(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to fetch database schema',
        error: 'fail'
      }));
    });
  });

  // getTableData
  describe('getTableData', () => {
    it('should return 400 if invalid tableName', async () => {
      mockReq.params = { id: 1, tableName: '' };
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid table name'
      });
    });

    it('should return 404 if connection not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params = { id: 1, tableName: 'table1' };
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should return 400 if not connected', async () => {
      const connection = { status: 'Disconnected' };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params = { id: 1, tableName: 'table1' };
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database is not connected. Please connect first to view data.'
      });
    });

    it('should return data for PostgreSQL/MySQL', async () => {
      const connection = {
        status: 'Connected',
        type: 'PostgreSQL',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'pw',
        database: 'test',
        ssl: false,
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params = { id: 1, tableName: 'table1' };
      mockSequelize.query.mockResolvedValueOnce([{ id: 1, col: 'val1' }]);
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, col: 'val1' }],
        message: 'Data fetched successfully'
      });
    });

    it('should return data for MongoDB', async () => {
      const connection = {
        status: 'Connected',
        type: 'MongoDB',
        server_type: 'local',
        host: 'localhost',
        port: '27017',
        username: 'mongo',
        password: 'pw',
        database: 'test',
        ssl: false,
        get: function () { return this; }
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      mockReq.params = { id: 1, tableName: 'users' };
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ _id: 1, name: "doc1" }],
        message: 'Data fetched successfully'
      });
    });

    it('should handle error thrown in getTableData', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      mockReq.params = { id: 1, tableName: 'table1' };
      await databaseController.getTableData(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to fetch table data',
        error: 'fail'
      }));
    });
  });

  // updateDatabase
  describe('updateDatabase', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should return 400 if new name already exists', async () => {
      const connection = { name: 'old', id: 2, get: function () { return this; } };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce({ id: 3 });
      mockReq.params.id = 2;
      mockReq.body = { name: 'duplicate', server_type: 'local' };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection with this name already exists'
      });
    });

    it('should return 400 if local connection exists', async () => {
      const connection = { name: 'old', id: 2, get: function () { return this; } };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 4 });
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'local',
        host: 'localhost',
        port: '5432',
        type: 'PostgreSQL',
        database: 'db'
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A connection to this database already exists'
      });
    });

    it('should return 400 if external connection exists', async () => {
      const connection = { name: 'old', id: 2, get: function () { return this; } };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 4 });
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'external',
        connection_string: 'external-string'
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'This external connection already exists'
      });
    });

    it('should return 400 if test fails', async () => {
      const connection = {
        name: 'old',
        id: 2,
        password: 'pw',
        get: function () { return this; },
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        database: 'newdb'
      };
      mockSequelize.authenticate.mockRejectedValueOnce({ message: 'fail' });

      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        status: 'Disconnected'
      }));
    });

    it('should update and return success', async () => {
      const connection = {
        name: 'old',
        id: 2,
        password: 'pw',
        get: function () { return { id: 2, name: 'unique', password: 'pw' }; },
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        database: 'newdb',
        ssl: true
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        database: expect.any(Object)
      }));
    });

    it('should handle error thrown in updateDatabase', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to update database connection',
        error: 'fail'
      }));
    });

    it('should return error for unsupported type in updateDatabase', async () => {
      const connection = {
        name: 'old',
        id: 2,
        password: 'pw',
        get: function () { return this; },
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'local',
        type: 'Oracle',
        host: 'localhost',
        port: '1521',
        username: 'oracle',
        database: 'newdb'
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0]).toMatchObject({
        success: false,
        status: 'Disconnected',
        message: expect.stringContaining('Unsupported database type')
      });
    });

    it('should update password only if provided', async () => {
      const connection = {
        name: 'old',
        id: 2,
        password: 'pw',
        get: function () { return { id: 2, name: 'unique', password: 'pw' }; },
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        database: 'newdb',
        ssl: true
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(connection.update.mock.calls[0][0]).not.toHaveProperty('password');
    });

    it('should update external connection fields', async () => {
      const connection = {
        name: 'old',
        id: 2,
        password: 'pw',
        get: function () { return { id: 2, name: 'unique', password: 'pw', server_type: 'external' }; },
        update: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      DatabaseConnection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockReq.params.id = 2;
      mockReq.body = {
        name: 'unique',
        server_type: 'external',
        type: 'PostgreSQL',
        connection_string: 'external-string',
        ssl: true
      };
      await databaseController.updateDatabase(mockReq, mockRes);
      expect(connection.update).toHaveBeenCalledWith(expect.objectContaining({
        host: null,
        port: null,
        username: null,
        password: null,
        connection_string: 'external-string'
      }));
    });
  });

  // deleteDatabase
  describe('deleteDatabase', () => {
    it('should return 404 if not found', async () => {
      DatabaseConnection.findByPk.mockResolvedValue(null);
      mockReq.params.id = 1;
      await databaseController.deleteDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection not found'
      });
    });

    it('should destroy and return success', async () => {
      const connection = {
        destroy: jest.fn().mockResolvedValue()
      };
      DatabaseConnection.findByPk.mockResolvedValue(connection);
      await databaseController.deleteDatabase(mockReq, mockRes);
      expect(connection.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Database connection deleted successfully'
      });
    });

    it('should handle error', async () => {
      DatabaseConnection.findByPk.mockImplementation(() => { throw new Error('fail'); });
      await databaseController.deleteDatabase(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to delete database connection',
        error: 'fail'
      }));
    });
  });
});