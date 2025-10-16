const request = require('supertest');
const express = require('express');

// Mock controllers and middleware
jest.mock('../../controllers/authController', () => ({
  getOrganization: (req, res) => res.status(200).json({ name: 'TestOrg' }),
  login: (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    return res.status(200).json({ token: 'fake-token' });
  },
  googleLogin: (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    return res.status(200).json({ token: 'google-fake-token' });
  },
  getSelectedDatabase: (req, res) => res.status(200).json({ selected_database: 1 }),
  setSelectedDatabase: (req, res) => {
    const { selected_database } = req.body;
    if (!selected_database) return res.status(400).json({ error: 'Missing selected_database' });
    return res.status(200).json({ success: true });
  }
}));

jest.mock('../../middlewares/authDatabase', () => (req, res, next) => next());

const authRoutes = require('../../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  it('GET /api/auth/organization should return organization name', async () => {
    const res = await request(app)
      .get('/api/auth/organization');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body.name).toBe('TestOrg');
  });

  it('POST /api/auth/login should require email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login should succeed with email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: '123456' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/google should require token', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/google should succeed with token', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'google-token' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('GET /api/auth/selected-database should require authDatabase and return selected_database', async () => {
    const res = await request(app)
      .get('/api/auth/selected-database');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('selected_database');
    expect(res.body.selected_database).toBe(1);
  });

  it('POST /api/auth/selected-database should require selected_database in body', async () => {
    const res = await request(app)
      .post('/api/auth/selected-database')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/selected-database should succeed with selected_database in body', async () => {
    const res = await request(app)
      .post('/api/auth/selected-database')
      .send({ selected_database: 2 });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body.success).toBe(true);
  });
});