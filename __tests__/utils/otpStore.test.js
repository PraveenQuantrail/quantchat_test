const otpStore = require('../../utils/otpStore');

describe('OTP Store', () => {
  it('should set and get OTP data', () => {
    const email = 'test@test.com';
    const data = { otp: '123456', expiry: Date.now() + 300000 };
    otpStore.set(email, data);
    expect(otpStore.get(email)).toEqual(data);
  });

  it('should delete OTP data', () => {
    const email = 'test@test.com';
    const data = { otp: '123456', expiry: Date.now() + 300000 };
    otpStore.set(email, data);
    otpStore.delete(email);
    expect(otpStore.get(email)).toBeUndefined();
  });
});