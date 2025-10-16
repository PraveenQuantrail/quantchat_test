const { Op } = require('sequelize');
const checkInactiveUsers = require('../../middlewares/checkInactiveUsers');
const User = require('../../models/usersModels');

jest.mock('../../models/usersModels');

describe('Check Inactive Users', () => {
  beforeEach(() => {
    User.update.mockClear();
  });

  it('should update users who have been inactive for 6 months', async () => {
    User.update.mockResolvedValue([1]);
    await checkInactiveUsers();
    expect(User.update).toHaveBeenCalled();
    // Check correct arguments
    const callArgs = User.update.mock.calls[0][1];
    expect(callArgs.where.status).toBe('Active');
    expect(callArgs.where.lastLogin).toBeDefined();
    // The date should be about 6 months ago
    const lastLoginDate = callArgs.where.lastLogin[Op.lt];
    expect(lastLoginDate).toBeInstanceOf(Date);
    const now = new Date();
    expect(now.getMonth() - lastLoginDate.getMonth() === 6 || now.getMonth() - lastLoginDate.getMonth() === -6).toBeTruthy();
  });

  it('should handle errors gracefully', async () => {
    User.update.mockRejectedValue(new Error('DB error'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await checkInactiveUsers();
    expect(spy).toHaveBeenCalledWith(
      'Error updating inactive users:',
      expect.any(Error)
    );
    spy.mockRestore();
  });
});