const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Mock the sequelize instance
jest.mock('../../config/db', () => {
  const mockSequelize = {
    define: jest.fn().mockImplementation((modelName, schema, options) => {
      // Attach options to mock for coverage
      return class MockModel {
        static rawAttributes = { ...schema };
        static tableName = options && options.tableName ? options.tableName : modelName;
        static options = options;
        static getDataValue = jest.fn();
        static setDataValue = jest.fn();
      };
    }),
    UUIDV4: 'mock-uuid',
    fn: jest.fn(),
    col: jest.fn()
  };
  return mockSequelize;
});

describe('User Model', () => {
  let User;

  beforeAll(() => {
    User = require('../../models/usersModels');
  });

  it('should be defined', () => {
    expect(User).toBeDefined();
  });

  it('should have correct table name', () => {
    expect(User.tableName).toBe('users');
  });

  it('should have correct fields', () => {
    const attributes = User.rawAttributes;

    expect(attributes.uid).toBeDefined();
    expect(attributes.uid.type).toEqual(DataTypes.UUID);
    expect(attributes.uid.allowNull).toBe(false);
    expect(attributes.uid.unique).toBe(true);

    expect(attributes.name).toBeDefined();
    expect(attributes.name.type).toEqual(DataTypes.STRING(100));
    expect(attributes.name.allowNull).toBe(false);

    expect(attributes.email).toBeDefined();
    expect(attributes.email.type).toEqual(DataTypes.STRING(100));
    expect(attributes.email.allowNull).toBe(false);
    expect(attributes.email.unique).toBe(true);
    expect(attributes.email.validate).toEqual({ isEmail: true });

    expect(attributes.phone).toBeDefined();
    expect(attributes.phone.type).toEqual(DataTypes.STRING(20));
    expect(attributes.phone.allowNull).toBe(false);
    expect(attributes.phone.validate).toEqual({ is: /^[0-9]{10}$/ });

    expect(attributes.role).toBeDefined();
    expect(attributes.role.type).toEqual(DataTypes.STRING);
    expect(attributes.role.defaultValue).toBe('Editor');
    expect(attributes.role.allowNull).toBe(false);
    expect(attributes.role.validate).toEqual({ isIn: [['Admin', 'Editor', 'Readonly']] });

    expect(attributes.status).toBeDefined();
    expect(attributes.status.type).toEqual(DataTypes.STRING);
    expect(attributes.status.allowNull).toBe(false);
    expect(attributes.status.defaultValue).toBe('Inactive');
    expect(attributes.status.validate).toEqual({ isIn: [['Active', 'Inactive']] });

    expect(attributes.twoFA).toBeDefined();
    expect(attributes.twoFA.type).toEqual(DataTypes.BOOLEAN);
    expect(attributes.twoFA.allowNull).toBe(false);
    expect(attributes.twoFA.defaultValue).toBe(false);

    expect(attributes.lastLogin).toBeDefined();
    expect(attributes.lastLogin.type).toEqual(DataTypes.DATE);
    expect(attributes.lastLogin.allowNull).toBe(true);
    expect(typeof attributes.lastLogin.get).toBe('function');

    expect(attributes.address).toBeDefined();
    expect(attributes.address.type).toEqual(DataTypes.TEXT);
    expect(attributes.address.allowNull).toBe(false);

    expect(attributes.password).toBeDefined();
    expect(attributes.password.type).toEqual(DataTypes.STRING);
    expect(attributes.password.allowNull).toBe(false);
    expect(typeof attributes.password.set).toBe('function');

    expect(attributes.created_at).toBeDefined();
    expect(attributes.created_at.type).toEqual(DataTypes.DATE);
    expect(typeof attributes.created_at.get).toBe('function');

    expect(attributes.updated_at).toBeDefined();
    expect(attributes.updated_at.type).toEqual(DataTypes.DATE);
  });

  it('should hash password before saving', () => {
    const mockUser = {
      password: 'plainpassword',
      setDataValue: jest.fn()
    };

    User.rawAttributes.password.set.call(mockUser, 'plainpassword');
    expect(mockUser.setDataValue).toHaveBeenCalledWith(
      'password',
      expect.not.stringMatching('plainpassword')
    );
    const hashed = mockUser.setDataValue.mock.calls[0][1];
    expect(bcrypt.compareSync('plainpassword', hashed)).toBe(true);
  });

  it('lastLogin getter returns ISO string or null', () => {
    const dt = new Date('2020-01-01T12:34:56.789Z');
    const thisObj = { getDataValue: () => dt };
    expect(User.rawAttributes.lastLogin.get.call(thisObj)).toBe(dt.toISOString());
    const thisObj2 = { getDataValue: () => null };
    expect(User.rawAttributes.lastLogin.get.call(thisObj2)).toBeNull();
  });

  it('created_at getter returns formatted string or null', () => {
    const getter = User.rawAttributes.created_at.get;
    expect(typeof getter).toBe('function');
    const dt = new Date('2020-01-01T12:34:56.789Z');
    const thisObj = { getDataValue: () => dt };
    const result = getter.call(thisObj);
    expect(typeof result).toBe('string');
    const thisObj2 = { getDataValue: () => null };
    expect(getter.call(thisObj2)).toBeNull();
  });

  it('should have proper role validation', () => {
    expect(User.rawAttributes.role.validate).toEqual({
      isIn: [['Admin', 'Editor', 'Readonly']]
    });
  });

  it('should have proper status validation', () => {
    expect(User.rawAttributes.status.validate).toEqual({
      isIn: [['Active', 'Inactive']]
    });
  });

  it('should have proper phone validation', () => {
    expect(User.rawAttributes.phone.validate).toEqual({
      is: /^[0-9]{10}$/
    });
  });

  it('should have timestamps configured', () => {
    expect(User.rawAttributes.created_at).toBeDefined();
    expect(User.rawAttributes.updated_at).toBeDefined();
    expect(User.options.timestamps).toBe(true);
    expect(User.options.updatedAt).toBe('updated_at');
    expect(User.options.createdAt).toBe('created_at');
    expect(User.options.underscored).toBe(true);
  });

  it('should have default values', () => {
    expect(User.rawAttributes.role.defaultValue).toBe('Editor');
    expect(User.rawAttributes.status.defaultValue).toBe('Inactive');
    expect(User.rawAttributes.twoFA.defaultValue).toBe(false);
  });

  it('should validate email format', () => {
    expect(User.rawAttributes.email.validate.isEmail).toBe(true);
  });

  it('should validate role options', () => {
    const validRoles = User.rawAttributes.role.validate.isIn[0];
    expect(validRoles).toContain('Admin');
    expect(validRoles).toContain('Editor');
    expect(validRoles).toContain('Readonly');
  });

  it('should validate status options', () => {
    const validStatus = User.rawAttributes.status.validate.isIn[0];
    expect(validStatus).toContain('Active');
    expect(validStatus).toContain('Inactive');
  });

  it('should validate phone regex', () => {
    expect(User.rawAttributes.phone.validate.is).toEqual(/^[0-9]{10}$/);
  });

  it('should have selected_database field with proper reference', () => {
    expect(User.rawAttributes.selected_database).toBeDefined();
    expect(User.rawAttributes.selected_database.references.model).toBe('database_connections');
    expect(User.rawAttributes.selected_database.references.key).toBe('id');
    expect(User.rawAttributes.selected_database.onUpdate).toBe('CASCADE');
    expect(User.rawAttributes.selected_database.onDelete).toBe('SET NULL');
  });
});