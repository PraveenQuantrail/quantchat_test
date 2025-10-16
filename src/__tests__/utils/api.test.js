import { api, userApi, authApi, formatDateTime, passwordResetApi, databaseApi } from "../../utils/api";
import MockAdapter from "axios-mock-adapter";

const mock = new MockAdapter(api);

describe("userApi", () => {
  afterEach(() => {
    mock.reset();
  });

  it("should get all users", async () => {
    mock.onGet("/api/users").reply(200, {
      users: [
        { id: 1, uid: "u1", name: "User", email: "user@email.com", role: "Admin", status: "Active", twoFA: true, address: "Addr", lastLogin: "2024-07-01T10:00:00Z", created_at: "2024-06-01T09:00:00Z", updated_at: "2024-07-01T11:00:00Z" }
      ],
      total: 1,
      availableRoles: ["Admin", "Editor"]
    });

    const result = await userApi.getAll();
    expect(result.users[0].name).toBe("User");
    expect(result.users[0].id).toBe(1);
    expect(result.users[0].uid).toBe("u1");
    expect(result.users[0].status).toBe("Active");
    expect(result.users[0].twoFA).toBe(true);
    expect(result.users[0].address).toBe("Addr");
    expect(result.users[0].lastLogin).toBe("2024-07-01T10:00:00Z");
    expect(result.users[0].createdAt).toBe("2024-06-01T09:00:00Z");
    expect(result.users[0].updatedAt).toBe("2024-07-01T11:00:00Z");
    expect(result.total).toBe(1);
    expect(result.availableRoles).toContain("Admin");
    expect(Array.isArray(result.users)).toBe(true);
  });

  it("should get all users with missing optional fields", async () => {
    mock.onGet("/api/users").reply(200, {
      users: [
        { uid: "u2" }
      ],
      total: 1
    });
    const result = await userApi.getAll();
    expect(result.users[0].id).toBe("u2");
    expect(result.users[0].role).toBe("Editor");
    expect(result.users[0].status).toBe("Inactive");
    expect(result.users[0].name).toBe("");
    expect(result.users[0].email).toBe("");
    expect(result.users[0].phone).toBe("");
    expect(result.users[0].address).toBe("");
    expect(result.users[0].lastLogin).toBe(null);
    expect(result.availableRoles).toContain("Admin");
    expect(Array.isArray(result.users)).toBe(true);
  });

  it("should handle availableRoles as undefined", async () => {
    mock.onGet("/api/users").reply(200, {
      users: [{ uid: "u2" }],
      total: 1
    });
    const result = await userApi.getAll();
    expect(result.availableRoles).toEqual(["Admin", "Editor", "Readonly"]);
  });

  it("should handle error when getAll fails", async () => {
    mock.onGet("/api/users").reply(500, { message: "fail" });
    await expect(userApi.getAll()).rejects.toThrowError("fail");
    await expect(userApi.getAll()).rejects.toHaveProperty("status", 500);
    await expect(userApi.getAll()).rejects.toHaveProperty("data", { message: "fail" });
  });

  it("should create user", async () => {
    mock.onPost("/api/users").reply(200, { user: { id: 2, uid: "u2", name: "New", email: "n@email.com" } });
    const result = await userApi.create({ name: "New", email: "n@email.com" });
    expect(result.name).toBe("New");
    expect(result.id).toBe(2);
    expect(result.uid).toBe("u2");
    expect(result.role).toBe("Editor");
  });

  it("should handle create user with direct data, not user field", async () => {
    mock.onPost("/api/users").reply(200, { id: 3, uid: "u3" });
    const result = await userApi.create({ name: "direct" });
    expect(result.id).toBe(3);
    expect(result.uid).toBe("u3");
  });

  it("should handle error when create fails", async () => {
    mock.onPost("/api/users").reply(400, { message: "nope" });
    await expect(userApi.create({})).rejects.toThrowError("nope");
    await expect(userApi.create({})).rejects.toHaveProperty("status", 400);
    await expect(userApi.create({})).rejects.toHaveProperty("data", { message: "nope" });
  });

  it("should update user", async () => {
    mock.onPut("/api/users/1").reply(200, { user: { id: 1, uid: "u1", name: "Updated" } });
    const result = await userApi.update(1, { name: "Updated" });
    expect(result.name).toBe("Updated");
    expect(result.id).toBe(1);
    expect(result.uid).toBe("u1");
  });

  it("should handle update user with direct data", async () => {
    mock.onPut("/api/users/2").reply(200, { id: 2, uid: "u2", name: "Updated2" });
    const result = await userApi.update(2, { name: "Updated2" });
    expect(result.id).toBe(2);
    expect(result.name).toBe("Updated2");
  });

  it("should handle error when update fails", async () => {
    mock.onPut("/api/users/9").reply(404, { message: "no user" });
    await expect(userApi.update(9, {})).rejects.toThrowError("no user");
    await expect(userApi.update(9, {})).rejects.toHaveProperty("status", 404);
    await expect(userApi.update(9, {})).rejects.toHaveProperty("data", { message: "no user" });
  });

  it("should delete user", async () => {
    mock.onDelete("/api/users/1").reply(200);
    const res = await userApi.delete(1);
    expect(res.success).toBe(true);
  });

  it("should handle error when delete fails", async () => {
    mock.onDelete("/api/users/1").reply(400, { message: "fail" });
    await expect(userApi.delete(1)).rejects.toThrowError("fail");
    await expect(userApi.delete(1)).rejects.toHaveProperty("status", 400);
    await expect(userApi.delete(1)).rejects.toHaveProperty("data", { message: "fail" });
  });
});

describe("authApi", () => {
  afterEach(() => {
    mock.reset();
  });

  it("should login successfully", async () => {
    mock.onPost("/api/auth/login").reply(200, { token: "abc", user: { id: 1 } });
    const res = await authApi.login("a", "b");
    expect(res.token).toBe("abc");
    expect(res.user.id).toBe(1);
  });

  it("should handle login error", async () => {
    mock.onPost("/api/auth/login").reply(401, { message: "bad login" });
    await expect(authApi.login("bad", "bad")).rejects.toThrowError("bad login");
    await expect(authApi.login("bad", "bad")).rejects.toHaveProperty("status", 401);
    await expect(authApi.login("bad", "bad")).rejects.toHaveProperty("data", { message: "bad login" });
  });

  it("should get organization", async () => {
    mock.onGet("/api/auth/organization").reply(200, { org: "org1" });
    const res = await authApi.getOrganization();
    expect(res.org).toBe("org1");
  });

  it("should handle get organization error", async () => {
    mock.onGet("/api/auth/organization").reply(500, { message: "fail" });
    await expect(authApi.getOrganization()).rejects.toThrowError("fail");
    await expect(authApi.getOrganization()).rejects.toHaveProperty("status", 500);
    await expect(authApi.getOrganization()).rejects.toHaveProperty("data", { message: "fail" });
  });

  it("should google login", async () => {
    mock.onPost("/api/auth/google").reply(200, { token: "g", user: { id: 2 } });
    const res = await authApi.googleLogin("token");
    expect(res.token).toBe("g");
    expect(res.user.id).toBe(2);
  });

  it("should handle google login error", async () => {
    mock.onPost("/api/auth/google").reply(400, { message: "fail" });
    await expect(authApi.googleLogin("bad")).rejects.toThrowError("fail");
    await expect(authApi.googleLogin("bad")).rejects.toHaveProperty("status", 400);
    await expect(authApi.googleLogin("bad")).rejects.toHaveProperty("data", { message: "fail" });
  });

  it("should get selected database", async () => {
    mock.onGet("/api/auth/selected-database").reply(200, { selected: 1 });
    const res = await authApi.getSelectedDatabase();
    expect(res.selected).toBe(1);
  });

  it("should handle getSelectedDatabase error", async () => {
    mock.onGet("/api/auth/selected-database").reply(404, { message: "not found" });
    await expect(authApi.getSelectedDatabase()).rejects.toThrowError("not found");
    await expect(authApi.getSelectedDatabase()).rejects.toHaveProperty("status", 404);
    await expect(authApi.getSelectedDatabase()).rejects.toHaveProperty("data", { message: "not found" });
  });

  it("should set selected database", async () => {
    mock.onPost("/api/auth/selected-database").reply(200, { selected: 2 });
    const res = await authApi.setSelectedDatabase(2);
    expect(res.selected).toBe(2);
  });

  it("should handle setSelectedDatabase error", async () => {
    mock.onPost("/api/auth/selected-database").reply(400, { message: "bad" });
    await expect(authApi.setSelectedDatabase("bad")).rejects.toThrowError("bad");
    await expect(authApi.setSelectedDatabase("bad")).rejects.toHaveProperty("status", 400);
    await expect(authApi.setSelectedDatabase("bad")).rejects.toHaveProperty("data", { message: "bad" });
  });
});

describe("formatDateTime", () => {
  it("should format valid date", () => {
    const formatted = formatDateTime("2024-05-01T10:12:00Z");
    expect(formatted).toMatch(/May/);
    expect(formatted).toMatch(/2024/);
  });

  it("should return N/A for empty, undefined or invalid date", () => {
    expect(formatDateTime()).toBe("N/A");
    expect(formatDateTime("")).toBe("N/A");
    expect(formatDateTime("invalid-date")).toBe("N/A");
  });

  it("should format with correct month and year", () => {
    const formatted = formatDateTime("2024-01-01T01:05:00Z");
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/AM|PM/);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("passwordResetApi", () => {
  afterEach(() => {
    mock.reset();
  });

  it("should send OTP", async () => {
    mock.onPost("/api/password-reset/send-otp").reply(200, { success: true });
    const res = await passwordResetApi.sendOTP("a@email.com");
    expect(res.success).toBe(true);
  });

  it("should handle send OTP error", async () => {
    mock.onPost("/api/password-reset/send-otp").reply(400, { message: "OTP fail" });
    await expect(passwordResetApi.sendOTP("fail@email.com")).rejects.toThrowError("OTP fail");
    await expect(passwordResetApi.sendOTP("fail@email.com")).rejects.toHaveProperty("status", 400);
    await expect(passwordResetApi.sendOTP("fail@email.com")).rejects.toHaveProperty("data", { message: "OTP fail" });
  });

  it("should verify OTP", async () => {
    mock.onPost("/api/password-reset/verify-otp").reply(200, { verified: true });
    const res = await passwordResetApi.verifyOTP("a@email.com", "123456");
    expect(res.verified).toBe(true);
  });

  it("should handle verify OTP error", async () => {
    mock.onPost("/api/password-reset/verify-otp").reply(401, { message: "OTP error" });
    await expect(passwordResetApi.verifyOTP("a@email.com", "bad")).rejects.toThrowError("OTP error");
    await expect(passwordResetApi.verifyOTP("a@email.com", "bad")).rejects.toHaveProperty("status", 401);
    await expect(passwordResetApi.verifyOTP("a@email.com", "bad")).rejects.toHaveProperty("data", { message: "OTP error" });
  });

  it("should reset password", async () => {
    mock.onPost("/api/password-reset/reset-password").reply(200, { reset: true });
    const res = await passwordResetApi.resetPassword("a@email.com", "123456", "newpass");
    expect(res.reset).toBe(true);
  });

  it("should handle reset password error", async () => {
    mock.onPost("/api/password-reset/reset-password").reply(400, { message: "reset fail" });
    await expect(passwordResetApi.resetPassword("a@email.com", "bad", "bad")).rejects.toThrowError("reset fail");
    await expect(passwordResetApi.resetPassword("a@email.com", "bad", "bad")).rejects.toHaveProperty("status", 400);
    await expect(passwordResetApi.resetPassword("a@email.com", "bad", "bad")).rejects.toHaveProperty("data", { message: "reset fail" });
  });

  it("should check status", async () => {
    mock.onGet("/api/password-reset/check-status").reply(200, { status: "pending" });
    const res = await passwordResetApi.checkStatus("a@email.com");
    expect(res.status).toBe("pending");
  });

  it("should handle error on check status", async () => {
    mock.onGet("/api/password-reset/check-status").reply(404, { message: "not found" });
    await expect(passwordResetApi.checkStatus("fail@email.com")).rejects.toThrowError("not found");
    await expect(passwordResetApi.checkStatus("fail@email.com")).rejects.toHaveProperty("status", 404);
    await expect(passwordResetApi.checkStatus("fail@email.com")).rejects.toHaveProperty("data", { message: "not found" });
  });
});

describe("databaseApi", () => {
  afterEach(() => {
    mock.reset();
  });

  it("should get all databases", async () => {
    mock.onGet("/api/databases").reply(200, {
      databases: [{
        id: 1,
        name: "main",
        type: "PostgreSQL",
        host: "localhost",
        port: "5432",
        username: "user",
        database: "db",
        status: "Connected",
        server_type: "local",
        connection_string: "",
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }],
      total: 1,
      totalPages: 2,
      currentPage: 1
    });

    const result = await databaseApi.getAll();
    expect(result.databases.length).toBe(1);
    expect(result.databases[0].name).toBe("main");
    expect(result.databases[0].type).toBe("PostgreSQL");
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(1);
  });

  it("should handle getAll with missing optional fields", async () => {
    mock.onGet("/api/databases").reply(200, {
      databases: [{ id: 2 }],
      total: 1
    });
    const result = await databaseApi.getAll();
    expect(result.databases[0].id).toBe(2);
    expect(result.databases[0].name).toBe("");
    expect(result.databases[0].type).toBe("PostgreSQL");
    expect(result.databases[0].status).toBe("Disconnected");
    expect(result.databases[0].server_type).toBe("local");
    expect(result.databases[0].connection_string).toBe("");
  });

  it("should create a cloud database", async () => {
    mock.onPost("/api/databases").reply(200, {
      database: {
        id: 3,
        name: "clouddb",
        type: "MySQL",
        status: "Connected",
        server_type: "cloud",
        connection_string: "cloud-conn-str",
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }
    });
    const res = await databaseApi.create({
      name: "clouddb",
      server_type: "cloud",
      type: "MySQL",
      database: "clouddb",
      connection_string: "cloud-conn-str"
    });
    expect(res.id).toBe(3);
    expect(res.name).toBe("clouddb");
    expect(res.type).toBe("MySQL");
    expect(res.status).toBe("Connected");
    expect(res.server_type).toBe("cloud");
    expect(res.connection_string).toBe("cloud-conn-str");
    expect(res.createdAt).toBe("2024-06-01T09:00:00Z");
    expect(res.updatedAt).toBe("2024-07-01T11:00:00Z");
  });

  it("should create a local database", async () => {
    mock.onPost("/api/databases").reply(200, {
      database: {
        id: 4,
        name: "localdb",
        type: "PostgreSQL",
        status: "Connected",
        server_type: "local",
        host: "localhost",
        port: "5432",
        username: "user",
        database: "localdb",
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }
    });
    const res = await databaseApi.create({
      name: "localdb",
      server_type: "local",
      type: "PostgreSQL",
      database: "localdb",
      host: "localhost",
      port: "5432",
      username: "user",
      password: "pw"
    });
    expect(res.id).toBe(4);
    expect(res.name).toBe("localdb");
    expect(res.type).toBe("PostgreSQL");
    expect(res.server_type).toBe("local");
    expect(res.host).toBe("localhost");
    expect(res.port).toBe("5432");
    expect(res.username).toBe("user");
    expect(res.database).toBe("localdb");
    expect(res.status).toBe("Connected");
  });

  it("should test database connection", async () => {
    mock.onPost("/api/databases/1/test").reply(200, {
      success: true,
      message: "Connection successful",
      status: "Connected"
    });
    const res = await databaseApi.test(1);
    expect(res.success).toBe(true);
    expect(res.message).toBe("Connection successful");
    expect(res.status).toBe("Connected");
  });

  it("should connect to database", async () => {
    mock.onPost("/api/databases/1/connect").reply(200, {
      success: true,
      message: "Connected",
      status: "Connected"
    });
    const res = await databaseApi.connect(1);
    expect(res.success).toBe(true);
    expect(res.message).toBe("Connected");
    expect(res.status).toBe("Connected");
  });

  it("should disconnect from database", async () => {
    mock.onPost("/api/databases/1/disconnect").reply(200, {
      success: true,
      message: "Disconnected",
      status: "Disconnected"
    });
    const res = await databaseApi.disconnect(1);
    expect(res.success).toBe(true);
    expect(res.message).toBe("Disconnected");
    expect(res.status).toBe("Disconnected");
  });

  it("should get database details", async () => {
    mock.onGet("/api/databases/1").reply(200, {
      database: {
        id: 1,
        name: "db",
        type: "PostgreSQL",
        host: "localhost",
        port: "5432",
        username: "user",
        password: "pass",
        database: "db",
        status: "Connected",
        server_type: "local",
        connection_string: "",
        ssl: true,
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }
    });
    const res = await databaseApi.getDetails(1);
    expect(res.id).toBe(1);
    expect(res.name).toBe("db");
    expect(res.type).toBe("PostgreSQL");
    expect(res.status).toBe("Connected");
    expect(res.server_type).toBe("local");
    expect(res.password).toBe(""); // Should never return password
    expect(res.ssl).toBe(true);
    expect(res.createdAt).toBe("2024-06-01T09:00:00Z");
    expect(res.updatedAt).toBe("2024-07-01T11:00:00Z");
  });

  it("should handle getDetails with missing fields", async () => {
    mock.onGet("/api/databases/10").reply(200, { database: { id: 10 } });
    const res = await databaseApi.getDetails(10);
    expect(res.id).toBe(10);
    expect(res.name).toBe("");
    expect(res.type).toBe("PostgreSQL");
    expect(res.status).toBe("Disconnected");
    expect(res.server_type).toBe("local");
    expect(res.password).toBe("");
    expect(res.ssl).toBe(false);
  });

  it("should get database schema", async () => {
    mock.onGet("/api/databases/1/schema").reply(200, {
      success: true,
      tables: ["table1", "table2"],
      collections: ["collection1"],
      databaseType: "PostgreSQL",
      message: "Schema fetched"
    });
    const res = await databaseApi.getSchema(1);
    expect(res.success).toBe(true);
    expect(res.tables).toEqual(["table1", "table2"]);
    expect(res.collections).toEqual(["collection1"]);
    expect(res.databaseType).toBe("PostgreSQL");
    expect(res.message).toBe("Schema fetched");
  });

  it("should handle error on getSchema", async () => {
    mock.onGet("/api/databases/1/schema").reply(500, { message: "Schema error" });
    await expect(databaseApi.getSchema(1)).rejects.toThrowError("Schema error");
    await expect(databaseApi.getSchema(1)).rejects.toHaveProperty("status", 500);
    await expect(databaseApi.getSchema(1)).rejects.toHaveProperty("data", { message: "Schema error" });
  });

  it("should update a local database", async () => {
    mock.onPut("/api/databases/1").reply(200, {
      database: {
        id: 1,
        name: "updatedb",
        type: "PostgreSQL",
        host: "localhost",
        port: "5432",
        username: "user",
        database: "db",
        status: "Connected",
        server_type: "local",
        connection_string: "",
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }
    });
    const res = await databaseApi.update(1, {
      name: "updatedb",
      server_type: "local",
      type: "PostgreSQL",
      database: "db",
      host: "localhost",
      port: "5432",
      username: "user",
      password: "pass",
      ssl: false
    });
    expect(res.id).toBe(1);
    expect(res.name).toBe("updatedb");
    expect(res.type).toBe("PostgreSQL");
    expect(res.status).toBe("Connected");
    expect(res.server_type).toBe("local");
    expect(res.createdAt).toBe("2024-06-01T09:00:00Z");
    expect(res.updatedAt).toBe("2024-07-01T11:00:00Z");
  });

  it("should update a cloud database", async () => {
    mock.onPut("/api/databases/2").reply(200, {
      database: {
        id: 2,
        name: "cloudupdatedb",
        type: "MySQL",
        status: "Connected",
        server_type: "cloud",
        connection_string: "cloud-conn-str",
        created_at: "2024-06-01T09:00:00Z",
        updated_at: "2024-07-01T11:00:00Z"
      }
    });
    const res = await databaseApi.update(2, {
      name: "cloudupdatedb",
      server_type: "cloud",
      type: "MySQL",
      database: "cloudupdatedb",
      connection_string: "cloud-conn-str",
      ssl: true
    });
    expect(res.id).toBe(2);
    expect(res.name).toBe("cloudupdatedb");
    expect(res.type).toBe("MySQL");
    expect(res.status).toBe("Connected");
    expect(res.server_type).toBe("cloud");
    expect(res.connection_string).toBe("cloud-conn-str");
    expect(res.createdAt).toBe("2024-06-01T09:00:00Z");
    expect(res.updatedAt).toBe("2024-07-01T11:00:00Z");
  });

  it("should delete a database", async () => {
    mock.onDelete("/api/databases/1").reply(200, {});
    const res = await databaseApi.delete(1);
    expect(res.success).toBe(true);
  });

  it("should handle error on getAll", async () => {
    mock.onGet("/api/databases").reply(500, { message: "Server error" });
    await expect(databaseApi.getAll()).rejects.toThrowError("Server error");
    await expect(databaseApi.getAll()).rejects.toHaveProperty("status", 500);
    await expect(databaseApi.getAll()).rejects.toHaveProperty("data", { message: "Server error" });
  });

  it("should handle error on create", async () => {
    mock.onPost("/api/databases").reply(400, { message: "Bad request" });
    await expect(databaseApi.create({})).rejects.toThrowError("Bad request");
    await expect(databaseApi.create({})).rejects.toHaveProperty("status", 400);
    await expect(databaseApi.create({})).rejects.toHaveProperty("data", { message: "Bad request" });
  });

  it("should handle error on test", async () => {
    mock.onPost("/api/databases/1/test").reply(404, { message: "Not found" });
    await expect(databaseApi.test(1)).rejects.toThrowError("Not found");
    await expect(databaseApi.test(1)).rejects.toHaveProperty("status", 404);
    await expect(databaseApi.test(1)).rejects.toHaveProperty("data", { message: "Not found" });
  });

  it("should handle error on connect", async () => {
    mock.onPost("/api/databases/1/connect").reply(403, { message: "Forbidden" });
    await expect(databaseApi.connect(1)).rejects.toThrowError("Forbidden");
    await expect(databaseApi.connect(1)).rejects.toHaveProperty("status", 403);
    await expect(databaseApi.connect(1)).rejects.toHaveProperty("data", { message: "Forbidden" });
  });

  it("should handle error on disconnect", async () => {
    mock.onPost("/api/databases/1/disconnect").reply(500, { message: "Disconnect error" });
    await expect(databaseApi.disconnect(1)).rejects.toThrowError("Disconnect error");
    await expect(databaseApi.disconnect(1)).rejects.toHaveProperty("status", 500);
    await expect(databaseApi.disconnect(1)).rejects.toHaveProperty("data", { message: "Disconnect error" });
  });

  it("should handle error on getDetails", async () => {
    mock.onGet("/api/databases/1").reply(404, { message: "DB not found" });
    await expect(databaseApi.getDetails(1)).rejects.toThrowError("DB not found");
    await expect(databaseApi.getDetails(1)).rejects.toHaveProperty("status", 404);
    await expect(databaseApi.getDetails(1)).rejects.toHaveProperty("data", { message: "DB not found" });
  });

  it("should handle error on update", async () => {
    mock.onPut("/api/databases/1").reply(400, { message: "Update failed" });
    await expect(databaseApi.update(1, {})).rejects.toThrowError("Update failed");
    await expect(databaseApi.update(1, {})).rejects.toHaveProperty("status", 400);
    await expect(databaseApi.update(1, {})).rejects.toHaveProperty("data", { message: "Update failed" });
  });

  it("should handle error on delete", async () => {
    mock.onDelete("/api/databases/1").reply(400, { message: "Delete failed" });
    await expect(databaseApi.delete(1)).rejects.toThrowError("Delete failed");
    await expect(databaseApi.delete(1)).rejects.toHaveProperty("status", 400);
    await expect(databaseApi.delete(1)).rejects.toHaveProperty("data", { message: "Delete failed" });
  });

  it("should fetch table data", async () => {
    mock.onGet("/api/databases/1/table-data/TableA").reply(200, { success: true, data: [1,2,3], message: "ok" });
    const res = await databaseApi.getTableData(1, "TableA");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([1,2,3]);
    expect(res.message).toBe("ok");
  });

  it("should handle error on getTableData", async () => {
    mock.onGet("/api/databases/1/table-data/TableB").reply(400, { message: "Table error" });
    await expect(databaseApi.getTableData(1, "TableB")).rejects.toThrowError("Table error");
    await expect(databaseApi.getTableData(1, "TableB")).rejects.toHaveProperty("status", 400);
    await expect(databaseApi.getTableData(1, "TableB")).rejects.toHaveProperty("data", { message: "Table error" });
  });
});

describe("api axios interceptor", () => {
  it("should set Authorization header from sessionStorage", async () => {
    sessionStorage.setItem("token", "s-token");
    localStorage.setItem("token", "l-token");
    const config = { headers: {} };
    const result = await api.interceptors.request.handlers[0].fulfilled(config);
    expect(result.headers["Authorization"]).toBe("Bearer s-token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  });

  it("should set Authorization header from localStorage if sessionStorage empty", async () => {
    sessionStorage.removeItem("token");
    localStorage.setItem("token", "l-token");
    const config = { headers: {} };
    const result = await api.interceptors.request.handlers[0].fulfilled(config);
    expect(result.headers["Authorization"]).toBe("Bearer l-token");
    localStorage.removeItem("token");
  });

  it("should not set Authorization header if neither storage has token", async () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    const config = { headers: {} };
    const result = await api.interceptors.request.handlers[0].fulfilled(config);
    expect(result.headers["Authorization"]).toBeUndefined();
  });

  it("should reject request error", async () => {
    const error = new Error("fail");
    await expect(api.interceptors.request.handlers[0].rejected(error)).rejects.toThrow("fail");
  });
});