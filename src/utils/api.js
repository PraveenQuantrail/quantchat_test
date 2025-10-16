import axios from 'axios';
import { Await } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000';

const USERNAME_PINGGY = process.env.REACT_APP_USERNAME_PINGGY;

const PASSWORD_PINGGY = process.env.REACT_APP_PASSWORD_PINGGY;






export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});




api.interceptors.request.use(
  config => {
    const session = sessionStorage.getItem('session') || localStorage.getItem('session');
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        if (sessionData.token) {
          config.headers['Authorization'] = `Bearer ${sessionData.token}`;
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';

      if (
        errorMessage.includes('Token revoked') ||
        errorMessage.includes('User account no longer exists')
      ) {
        localStorage.removeItem('session');
        sessionStorage.removeItem('session');
        if (typeof window !== 'undefined') {
          alert('Your account has been deleted. Please contact administrator.');
          window.location.href = '/?message=account_deleted';
        }
      } else {
        localStorage.removeItem('session');
        sessionStorage.removeItem('session');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// User API
export const userApi = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/users', { params });
      return {
        users: Array.isArray(response.data?.users)
          ? response.data.users.map(user => ({
            id: user.id || user.uid,
            uid: user.uid,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Editor',
            status: user.status || 'Inactive',
            twoFA: user.twoFA || false,
            address: user.address || '',
            lastLogin: user.lastLogin || null,
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
            is_super_admin: user.is_super_admin || false
          }))
          : [],
        total: response.data?.total || 0,
        availableRoles: Array.isArray(response.data?.availableRoles)
          ? response.data.availableRoles
          : ['Admin', 'Editor', 'Readonly']
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch users');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  create: async (userData) => {
    try {
      const response = await api.post('/api/users', userData);
      const createdUser = response.data?.user || response.data;
      return {
        id: createdUser.id || createdUser.uid,
        uid: createdUser.uid,
        name: createdUser.name || '',
        email: createdUser.email || '',
        phone: createdUser.phone || '',
        role: createdUser.role || 'Editor',
        status: createdUser.status || 'Inactive',
        twoFA: createdUser.twoFA || false,
        address: createdUser.address || '',
        lastLogin: createdUser.lastLogin || null,
        createdAt: createdUser.created_at || createdUser.createdAt,
        updatedAt: createdUser.updated_at || createdUser.updatedAt,
        is_super_admin: createdUser.is_super_admin || false
      };
    } catch (error) {
      console.error('Error creating user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to create user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  update: async (id, userData) => {
    try {
      const response = await api.put(`/api/users/${id}`, userData);
      const updatedUser = response.data?.user || response.data;
      return {
        id: updatedUser.id || updatedUser.uid,
        uid: updatedUser.uid,
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        role: updatedUser.role || 'Editor',
        status: updatedUser.status || 'Inactive',
        twoFA: updatedUser.twoFA || false,
        address: updatedUser.address || '',
        lastLogin: updatedUser.lastLogin || null,
        createdAt: updatedUser.created_at || updatedUser.createdAt,
        updatedAt: updatedUser.updated_at || updatedUser.updatedAt,
        is_super_admin: updatedUser.is_super_admin || false,
        newToken: response.data?.newToken
      };
    } catch (error) {
      console.error('Error updating user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to update user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to delete user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Auth API
export const authApi = {
  login: async (email, password) => {
    try {
      const response = await axios.post(API_BASE_URL + '/api/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.log(error)
      const err = new Error(error.response?.data?.message || 'Login failed');
      err.status = error.response?.status;
      err.data = error.response?.data;
      // throw err;
    }
  },
  refreshSession: async () => {
    try {
      const response = await api.get('/api/auth/refresh-session');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to refresh session');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch current user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },
  getCurrentUserWithRefresh: async () => {
    try {
      const response = await api.get('/api/auth/me', {
        params: { refresh: true, t: Date.now() } // Add timestamp to prevent caching
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch current user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getOrganization: async () => {
    try {
      const response = await api.get('/api/auth/organization');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch organization');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  googleLogin: async (token) => {
    try {
      const response = await api.post('/api/auth/google', { token });
      return response.data;
    } catch (error) {
      console.error('Error with Google login:', error);
      const err = new Error(error.response?.data?.message || 'Google login failed');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getSelectedDatabase: async () => {
    try {
      const response = await api.get('/api/auth/selected-database');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch selected database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  setSelectedDatabase: async (databaseId) => {
    try {
      const response = await api.post('/api/auth/selected-database', { databaseId });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to set selected database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },
};

// Password Reset API
export const passwordResetApi = {
  sendOTP: async (email) => {
    try {
      const response = await api.post('/api/password-reset/send-otp', { email });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to send OTP');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/api/password-reset/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to verify OTP');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  checkStatus: async (email) => {
    try {
      const response = await api.get('/api/password-reset/check-status', {
        params: { email }
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to check reset status');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  resetPassword: async (email, resetToken, newPassword) => {
    try {
      const response = await api.post('/api/password-reset/reset-password', {
        email,
        resetToken,
        newPassword
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to reset password');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Database API
export const databaseApi = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/databases', { params });
      return {
        databases: Array.isArray(response.data?.databases)
          ? response.data.databases.map(db => ({
            id: db.id,
            name: db.name || '',
            type: db.type || 'PostgreSQL',
            host: db.host || '',
            port: db.port || '',
            username: db.username || '',
            database: db.database || '',
            status: db.status || 'Disconnected',
            server_type: db.server_type || 'local',
            connection_string: db.connection_string || '',
            createdAt: db.created_at || db.createdAt,
            updatedAt: db.updated_at || db.updatedAt
          }))
          : [],
        total: response.data?.total || 0,
        totalPages: response.data?.totalPages || 1,
        currentPage: response.data?.currentPage || 1
      };
    } catch (error) {
      console.error('Error fetching databases:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch databases');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  create: async (databaseData) => {
    try {
      const payload = {
        name: databaseData.name,
        server_type: databaseData.server_type,
        type: databaseData.type,
        database: databaseData.database,
        ssl: databaseData.ssl || false
      };

      if (databaseData.server_type === 'local') {
        payload.host = databaseData.host;
        payload.port = databaseData.port;
        payload.username = databaseData.username;
        payload.password = databaseData.password;
      } else {
        payload.connection_string = databaseData.connection_string;
      }

      const response = await api.post('/api/databases', payload);
      const createdDb = response.data?.database || response.data;
      return {
        id: createdDb.id,
        name: createdDb.name || '',
        type: createdDb.type || 'PostgreSQL',
        host: createdDb.host || '',
        port: createdDb.port || '',
        username: createdDb.username || '',
        database: createdDb.database || '',
        status: createdDb.status || 'Disconnected',
        server_type: createdDb.server_type || 'local',
        connection_string: createdDb.connection_string || '',
        createdAt: createdDb.created_at || createdDb.createdAt,
        updatedAt: createdDb.updated_at || createdDb.updatedAt
      };
    } catch (error) {
      console.error('Error creating database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to create database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  test: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/test`);
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected'
      };
    } catch (error) {
      console.error('Error testing database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to test database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  connect: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/connect`);
      // console.log(response)
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected',
        dbdetails: response.data?.databasedetails || {}
      };
    } catch (error) {
      console.error('Error connecting to database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to connect to database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  disconnect: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/disconnect`);
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected'
      };
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to disconnect from database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getDetails: async (id) => {
    try {
      const response = await api.get(`/api/databases/${id}`);
      const dbDetails = response.data?.database || response.data;
      return {
        id: dbDetails.id,
        name: dbDetails.name || '',
        type: dbDetails.type || 'PostgreSQL',
        host: dbDetails.host || '',
        port: dbDetails.port || '',
        username: dbDetails.username || '',
        password: '', // Never return the actual password (for security purposes)
        database: dbDetails.database || '',
        status: dbDetails.status || 'Disconnected',
        server_type: dbDetails.server_type || 'local',
        connection_string: dbDetails.connection_string || '',
        ssl: dbDetails.ssl || false,
        createdAt: dbDetails.created_at || dbDetails.createdAt,
        updatedAt: dbDetails.updated_at || dbDetails.updatedAt
      };
    } catch (error) {
      console.error('Error getting database details:', error);
      const err = new Error(error.response?.data?.message || 'Failed to get database details');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getSchema: async (id) => {
    try {
      const response = await api.get(`/api/databases/${id}/schema`);
      return {
        success: response.data?.success || false,
        tables: response.data?.tables || [],
        collections: response.data?.collections || [],
        databaseType: response.data?.databaseType || '',
        message: response.data?.message || ''
      };
    } catch (error) {
      console.error('Error fetching database schema:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch database schema');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getTableData: async (id, tableName) => {
    try {
      const response = await api.get(`/api/databases/${id}/table-data/${encodeURIComponent(tableName)}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        message: response.data?.message || ''
      };
    } catch (error) {
      console.error('Error fetching table data:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch table data');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  update: async (id, databaseData) => {
    try {
      const payload = {
        name: databaseData.name,
        server_type: databaseData.server_type,
        type: databaseData.type,
        database: databaseData.database,
        ssl: databaseData.ssl || false
      };

      if (databaseData.server_type === 'local') {
        payload.host = databaseData.host;
        payload.port = databaseData.port;
        payload.username = databaseData.username;
        // Only include password if it was provided
        if (databaseData.password) {
          payload.password = databaseData.password;
        }
      } else {
        payload.connection_string = databaseData.connection_string;
      }

      const response = await api.put(`/api/databases/${id}`, payload);
      const updatedDb = response.data?.database || response.data;
      return {
        id: updatedDb.id,
        name: updatedDb.name || '',
        type: updatedDb.type || 'PostgreSQL',
        host: updatedDb.host || '',
        port: updatedDb.port || '',
        username: updatedDb.username || '',
        database: updatedDb.database || '',
        status: updatedDb.status || 'Disconnected',
        server_type: updatedDb.server_type || 'local',
        connection_string: updatedDb.connection_string || '',
        createdAt: updatedDb.created_at || updatedDb.createdAt,
        updatedAt: updatedDb.updated_at || updatedDb.updatedAt
      };
    } catch (error) {
      console.error('Error updating database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to update database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/api/databases/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to delete database connection');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Utility function
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
};


// fastapi connection api
export const api_AI = axios.create({
  baseURL: 'https://quantrail.a.pinggy.link',
  headers: { 'Content-Type': 'application/json' },
  auth: { username: USERNAME_PINGGY, password: PASSWORD_PINGGY }
})




// connecting the db from pinggy
export const connectDBPinggy = async (dbParam) => {
  try {

    let dbcren = null
    if (dbParam.server_type === 'local') {
      dbcren = {
        connection_type: 'local',
        database_type: dbParam.type.toLowerCase(),
        credentials: {
          host: dbParam.host || '',
          port: dbParam.port || 0,
          username: dbParam.username || '',
          password: dbParam.password || '',
          database: dbParam.database || ''
        },
        connection_string: '',
        session_duration_minutes: 60,
        store_schema: true
      }
    }
    else {
      if (dbParam.type.toLowerCase() === "clickhouse") {
        dbcren = {
          connection_type: 'cloud',
          database_type: dbParam.type.toLowerCase(),
          connection_string: `clickhouse+${dbParam.connection_string.replace('https', 'http')}?protocol=https`,
          session_duration_minutes: 60,
          store_schema: true
        }
      } else {
        dbcren = {
          connection_type: 'cloud',
          database_type: dbParam.type.toLowerCase(),
          connection_string: dbParam.connection_string,
          session_duration_minutes: 60,
          store_schema: true
        }
      }
    }




    const response = await (await api_AI.post('/api/v1/database/connect', { ...dbcren })).data;
    console.log(response)
    return response.success ?
      {
        sessionID: response?.session_id,
        expires_at: response?.expires_at,
        dbID: dbParam?.id,
        success: true,
        message: "Connected With FastAPI SuccessFully"
      } :
      { success: false, message: "Not Connected" }
  }
  catch (err) {
    console.log(err)
    console.log("error on connecting db from pinggy!");
    throw err;
  }
}




export const ChatWithSQL_API = async (usermessage, sessionID) => {
  try {
    if (usermessage && sessionID) {

      let IsMessageLimit = usermessage.toLowerCase().includes('limit');
      let convertmessage = IsMessageLimit ? usermessage : `${usermessage} with limit 10`;
    

      const response = await (await api_AI.post('/api/v1/sql/generate-sql', { session_id: sessionID, query: convertmessage })).data;
      if (response.success) {

        // encode the sqlquery as base 64 for backend 
        const sqlQueryEncode = btoa(response?.generated_sql);

        // backend api call for generating sql data's
        const sqldataFromQuery = await (await api_AI.post('/api/v1/database/execute-sql', { session_id: sessionID, sql_query: sqlQueryEncode })).data;


        if (sqldataFromQuery.success) {
          return {
            sucess: true,
            sql: response?.generated_sql,
            data: sqldataFromQuery.data
          }
        }


        return {
          success: false,
          message: "we have some problem to get data's"
        }




      } else {
        return { success: false, message: "We have some problem to connect the fastapi" }
      }
    }
  }
  catch (err) {
    console.log(err)
    const errorValue = err?.response?.data;

    if (errorValue === 'Session not found') {
      return { success: false, message: "Session not found or Session timeout" }
    }
    return { success: false, message: "We have some problem to connect the fastapi" }
  }
}


export const getSummarizeSQL_API = async (data,sessionID) => {
  try {
    const response = await (await api_AI.post(''))
  }
  catch(err) {
    console.log(err);
    return {success:false,message:"Something went wrong in getting summarize"}
  }
}










