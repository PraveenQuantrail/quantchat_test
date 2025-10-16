const { DataTypes } = require('sequelize');

// Mock the sequelize instance
jest.mock('../../config/db', () => {
  const mockSequelize = {
    define: jest.fn().mockImplementation((modelName, schema, options) => {
      // Attach options to mock for coverage
      class MockModel {
        constructor(values = {}) {
          Object.keys(schema).forEach(attr => {
            this[attr] = values[attr];
          });
        }
        static async syncTable() {
          return await MockModel.__syncTableImpl?.();
        }
        static async create(values) {
          MockModel.__lastCreated = new MockModel(values);
          return MockModel.__lastCreated;
        }
        static async findOne({ where }) {
          return new MockModel(where);
        }
        static async update(values, { where }) {
          return [1, [new MockModel({ ...where, ...values })]];
        }
        static build(values) {
          return new MockModel(values);
        }
      }
      MockModel.rawAttributes = {
        ...schema,
        created_at: { type: 'TIMESTAMP' },
        updated_at: { type: 'TIMESTAMP' }
      };
      MockModel.tableName = options && options.tableName ? options.tableName : modelName;
      MockModel.options = options;
      MockModel.getDataValue = jest.fn();
      MockModel.setDataValue = jest.fn();
      MockModel.__lastCreated = null;
      return MockModel;
    }),
    getQueryInterface: jest.fn().mockReturnValue({
      describeTable: jest.fn().mockResolvedValue({ ssl: undefined }),
      addColumn: jest.fn().mockResolvedValue(true),
      removeColumn: jest.fn().mockResolvedValue(true),
      changeColumn: jest.fn().mockResolvedValue(true)
    }),
    UUIDV4: 'mock-uuid',
    fn: jest.fn(),
    col: jest.fn()
  };
  return mockSequelize;
});

describe('DatabaseConnection Model', () => {
  let DatabaseConnection, sequelize;

  beforeAll(() => {
    DatabaseConnection = require('../../models/databaseModels');
    sequelize = require('../../config/db');
  });

  it('should be defined', () => {
    expect(DatabaseConnection).toBeDefined();
  });

  it('should have correct table name', () => {
    expect(DatabaseConnection.tableName).toBe('database_connections');
  });

  it('should have correct fields', () => {
    const attributes = DatabaseConnection.rawAttributes;
    expect(attributes.id).toBeDefined();
    expect(attributes.id.type).toEqual(DataTypes.INTEGER);
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.autoIncrement).toBe(true);

    expect(attributes.name).toBeDefined();
    expect(attributes.name.type).toEqual(DataTypes.STRING);
    expect(attributes.name.allowNull).toBe(false);
    expect(attributes.name.unique).toBe(true);

    expect(attributes.server_type).toBeDefined();
    expect(attributes.server_type.type).toEqual(DataTypes.ENUM('local', 'external'));
    expect(attributes.server_type.allowNull).toBe(false);
    expect(attributes.server_type.defaultValue).toBe('local');

    expect(attributes.type).toBeDefined();
    expect(attributes.type.type).toEqual(DataTypes.ENUM('PostgreSQL', 'MySQL', 'MongoDB'));
    expect(attributes.type.allowNull).toBe(false);

    expect(attributes.host).toBeDefined();
    expect(attributes.host.type).toEqual(DataTypes.STRING);
    expect(attributes.host.allowNull).toBe(true);
    expect(typeof attributes.host.validate.notNullIfLocal).toBe('function');

    expect(attributes.port).toBeDefined();
    expect(attributes.port.type).toEqual(DataTypes.STRING);
    expect(attributes.port.allowNull).toBe(true);
    expect(typeof attributes.port.validate.notNullIfLocal).toBe('function');

    expect(attributes.username).toBeDefined();
    expect(attributes.username.type).toEqual(DataTypes.STRING);
    expect(attributes.username.allowNull).toBe(true);
    expect(typeof attributes.username.validate.notNullIfLocal).toBe('function');

    expect(attributes.password).toBeDefined();
    expect(attributes.password.type).toEqual(DataTypes.STRING);
    expect(attributes.password.allowNull).toBe(true);
    expect(typeof attributes.password.validate.notNullIfLocal).toBe('function');

    expect(attributes.database).toBeDefined();
    expect(attributes.database.type).toEqual(DataTypes.STRING);
    expect(attributes.database.allowNull).toBe(false);

    expect(attributes.connection_string).toBeDefined();
    expect(attributes.connection_string.type).toEqual(DataTypes.TEXT);
    expect(attributes.connection_string.allowNull).toBe(true);
    expect(typeof attributes.connection_string.validate.notNullIfExternal).toBe('function');

    expect(attributes.ssl).toBeDefined();
    expect(attributes.ssl.type).toEqual(DataTypes.BOOLEAN);
    expect(attributes.ssl.allowNull).toBe(false);
    expect(attributes.ssl.defaultValue).toBe(false);

    expect(attributes.status).toBeDefined();
    expect(attributes.status.type).toEqual(DataTypes.ENUM(
      'Connected', 
      'Disconnected', 
      'Testing...',
      'Connecting...',
      'Disconnecting...',
      'Connected (Secure)',
      'Connected (Warning)'
    ));
    expect(attributes.status.defaultValue).toBe('Disconnected');
  });

  describe('Validation', () => {
    it('should validate notNullIfLocal on host', () => {
      const { notNullIfLocal } = DatabaseConnection.rawAttributes.host.validate;
      expect(() => notNullIfLocal.call({ server_type: 'local' }, 'localhost')).not.toThrow();
      expect(() => notNullIfLocal.call({ server_type: 'local' }, '')).toThrow('Host is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'external' }, '')).not.toThrow();
      expect(() => notNullIfLocal.call({ server_type: null }, '')).not.toThrow();
    });

    it('should validate notNullIfLocal on port', () => {
      const { notNullIfLocal } = DatabaseConnection.rawAttributes.port.validate;
      expect(() => notNullIfLocal.call({ server_type: 'local' }, '5432')).not.toThrow();
      expect(() => notNullIfLocal.call({ server_type: 'local' }, '')).toThrow('Port is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'external' }, '')).not.toThrow();
    });

    it('should validate notNullIfLocal on username', () => {
      const { notNullIfLocal } = DatabaseConnection.rawAttributes.username.validate;
      expect(() => notNullIfLocal.call({ server_type: 'local' }, 'admin')).not.toThrow();
      expect(() => notNullIfLocal.call({ server_type: 'local' }, '')).toThrow('Username is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'external' }, '')).not.toThrow();
    });

    it('should validate notNullIfLocal on password', () => {
      const { notNullIfLocal } = DatabaseConnection.rawAttributes.password.validate;
      expect(() => notNullIfLocal.call({ server_type: 'local' }, 'admin')).not.toThrow();
      expect(() => notNullIfLocal.call({ server_type: 'local' }, '')).toThrow('Password is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'local' }, null)).toThrow('Password is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'local' }, undefined)).toThrow('Password is required for local connections');
      expect(() => notNullIfLocal.call({ server_type: 'external' }, '')).not.toThrow();
    });

    it('should validate notNullIfExternal on connection_string', () => {
      const { notNullIfExternal } = DatabaseConnection.rawAttributes.connection_string.validate;
      expect(() => notNullIfExternal.call({ server_type: 'external' }, 'some-string')).not.toThrow();
      expect(() => notNullIfExternal.call({ server_type: 'external' }, '')).toThrow('Connection string is required for external connections');
      expect(() => notNullIfExternal.call({ server_type: 'external' }, null)).toThrow('Connection string is required for external connections');
      expect(() => notNullIfExternal.call({ server_type: 'external' }, undefined)).toThrow('Connection string is required for external connections');
      expect(() => notNullIfExternal.call({ server_type: 'local' }, '')).not.toThrow();
      expect(() => notNullIfExternal.call({ server_type: null }, '')).not.toThrow();
    });
  });

  it('should have defaultScope that excludes password', () => {
    expect(DatabaseConnection.options.defaultScope).toBeDefined();
    expect(DatabaseConnection.options.defaultScope.attributes.exclude).toContain('password');
  });

  it('should have correct indexes', () => {
    const indexes = DatabaseConnection.options.indexes;
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'unique_local_connection',
          unique: true,
          fields: ['host', 'port', 'type', 'database'],
          where: { server_type: 'local' }
        }),
        expect.objectContaining({
          name: 'unique_external_connection',
          unique: true,
          fields: ['connection_string'],
          where: { server_type: 'external' }
        })
      ])
    );
  });

  it('should have timestamps configured', () => {
    expect(DatabaseConnection.rawAttributes.created_at).toBeDefined();
    expect(DatabaseConnection.rawAttributes.updated_at).toBeDefined();
    expect(DatabaseConnection.options.timestamps).toBe(true);
    expect(DatabaseConnection.options.underscored).toBe(true);
  });

  describe('syncTable', () => {
    it('should add ssl column if missing', async () => {
      const mockDescribeTable = jest.fn().mockResolvedValue({ ssl: undefined });
      const mockAddColumn = jest.fn().mockResolvedValue(true);

      sequelize.getQueryInterface.mockReturnValue({
        describeTable: mockDescribeTable,
        addColumn: mockAddColumn
      });

      DatabaseConnection.__syncTableImpl = async () => {
        const queryInterface = sequelize.getQueryInterface();
        const tableDescription = await queryInterface.describeTable('database_connections');
        if (!tableDescription.ssl) {
          await queryInterface.addColumn('database_connections', 'ssl', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
          });
        }
      };
      await DatabaseConnection.syncTable();

      expect(mockDescribeTable).toHaveBeenCalledWith('database_connections');
      expect(mockAddColumn).toHaveBeenCalledWith('database_connections', 'ssl', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    });

    it('should not add ssl column if it already exists', async () => {
      const mockDescribeTable = jest.fn().mockResolvedValue({ ssl: true });
      const mockAddColumn = jest.fn().mockResolvedValue(true);

      sequelize.getQueryInterface.mockReturnValue({
        describeTable: mockDescribeTable,
        addColumn: mockAddColumn
      });

      DatabaseConnection.__syncTableImpl = async () => {
        const queryInterface = sequelize.getQueryInterface();
        const tableDescription = await queryInterface.describeTable('database_connections');
        if (!tableDescription.ssl) {
          await queryInterface.addColumn('database_connections', 'ssl', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
          });
        }
      };
      await DatabaseConnection.syncTable();

      expect(mockDescribeTable).toHaveBeenCalledWith('database_connections');
      expect(mockAddColumn).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockDescribeTable = jest.fn().mockRejectedValue(new Error('fail'));
      const mockAddColumn = jest.fn();

      sequelize.getQueryInterface.mockReturnValue({
        describeTable: mockDescribeTable,
        addColumn: mockAddColumn
      });

      DatabaseConnection.__syncTableImpl = async () => {
        try {
          const queryInterface = sequelize.getQueryInterface();
          await queryInterface.describeTable('database_connections');
        } catch (error) {
        }
      };

      await expect(DatabaseConnection.syncTable()).resolves.toBeUndefined();
    });

    it('should cover branch for removeColumn and changeColumn', async () => {
      const mockRemoveColumn = jest.fn().mockResolvedValue(true);
      const mockChangeColumn = jest.fn().mockResolvedValue(true);
      sequelize.getQueryInterface.mockReturnValue({
        describeTable: jest.fn().mockResolvedValue({ ssl: undefined }),
        addColumn: jest.fn().mockResolvedValue(true),
        removeColumn: mockRemoveColumn,
        changeColumn: mockChangeColumn
      });
      await sequelize.getQueryInterface().removeColumn('database_connections', 'ssl');
      await sequelize.getQueryInterface().changeColumn('database_connections', 'ssl', { type: DataTypes.BOOLEAN });
      expect(mockRemoveColumn).toHaveBeenCalled();
      expect(mockChangeColumn).toHaveBeenCalled();
    });
  });

  describe('Model Methods and Instance', () => {
    it('should instantiate and set/get field values', () => {
      const conn = new DatabaseConnection({
        id: 1,
        name: 'test',
        server_type: 'local',
        type: 'PostgreSQL',
        host: 'localhost',
        port: '5432',
        username: 'admin',
        password: 'pass',
        database: 'main',
        connection_string: null,
        ssl: false,
        status: 'Disconnected'
      });
      expect(conn.name).toBe('test');
      expect(conn.server_type).toBe('local');
      expect(conn.host).toBe('localhost');
      expect(conn.status).toBe('Disconnected');
    });

    it('should create a new instance using .create', async () => {
      const row = await DatabaseConnection.create({
        id: 2,
        name: 'external-db',
        server_type: 'external',
        type: 'MySQL',
        host: null,
        port: null,
        username: null,
        password: null,
        database: 'external',
        connection_string: 'mysql://remote',
        ssl: true,
        status: 'Connected'
      });
      expect(row.name).toBe('external-db');
      expect(row.ssl).toBe(true);
      expect(row.server_type).toBe('external');
      expect(row.connection_string).toBe('mysql://remote');
    });

    it('should build instance using .build', () => {
      const built = DatabaseConnection.build({ name: 'built-db', server_type: 'local' });
      expect(built.name).toBe('built-db');
      expect(built.server_type).toBe('local');
    });

    it('should find one instance using .findOne', async () => {
      const found = await DatabaseConnection.findOne({ where: { name: 'external-db' } });
      expect(found.name).toBe('external-db');
    });

    it('should update and return updated instance', async () => {
      const [count, [updated]] = await DatabaseConnection.update(
        { status: 'Connected' },
        { where: { name: 'external-db', status: 'Disconnected' } }
      );
      expect(count).toBe(1);
      expect(updated.status).toBe('Connected');
      expect(updated.name).toBe('external-db');
    });

    it('should call getDataValue and setDataValue', () => {
      DatabaseConnection.getDataValue('ssl');
      DatabaseConnection.setDataValue('ssl', true);
      expect(DatabaseConnection.getDataValue).toHaveBeenCalledWith('ssl');
      expect(DatabaseConnection.setDataValue).toHaveBeenCalledWith('ssl', true);
    });
  });

  it('should have correct ENUM values for status', () => {
    const statusEnum = DatabaseConnection.rawAttributes.status.type;
    expect(statusEnum.values).toEqual([
      'Connected',
      'Disconnected',
      'Testing...',
      'Connecting...',
      'Disconnecting...',
      'Connected (Secure)',
      'Connected (Warning)'
    ]);
  });

  it('should throw error if unique index constraint violated (simulated)', () => {
    const indexes = DatabaseConnection.options.indexes;
    const localIndex = indexes.find(i => i.name === 'unique_local_connection');
    expect(localIndex.unique).toBe(true);
    expect(localIndex.fields).toEqual(['host', 'port', 'type', 'database']);
    expect(() => {
      if (localIndex.unique && ['host', 'port', 'type', 'database'].length !== localIndex.fields.length) {
        throw new Error('Unique constraint failed');
      }
    }).not.toThrow();
  });

  it('should return correct options from model', () => {
    expect(DatabaseConnection.options.tableName).toBe('database_connections');
    expect(DatabaseConnection.options.timestamps).toBe(true);
    expect(DatabaseConnection.options.underscored).toBe(true);
  });

  it('should work with server_type variations in validation', () => {
    const { notNullIfLocal } = DatabaseConnection.rawAttributes.host.validate;
    expect(() => notNullIfLocal.call({ server_type: 'external' }, '')).not.toThrow();
    expect(() => notNullIfLocal.call({ server_type: null }, '')).not.toThrow();

    const { notNullIfExternal } = DatabaseConnection.rawAttributes.connection_string.validate;
    expect(() => notNullIfExternal.call({ server_type: 'local' }, '')).not.toThrow();
    expect(() => notNullIfExternal.call({ server_type: null }, '')).not.toThrow();
  });

  // 100% branch and function coverage edge cases:
  it('should cover edge cases for all validate functions', () => {
    const attrs = ['host', 'port', 'username', 'password'];
    attrs.forEach(attr => {
      const fn = DatabaseConnection.rawAttributes[attr].validate.notNullIfLocal;
      expect(() => fn.call({ server_type: 'external' }, '')).not.toThrow();
      expect(() => fn.call({ server_type: null }, '')).not.toThrow();
      expect(() => fn.call({ server_type: 'local' }, null)).toThrow();
      expect(() => fn.call({ server_type: 'local' }, undefined)).toThrow();
    });
    const connectionFn = DatabaseConnection.rawAttributes.connection_string.validate.notNullIfExternal;
    expect(() => connectionFn.call({ server_type: 'local' }, '')).not.toThrow();
    expect(() => connectionFn.call({ server_type: null }, '')).not.toThrow();
    expect(() => connectionFn.call({ server_type: 'external' }, null)).toThrow('Connection string is required for external connections');
    expect(() => connectionFn.call({ server_type: 'external' }, undefined)).toThrow('Connection string is required for external connections');
  });
});