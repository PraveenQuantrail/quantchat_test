const request = require('supertest');
const express = require('express');

// Mock controllers
jest.mock('../../controllers/passwordResetController', () => ({
  sendOTP: (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });
    return res.status(200).json({ success: true, message: 'OTP sent' });
  },
  verifyOTP: (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP required' });
    if (otp !== '123456') return res.status(401).json({ success: false, error: 'Invalid OTP' });
    return res.status(200).json({ success: true, message: 'OTP verified' });
  },
  resetPassword: (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, error: 'All fields required' });
    if (otp !== '123456') return res.status(401).json({ success: false, error: 'Invalid OTP' });
    return res.status(200).json({ success: true, message: 'Password reset successful' });
  },
  checkResetStatus: (req, res) => {
    return res.status(200).json({ success: true, status: 'OTP Verified' });
  }
}));

const passwordResetRoutes = require('../../routes/passwordResetRoutes');

const app = express();
app.use(express.json());
app.use('/api/password-reset', passwordResetRoutes);

describe('Password Reset Routes', () => {
  it('POST /api/password-reset/send-otp should require email', async () => {
    const res = await request(app)
      .post('/api/password-reset/send-otp')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/password-reset/send-otp should succeed with email', async () => {
    const res = await request(app)
      .post('/api/password-reset/send-otp')
      .send({ email: 'test@example.com' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'OTP sent');
  });

  it('POST /api/password-reset/verify-otp should require email and OTP', async () => {
    const res = await request(app)
      .post('/api/password-reset/verify-otp')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/password-reset/verify-otp should fail with wrong OTP', async () => {
    const res = await request(app)
      .post('/api/password-reset/verify-otp')
      .send({ email: 'test@example.com', otp: '000000' });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'Invalid OTP');
  });

  it('POST /api/password-reset/verify-otp should succeed with correct email and OTP', async () => {
    const res = await request(app)
      .post('/api/password-reset/verify-otp')
      .send({ email: 'test@example.com', otp: '123456' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'OTP verified');
  });

  it('POST /api/password-reset/reset-password should require all fields', async () => {
    const res = await request(app)
      .post('/api/password-reset/reset-password')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/password-reset/reset-password should fail with wrong OTP', async () => {
    const res = await request(app)
      .post('/api/password-reset/reset-password')
      .send({ email: 'test@example.com', otp: '000000', newPassword: 'newPass123' });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'Invalid OTP');
  });

  it('POST /api/password-reset/reset-password should succeed with correct data', async () => {
    const res = await request(app)
      .post('/api/password-reset/reset-password')
      .send({ email: 'test@example.com', otp: '123456', newPassword: 'newPass123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Password reset successful');
  });

  it('GET /api/password-reset/check-status should return status', async () => {
    const res = await request(app)
      .get('/api/password-reset/check-status');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('status', 'OTP Verified');
  });
});