const { Sequelize } = require('sequelize');
const { createClient } = require('@clickhouse/client');
const DatabaseConnection = require('../models/databaseModels');
const usersController = require('./usersController');

async function testDatabaseConnection(connectionDetails) {
  try {
    let isSecure = false;
    let warning = null;
    let message = '';

    if (connectionDetails.server_type === 'external' && connectionDetails.connection_string) {
      switch (connectionDetails.type) {
        case 'PostgreSQL':
        case 'MySQL': {
          const sequelize = new Sequelize(connectionDetails.connection_string, {
            logging: false,
            dialectOptions: {
              connectTimeout: 5000,
              ssl: connectionDetails.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          });

          await sequelize.authenticate();
          await sequelize.close();
          isSecure = connectionDetails.ssl;
          message = 'Connection successful to external database';
          break;
        }
        case 'ClickHouse': {
          let client;
          let config = {};
          
          // Parse connection string and validate
          if (connectionDetails.connection_string.includes('://')) {
            config.url = connectionDetails.connection_string;
          } else {
            config.url = `http://${connectionDetails.connection_string}:8123/default`;
          }
          
          config.request_timeout = 5000;
          
          client = createClient(config);

          // Test connection by executing a simple query
          await client.query({
            query: 'SELECT 1 as test',
            format: 'JSONEachRow'
          });

          // Extract database name from URL for validation
          let dbName = 'default';
          const urlMatch = config.url.match(/\/\/([^:]+:[^@]+@)?[^\/]+\/([^?]+)/);
          if (urlMatch && urlMatch[2]) {
            dbName = urlMatch[2];
          }

          // Check if database exists by querying system.databases
          const dbCheck = await client.query({
            query: `SELECT name FROM system.databases WHERE name = '${dbName}'`,
            format: 'JSONEachRow'
          });
          
          const databases = await dbCheck.json();
          if (databases.length === 0) {
            throw new Error(`Database '${dbName}' does not exist`);
          }

          isSecure = connectionDetails.connection_string.startsWith('https://');
          message = `Connection successful to ClickHouse database '${dbName}'`;
          break;
        }
        case 'MongoDB': {
          throw new Error('MongoDB connections are temporarily disabled');
        }
        default:
          throw new Error('Unsupported database type for external connection');
      }
    } else {
      switch (connectionDetails.type) {
        case 'PostgreSQL':
        case 'MySQL': {
          const password = connectionDetails.password === '' ? undefined : connectionDetails.password;

          const sequelize = new Sequelize({
            dialect: connectionDetails.type.toLowerCase(),
            host: connectionDetails.host,
            port: connectionDetails.port,
            username: connectionDetails.username,
            password: password,
            database: connectionDetails.database,
            logging: false,
            dialectOptions: {
              connectTimeout: 5000,
              ssl: connectionDetails.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          });

          await sequelize.authenticate();
          await sequelize.close();

          // Check for default credentials warning
          if (connectionDetails.type === 'PostgreSQL' &&
            connectionDetails.port === '5432' &&
            connectionDetails.host === 'localhost' &&
            connectionDetails.username === 'postgres') {
            warning = 'Warning: Using default PostgreSQL credentials. Consider changing for security.';
          }

          isSecure = connectionDetails.ssl || !warning;
          message = warning || 'Connection successful';
          break;
        }
        case 'ClickHouse': {
          const password = connectionDetails.password === '' ? undefined : connectionDetails.password;
          
          // Construct proper URL for ClickHouse
          const protocol = connectionDetails.ssl ? 'https' : 'http';
          const port = connectionDetails.port || 8123;
          const database = connectionDetails.database || 'default';
          
          let url;
          if (connectionDetails.username && password) {
            url = `${protocol}://${connectionDetails.username}:${password}@${connectionDetails.host}:${port}/${database}`;
          } else if (connectionDetails.username) {
            url = `${protocol}://${connectionDetails.username}@${connectionDetails.host}:${port}/${database}`;
          } else {
            url = `${protocol}://${connectionDetails.host}:${port}/${database}`;
          }

          const client = createClient({
            url: url,
            request_timeout: 5000
          });

          // Test connection by executing a simple query
          await client.query({
            query: 'SELECT 1 as test',
            format: 'JSONEachRow'
          });

          // Check if database exists by querying system.databases
          const dbCheck = await client.query({
            query: `SELECT name FROM system.databases WHERE name = '${database}'`,
            format: 'JSONEachRow'
          });
          
          const databases = await dbCheck.json();
          if (databases.length === 0) {
            throw new Error(`Database '${database}' does not exist`);
          }

          isSecure = connectionDetails.ssl;
          message = `Connection successful to ClickHouse database '${database}'`;
          break;
        }
        case 'MongoDB': {
          throw new Error('MongoDB connections are temporarily disabled');
        }
        default:
          throw new Error('Unsupported database type');
      }
    }

    return {
      success: true,
      message,
      warning,
      isSecure
    };
  } catch (error) {
    console.error(`Connection test failed for ${connectionDetails.type}:`, error);

    let errorMessage = 'Connection failed';
    if (error.original) {
      // PostgreSQL/MySQL specific errors
      switch (error.original.code) {
        case 'ECONNREFUSED':
          errorMessage = 'Connection refused. Check if host and port are correct and server is running.';
          break;
        case 'ENOTFOUND':
          errorMessage = 'Host not found. Check the hostname or IP address.';
          break;
        case 'ETIMEDOUT':
          errorMessage = 'Connection timed out. Check network connectivity.';
          break;
        case '3D000': // PostgreSQL invalid database
          errorMessage = `Database '${connectionDetails.database}' does not exist.`;
          break;
        case '28P01': // PostgreSQL invalid password
          errorMessage = 'Authentication failed: Invalid username or password.';
          break;
        default:
          if (error.original.message.includes('password authentication failed')) {
            errorMessage = 'Authentication failed: Invalid username or password.';
          } else if (error.original.message.includes('database')) {
            errorMessage = `Database '${connectionDetails.database}' does not exist.`;
          } else {
            errorMessage = error.original.message;
          }
      }
    } else if (error.message) {
      // ClickHouse and MongoDB specific errors
      if (error.message.includes('Authentication failed') || 
          error.message.includes('password is incorrect') ||
          error.message.includes('Wrong credentials') ||
          error.message.includes('401') ||
          error.message.includes('403')) {
        errorMessage = 'Authentication failed: Invalid username or password.';
      } else if (error.message.includes('getaddrinfo ENOTFOUND') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Host not found. Check the hostname or IP address.';
      } else if (error.message.includes('connection timed out') || errorMessage.includes('timeout')) {
        errorMessage = 'Connection timed out. Check network connectivity.';
      } else if (error.message.includes('MongoDB connections are temporarily disabled')) {
        errorMessage = 'MongoDB connections are temporarily disabled.';
      } else if (error.message.includes('ClickHouse URL is malformed')) {
        errorMessage = 'Invalid ClickHouse connection format. For external connections, use full URL format: http[s]://[username:password@]hostname:port[/database]';
      } else if (error.message.includes('does not exist')) {
        errorMessage = error.message;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Check if host and port are correct and server is running.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: `${connectionDetails.type} connection failed: ${errorMessage}`
    };
  }
}

module.exports = {
  getAllDatabases: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await DatabaseConnection.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password'] } // Always exclude password
      });

      res.json({
        success: true,
        databases: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      console.error('Error fetching databases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch databases',
        error: error.message
      });
    }
  },

  addDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const {
        name,
        server_type,
        type,
        host,
        port,
        username,
        password,
        database,
        connection_string,
        ssl = false
      } = req.body;

      // Disable MongoDB connections
      if (type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      if (server_type === 'local') {
        if (!host || !port || !username || password === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Host, port, username, and password are required for local connections'
          });
        }
      } else if (server_type === 'external') {
        if (!connection_string) {
          return res.status(400).json({
            success: false,
            message: 'Connection string is required for external connections'
          });
        }
      }

      const existingName = await DatabaseConnection.findOne({ where: { name } });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'Database connection with this name already exists'
        });
      }

      if (server_type === 'local') {
        const existingConnection = await DatabaseConnection.findOne({
          where: {
            host,
            port,
            type,
            database,
            server_type: 'local'
          }
        });

        if (existingConnection) {
          return res.status(400).json({
            success: false,
            message: 'A connection to this database already exists'
          });
        }
      } else {
        const existingConnection = await DatabaseConnection.findOne({
          where: {
            connection_string,
            server_type: 'external'
          }
        });

        if (existingConnection) {
          return res.status(400).json({
            success: false,
            message: 'This external connection already exists'
          });
        }
      }

      const testResult = await testDatabaseConnection({
        server_type,
        type,
        host,
        port,
        username,
        password,
        database,
        connection_string,
        ssl
      });

      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          message: testResult.message,
          status: 'Disconnected'
        });
      }

      const status = testResult.isSecure ? 'Connected' :
        testResult.warning ? 'Connected (Warning)' : 'Connected';

      const newConnection = await DatabaseConnection.create({
        name,
        server_type,
        type,
        host: server_type === 'local' ? host : null,
        port: server_type === 'local' ? port : null,
        username: server_type === 'local' ? username : null,
        password: server_type === 'local' ? password : null,
        database,
        connection_string: server_type === 'external' ? connection_string : null,
        ssl,
        status
      });

      const responseData = newConnection.get({ plain: true });
      delete responseData.password;

      res.status(201).json({
        success: true,
        message: testResult.warning ? testResult.warning : 'Database connection added successfully',
        database: responseData
      });
    } catch (error) {
      console.error('Error adding database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add database connection',
        error: error.message
      });
    }
  },

  testDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      // Disable MongoDB testing
      if (connection.type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      await connection.update({ status: 'Testing...' });

      // Get the actual password from database for testing
      const connectionWithPassword = await DatabaseConnection.findByPk(id, {
        attributes: { include: ['password'] } // Include password for testing
      });

      const testResult = await testDatabaseConnection(connectionWithPassword);

      if (testResult.success) {
        const status = testResult.isSecure ? 'Connected' :
          testResult.warning ? 'Connected (Warning)' : 'Connected';

        await connection.update({ status });
        return res.json({
          success: true,
          message: testResult.warning ? testResult.warning : testResult.message,
          status
        });
      }

      await connection.update({ status: 'Disconnected' });
      return res.status(400).json({
        success: false,
        message: testResult.message,
        status: 'Disconnected'
      });
    } catch (error) {
      console.error('Error testing database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test database connection',
        error: error.message
      });
    }
  },

  connectDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      // Disable MongoDB connections
      if (connection.type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      await connection.update({ status: 'Connecting...' });

      // Get the actual password from database for testing
      const connectionWithPassword = await DatabaseConnection.findByPk(id, {
        attributes: { include: ['password'] } // Include password for testing
      });

      const testResult = await testDatabaseConnection(connectionWithPassword);

      if (testResult.success) {
        const status = testResult.isSecure ? 'Connected' :
          testResult.warning ? 'Connected (Warning)' : 'Connected';

        await connection.update({ status });

        console.log(testResult)
        return res.json({
          success: true,
          message: testResult.warning ? testResult.warning : 'Database connected successfully',
          status,
          databasedetails:connectionWithPassword.get()
        });
      }

      await connection.update({ status: 'Disconnected' });
      return res.status(400).json({
        success: false,
        message: testResult.message,
        status: 'Disconnected'
      });
    } catch (error) {
      console.error('Error connecting to database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect to database',
        error: error.message
      });
    }
  },

  disconnectDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      await connection.update({ status: 'Disconnecting...' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await connection.update({ status: 'Disconnected' });

      return res.json({
        success: true,
        message: 'Database disconnected successfully',
        status: 'Disconnected'
      });
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect from database',
        error: error.message
      });
    }
  },

  getDatabaseDetails: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      const responseData = connection.get({ plain: true });
      // Return connection string for external connections
      if (responseData.server_type === 'external') {
        responseData.connection_string = responseData.connection_string;
      } else {
        responseData.password = ''; // Never return the actual password (for security reasons)
      }

      res.json({
        success: true,
        database: responseData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get database details',
        error: error.message
      });
    }
  },

  getDatabaseSchema: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id, {
        attributes: { include: ['password'] }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      // Disable MongoDB schema fetching
      if (connection.type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      let tables = [];
      let collections = [];

      if (connection.status !== 'Connected' && connection.status !== 'Connected (Warning)') {
        return res.status(400).json({
          success: false,
          message: 'Database is not connected. Please connect first to view schema.'
        });
      }

      if (connection.type === 'PostgreSQL' || connection.type === 'MySQL') {
        let sequelizeConfig;

        if (connection.server_type === 'local') {
          const password = connection.password === '' ? undefined : connection.password;
          sequelizeConfig = {
            dialect: connection.type.toLowerCase(),
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: password,
            database: connection.database,
            logging: false,
            dialectOptions: {
              ssl: connection.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          };
        } else {
          sequelizeConfig = {
            dialect: connection.type.toLowerCase(),
            logging: false,
            dialectOptions: {
              ssl: connection.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          };
        }

        const tempSequelize = connection.server_type === 'external' ?
          new Sequelize(connection.connection_string, sequelizeConfig) :
          new Sequelize(sequelizeConfig);

        try {
          await tempSequelize.authenticate();

          // Log the actual DB name being used
          if (connection.type === 'MySQL') {
            await tempSequelize.query('SELECT DATABASE() as db');
          } else if (connection.type === 'PostgreSQL') {
            await tempSequelize.query('SELECT current_database() as db');
          }

          if (connection.type === 'PostgreSQL') {
            const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
          `;
            const result = await tempSequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
            tables = result
              .map(row => row.table_name || row.TABLE_NAME)
              .filter(name => typeof name === 'string' && name.length > 0);
          } else if (connection.type === 'MySQL') {
            const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
            ORDER BY table_name;
          `;
            const result = await tempSequelize.query(query, {
              replacements: [connection.database],
              type: Sequelize.QueryTypes.SELECT
            });
            tables = result
              .map(row => row.table_name || row.TABLE_NAME)
              .filter(name => typeof name === 'string' && name.length > 0);
          }

          await tempSequelize.close();
        } catch (error) {
          await tempSequelize.close();
          throw error;
        }
      } else if (connection.type === 'ClickHouse') {
        let client;
        try {
          if (connection.server_type === 'local') {
            const password = connection.password === '' ? undefined : connection.password;
            const protocol = connection.ssl ? 'https' : 'http';
            const port = connection.port || 8123;
            const database = connection.database || 'default';
            
            let url;
            if (connection.username && password) {
              url = `${protocol}://${connection.username}:${password}@${connection.host}:${port}/${database}`;
            } else if (connection.username) {
              url = `${protocol}://${connection.username}@${connection.host}:${port}/${database}`;
            } else {
              url = `${protocol}://${connection.host}:${port}/${database}`;
            }

            client = createClient({
              url: url,
              request_timeout: 5000
            });
          } else {
            // For external connections
            let url = connection.connection_string;
            // If it's just a hostname, construct proper URL
            if (!connection.connection_string.includes('://')) {
              url = `http://${connection.connection_string}:8123/default`;
            }
            
            client = createClient({
              url: url,
              request_timeout: 5000
            });
          }

          // Get tables from ClickHouse
          const dbName = connection.database || 'default';
          const result = await client.query({
            query: `SELECT name FROM system.tables WHERE database = '${dbName}'`,
            format: 'JSONEachRow'
          });

          const rows = await result.json();
          tables = rows.map(row => row.name).filter(name => typeof name === 'string' && name.length > 0);
          
        } catch (error) {
          throw error;
        }
      }

      res.json({
        success: true,
        tables,
        collections,
        databaseType: connection.type
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch database schema',
        error: error.message
      });
    }
  },

  getTableData: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id, tableName } = req.params;

      if (!tableName || tableName === 'null' || tableName === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'Invalid table name'
        });
      }

      const connection = await DatabaseConnection.findByPk(id, {
        attributes: { include: ['password'] }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      // Disable MongoDB data fetching
      if (connection.type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      if (connection.status !== 'Connected' && connection.status !== 'Connected (Warning)') {
        return res.status(400).json({
          success: false,
          message: 'Database is not connected. Please connect first to view data.'
        });
      }

      let data = [];

      if (connection.type === 'PostgreSQL' || connection.type === 'MySQL') {
        let sequelizeConfig;

        if (connection.server_type === 'local') {
          const password = connection.password === '' ? undefined : connection.password;
          sequelizeConfig = {
            dialect: connection.type.toLowerCase(),
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: password,
            database: connection.database,
            logging: false,
            dialectOptions: {
              ssl: connection.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          };
        } else {
          sequelizeConfig = {
            dialect: connection.type.toLowerCase(),
            logging: false,
            dialectOptions: {
              ssl: connection.ssl ? {
                require: true,
                rejectUnauthorized: false
              } : false
            }
          };
        }

        const tempSequelize = connection.server_type === 'external' ?
          new Sequelize(connection.connection_string, sequelizeConfig) :
          new Sequelize(sequelizeConfig);

        try {
          await tempSequelize.authenticate();

          let query;
          if (connection.type === 'MySQL') {
            query = `SELECT * FROM \`${tableName}\` LIMIT 50`;
          } else {
            query = `SELECT * FROM "${tableName}" LIMIT 50`;
          }
          const result = await tempSequelize.query(query, {
            type: Sequelize.QueryTypes.SELECT
          });

          data = result;
          await tempSequelize.close();
        } catch (error) {
          await tempSequelize.close();
          throw error;
        }
      } else if (connection.type === 'ClickHouse') {
        let client;
        try {
          if (connection.server_type === 'local') {
            const password = connection.password === '' ? undefined : connection.password;
            const protocol = connection.ssl ? 'https' : 'http';
            const port = connection.port || 8123;
            const database = connection.database || 'default';
            
            let url;
            if (connection.username && password) {
              url = `${protocol}://${connection.username}:${password}@${connection.host}:${port}/${database}`;
            } else if (connection.username) {
              url = `${protocol}://${connection.username}@${connection.host}:${port}/${database}`;
            } else {
              url = `${protocol}://${connection.host}:${port}/${database}`;
            }

            client = createClient({
              url: url,
              request_timeout: 5000
            });
          } else {
            // For external connections
            let url = connection.connection_string;
            // If it's just a hostname, construct proper URL
            if (!connection.connection_string.includes('://')) {
              url = `http://${connection.connection_string}:8123/default`;
            }
            
            client = createClient({
              url: url,
              request_timeout: 5000
            });
          }

          const result = await client.query({
            query: `SELECT * FROM ${tableName} LIMIT 50`,
            format: 'JSONEachRow'
          });

          data = await result.json();
          
        } catch (error) {
          throw error;
        }
      }

      res.json({
        success: true,
        data: data,
        message: 'Data fetched successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch table data',
        error: error.message
      });
    }
  },

  updateDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const {
        name,
        server_type,
        type,
        host,
        port,
        username,
        password,
        database,
        connection_string,
        ssl = false
      } = req.body;

      // Disable MongoDB updates
      if (type === 'MongoDB') {
        return res.status(400).json({
          success: false,
          message: 'MongoDB connections are temporarily disabled'
        });
      }

      const connection = await DatabaseConnection.findByPk(id, {
        attributes: { include: ['password'] } // Include password for testing
      });
      
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      // Check if name is being changed and if new name already exists
      if (name && name !== connection.name) {
        const existingName = await DatabaseConnection.findOne({
          where: { name },
          attributes: ['id']
        });

        if (existingName && existingName.id !== parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Database connection with this name already exists'
          });
        }
      }

      // For local connections, check if host/port/type/database combination exists
      if (server_type === 'local') {
        const existingConnection = await DatabaseConnection.findOne({
          where: {
            host,
            port,
            type,
            database,
            server_type: 'local',
            id: { [Sequelize.Op.not]: id } // Exclude current connection
          }
        });

        if (existingConnection) {
          return res.status(400).json({
            success: false,
            message: 'A connection to this database already exists'
          });
        }
      } else {
        // For external connections, check if connection string exists
        const existingConnection = await DatabaseConnection.findOne({
          where: {
            connection_string,
            server_type: 'external',
            id: { [Sequelize.Op.not]: id } // Exclude current connection
          }
        });

        if (existingConnection) {
          return res.status(400).json({
            success: false,
            message: 'This external connection already exists'
          });
        }
      }
      
      const passwordToTest = password !== undefined ? password : connection.password;

      // Test the connection before updating
      const testResult = await testDatabaseConnection({
        server_type,
        type,
        host,
        port,
        username,
        password: passwordToTest,
        database,
        connection_string,
        ssl
      });

      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          message: testResult.message,
          status: 'Disconnected'
        });
      }

      const status = testResult.isSecure ? 'Connected' :
        testResult.warning ? 'Connected (Warning)' : 'Connected';

      const updateData = {
        name,
        server_type,
        type,
        database,
        ssl,
        status
      };

      if (server_type === 'local') {
        updateData.host = host;
        updateData.port = port;
        updateData.username = username;
        if (password !== undefined) {
          updateData.password = password;
        }
        updateData.connection_string = null;
      } else {
        updateData.host = null;
        updateData.port = null;
        updateData.username = null;
        updateData.password = null;
        updateData.connection_string = connection_string;
      }

      await connection.update(updateData);

      const responseData = connection.get({ plain: true });
      delete responseData.password;

      res.json({
        success: true,
        message: testResult.warning ? testResult.warning : 'Database connection updated successfully',
        database: responseData
      });
    } catch (error) {
      console.error('Error updating database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update database connection',
        error: error.message
      });
    }
  },

  deleteDatabase: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user token is revoked
      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const connection = await DatabaseConnection.findByPk(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Database connection not found'
        });
      }

      await connection.destroy();

      return res.json({
        success: true,
        message: 'Database connection deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete database connection',
        error: error.message
      });
    }
  }
};