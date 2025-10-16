const request = require('supertest');
const express = require('express');
const databaseRoutes = require('../../routes/databaseRoutes');

// Mock the controller methods so we can check route integration
jest.mock('../../controllers/databaseController', () => ({
  getAllDatabases: (req, res) => res.status(200).json({ success: true, databases: [] }),
  addDatabase: (req, res) => {
    if (!req.body || !req.body.name) return res.status(400).json({ success: false });
    res.status(201).json({ success: true, database: { id: 1, ...req.body } });
  },
  testDatabase: (req, res) => {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') return res.status(400).json({ success: false, message: 'Missing id' });
    res.status(200).json({ success: true, message: 'Test OK' });
  },
  connectDatabase: (req, res) => {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') return res.status(400).json({ success: false, message: 'Missing id' });
    res.status(200).json({ success: true, status: 'Connected' });
  },
  disconnectDatabase: (req, res) => {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') return res.status(400).json({ success: false, message: 'Missing id' });
    res.status(200).json({ success: true, status: 'Disconnected' });
  },
  getDatabaseDetails: (req, res) => {
    if (req.params.id === '1')
      return res.status(200).json({ success: true, database: { id: 1, name: 'Test DB' } });
    res.status(404).json({ success: false, message: 'Not found' });
  },
  getDatabaseSchema: (req, res) => {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') return res.status(400).json({ success: false, message: 'Missing id' });
    res.status(200).json({ success: true, tables: ['table1', 'table2'], collections: ['collectionA'] });
  },
  getTableData: (req, res) => {
    if (!req.params.id || !req.params.tableName || req.params.id === 'undefined' || req.params.id === 'null' || req.params.tableName === 'undefined' || req.params.tableName === 'null')
      return res.status(400).json({ success: false, message: 'Missing id or tableName' });
    if (req.params.tableName === 'empty') return res.status(200).json({ success: true, data: [] });
    res.status(200).json({ success: true, data: [{ id: 1, value: 'row1' }] });
  },
  updateDatabase: (req, res) => {
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') return res.status(400).json({ success: false, message: 'Missing id' });
    res.status(200).json({ success: true, database: { id: req.params.id, ...req.body } });
  },
  deleteDatabase: (req, res) => {
    if (req.params.id === '1')
      return res.status(200).json({ success: true, message: 'Deleted' });
    res.status(404).json({ success: false, message: 'Not found' });
  }
}));

const app = express();
app.use(express.json());
app.use('/api/databases', databaseRoutes);

describe('Database Routes', () => {
  it('GET /api/databases should return database list', async () => {
    const res = await request(app).get('/api/databases');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('databases');
  });

  it('POST /api/databases should require fields', async () => {
    const res = await request(app).post('/api/databases').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/databases should create database', async () => {
    const res = await request(app)
      .post('/api/databases')
      .send({ name: 'Sample DB', type: 'PostgreSQL', server_type: 'local', host: 'localhost', port: '5432', username: 'user', password: 'pw', database: 'db' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.database).toHaveProperty('name', 'Sample DB');
  });

  it('POST /api/databases/:id/test should work', async () => {
    const res = await request(app).post('/api/databases/1/test');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('POST /api/databases/:id/test should return 400 if id is invalid', async () => {
    const res = await request(app).post('/api/databases/undefined/test');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Missing id');
  });

  it('POST /api/databases/:id/connect should work', async () => {
    const res = await request(app).post('/api/databases/1/connect');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'Connected');
  });

  it('POST /api/databases/:id/connect should return 400 if id is invalid', async () => {
    const res = await request(app).post('/api/databases/undefined/connect');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Missing id');
  });

  it('POST /api/databases/:id/disconnect should work', async () => {
    const res = await request(app).post('/api/databases/1/disconnect');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'Disconnected');
  });

  it('POST /api/databases/:id/disconnect should return 400 if id is invalid', async () => {
    const res = await request(app).post('/api/databases/undefined/disconnect');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Missing id');
  });

  it('GET /api/databases/:id should get details for id=1', async () => {
    const res = await request(app).get('/api/databases/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.database).toHaveProperty('id', 1);
  });

  it('GET /api/databases/:id should return 404 for id not found', async () => {
    const res = await request(app).get('/api/databases/99');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });

  it('GET /api/databases/:id/schema should return tables and collections', async () => {
    const res = await request(app).get('/api/databases/1/schema');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tables');
    expect(res.body).toHaveProperty('collections');
    expect(res.body.success).toBe(true);
  });

  it('GET /api/databases/:id/schema should return 400 if id is invalid', async () => {
    const res = await request(app).get('/api/databases/undefined/schema');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('message', 'Missing id');
  });

  it('GET /api/databases/:id/table-data/:tableName should return table data', async () => {
    const res = await request(app).get('/api/databases/1/table-data/TableA');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/databases/:id/table-data/:tableName should return empty data', async () => {
    const res = await request(app).get('/api/databases/1/table-data/empty');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/databases/:id/table-data/:tableName should return 400 if id or tableName is invalid', async () => {
    const res1 = await request(app).get('/api/databases/undefined/table-data/TableA');
    expect(res1.statusCode).toBe(400);
    expect(res1.body.success).toBe(false);
    expect(res1.body).toHaveProperty('message', 'Missing id or tableName');

    const res2 = await request(app).get('/api/databases/1/table-data/undefined');
    expect(res2.statusCode).toBe(400);
    expect(res2.body.success).toBe(false);
    expect(res2.body).toHaveProperty('message', 'Missing id or tableName');
  });

  it('PUT /api/databases/:id should update db', async () => {
    const res = await request(app)
      .put('/api/databases/1')
      .send({ name: 'Updated DB' });
    expect(res.statusCode).toBe(200);
    expect(res.body.database).toHaveProperty('name', 'Updated DB');
  });

  it('PUT /api/databases/:id should return 400 if id is invalid', async () => {
    const res = await request(app).put('/api/databases/undefined').send({ name: 'No Id' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('message', 'Missing id');
  });

  it('DELETE /api/databases/:id should delete db for id=1', async () => {
    const res = await request(app).delete('/api/databases/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('DELETE /api/databases/:id should return 404 for id not found', async () => {
    const res = await request(app).delete('/api/databases/99');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });
});