const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DatabaseConnection = sequelize.define('DatabaseConnection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  server_type: {
    type: DataTypes.ENUM('local', 'external'),
    allowNull: false,
    defaultValue: 'local'
  },
  type: {
    type: DataTypes.ENUM('PostgreSQL', 'MySQL', 'MongoDB', 'ClickHouse'),
    allowNull: false
  },
  host: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      notNullIfLocal(value) {
        if (this.server_type === 'local' && (value === null || value === undefined || value === '')) {
          throw new Error('Host is required for local connections');
        }
      }
    }
  },
  port: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      notNullIfLocal(value) {
        if (this.server_type === 'local' && (value === null || value === undefined || value === '')) {
          throw new Error('Port is required for local connections');
        }
      }
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      notNullIfLocal(value) {
        if (this.server_type === 'local' && (value === null || value === undefined || value === '')) {
          throw new Error('Username is required for local connections');
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      notNullIfLocal(value) {
        if (this.server_type === 'local' && (value === null || value === undefined || value === '')) {
          throw new Error('Password is required for local connections');
        }
      }
    }
  },
  database: {
    type: DataTypes.STRING,
    allowNull: false
  },
  connection_string: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      notNullIfExternal(value) {
        if (this.server_type === 'external' && (value === null || value === undefined || value === '')) {
          throw new Error('Connection string is required for external connections');
        }
      }
    }
  },
  ssl: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM(
      'Connected', 
      'Disconnected', 
      'Testing...',
      'Connecting...',
      'Disconnecting...',
      'Connected (Secure)',
      'Connected (Warning)'
    ),
    defaultValue: 'Disconnected'
  }
}, {
  timestamps: true,
  tableName: 'database_connections',
  underscored: true,
  defaultScope: {
    attributes: {
      exclude: ['password'] // Exclude password from default queries
    }
  },
  indexes: [
    {
      name: 'unique_local_connection',
      unique: true,
      fields: ['host', 'port', 'type', 'database'],
      where: {
        server_type: 'local'
      }
    },
    {
      name: 'unique_external_connection',
      unique: true,
      fields: ['connection_string'],
      where: {
        server_type: 'external'
      }
    }
  ]
});

// Method to sync the table with the model
DatabaseConnection.syncTable = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    // Check if ssl column exists
    const tableDescription = await queryInterface.describeTable('database_connections');
    if (!tableDescription.ssl) {
      await queryInterface.addColumn('database_connections', 'ssl', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('Added ssl column to database_connections table');
    }
  } catch (error) {
    console.error('Error syncing database_connections table:', error);
  }
};

module.exports = DatabaseConnection;