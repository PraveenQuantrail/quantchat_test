const {generateOTP,generateStrongPassword,sendOTPEmail,sendInitialPasswordEmail} = require('../../utils/emailSender');
const nodemailer = require('nodemailer');

jest.mock('nodemailer', () => {
  const sendMail = jest.fn();
  return {
    createTransport: jest.fn(() => ({
      sendMail
    }))
  };
});

describe('Email Sender', () => {
  let sendMailMock;

  beforeEach(() => {
    sendMailMock = nodemailer.createTransport().sendMail;
    jest.clearAllMocks();

    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'user@test.com';
    process.env.EMAIL_PASSWORD = 'password';
    process.env.EMAIL_FROM_NAME = 'TestApp';
    process.env.ORGANIZATION_NAME = 'MyOrg';
    process.env.WEBAPP_NAME = 'TestWebApp';
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP as a string', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should not generate leading zeros', () => {
      // generateOTP always starts from 100000, so no leading zero
      for (let i = 0; i < 10; i++) {
        expect(generateOTP()[0]).not.toBe('0');
      }
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate a 12-character password', () => {
      const pwd = generateStrongPassword();
      expect(pwd).toHaveLength(12);
    });

    it('should contain at least one uppercase, lowercase, number, and special character', () => {
      const pwd = generateStrongPassword();
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*()_+\-=]/.test(pwd)).toBe(true);
    });

    it('should generate different passwords each call', () => {
      const pwd1 = generateStrongPassword();
      const pwd2 = generateStrongPassword();
      expect(pwd1).not.toEqual(pwd2);
    });
  });

  describe('sendOTPEmail', () => {
    it('should send OTP email and return true on success', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'abc123' });
      const result = await sendOTPEmail('test@test.com', 'Test User', '123456');
      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@test.com',
        subject: 'Password Reset OTP',
        text: expect.stringContaining('OTP: 123456'),
        html: expect.stringContaining('123456')
      }));
    });

    it('should use env variables for mail options', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'abc123' });
      await sendOTPEmail('test@test.com', 'Test User', '654321');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.from).toBe('"TestApp" <user@test.com>');
    });

    it('should handle error in sendOTPEmail and return false', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP error'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await sendOTPEmail('test@test.com', 'Test User', '123456');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith('Error sending OTP email:', expect.any(Error));
      spy.mockRestore();
    });

    describe.each([
      ['John Doe', 'John'],
      ['John', 'John'],
      ['', 'User'],
      ['   ', 'User'],
      [undefined, 'User'],
      [null, 'User'],
    ])('firstName extraction (%s)', (inputName, expectedFirstName) => {
      it(`should use "${expectedFirstName}" for name "${inputName}"`, async () => {
        sendMailMock.mockResolvedValue({ messageId: 'abc123' });
        await sendOTPEmail('test@test.com', inputName, '123456');
        const mailOptions = sendMailMock.mock.calls[0][0];
        expect(mailOptions.text).toMatch(new RegExp(`^Hi ${expectedFirstName},`));
        expect(mailOptions.html).toMatch(new RegExp(`Hi ${expectedFirstName},`));
      });
    });

    it('should use default env variables if not set', async () => {
      delete process.env.ORGANIZATION_NAME;
      delete process.env.WEBAPP_NAME;
      sendMailMock.mockResolvedValue({ messageId: 'abc123' });
      await sendOTPEmail('test@test.com', 'Test User', '123456');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toMatch(/Our Organization/);
      expect(mailOptions.html).toMatch(/Our Website/);
    });
  });

  describe('sendInitialPasswordEmail', () => {
    it('should send initial password email and return true on success', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'def456' });
      const result = await sendInitialPasswordEmail('test@test.com', 'Test User', 'initial123');
      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Welcome to'),
        text: expect.stringContaining('Initial Password: initial123'),
        html: expect.stringContaining('initial123')
      }));
    });

    it('should handle error in sendInitialPasswordEmail and return false', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP error'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await sendInitialPasswordEmail('test@test.com', 'Test User', 'initial123');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith('Error sending initial password email:', expect.any(Error));
      spy.mockRestore();
    });

    describe.each([
      ['Jane Smith', 'Jane'],
      ['Jane', 'Jane'],
      ['', 'User'],
      ['   ', 'User'],
      [undefined, 'User'],
      [null, 'User'],
    ])('firstName extraction (%s)', (inputName, expectedFirstName) => {
      it(`should use "${expectedFirstName}" for name "${inputName}"`, async () => {
        sendMailMock.mockResolvedValue({ messageId: 'def456' });
        await sendInitialPasswordEmail('test@test.com', inputName, 'pass123');
        const mailOptions = sendMailMock.mock.calls[0][0];
        expect(mailOptions.text).toMatch(new RegExp(`^Hi ${expectedFirstName},`));
        expect(mailOptions.html).toMatch(new RegExp(`Hi ${expectedFirstName},`));
      });
    });

    it('should use default env variables if not set', async () => {
      delete process.env.ORGANIZATION_NAME;
      delete process.env.WEBAPP_NAME;
      sendMailMock.mockResolvedValue({ messageId: 'def456' });
      await sendInitialPasswordEmail('test@test.com', 'Test User', 'initial123');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.html).toMatch(/Our Organization/);
      expect(mailOptions.html).toMatch(/Our Website/);
    });

    it('should use env variables for mail options', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'def456' });
      await sendInitialPasswordEmail('test@test.com', 'Test User', 'initial123');
      const mailOptions = sendMailMock.mock.calls[0][0];
      expect(mailOptions.from).toBe('"TestApp" <user@test.com>');
    });
  });
});