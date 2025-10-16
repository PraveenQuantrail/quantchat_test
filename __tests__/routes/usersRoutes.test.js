const request = require('supertest');
const express = require('express');
const usersRoutes = require('../../routes/usersRoutes');

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

describe('Users Routes', () => {
  it('GET /api/users should return users list', async () => {
    const res = await request(app)
      .get('/api/users');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('users');
  });

  it('POST /api/users should require all fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('PUT /api/users/:id should require id parameter', async () => {
    const res = await request(app)
      .put('/api/users/1')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('DELETE /api/users/:id should return 404 for mock', async () => {
    const res = await request(app)
      .delete('/api/users/1');
    expect(res.statusCode).toEqual(404);
  });
});