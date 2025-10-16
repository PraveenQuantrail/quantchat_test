const { Op } = require('sequelize');
const User = require('../models/usersModels');

module.exports = async () => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        await User.update(
            { status: 'Inactive' },
            {
                where: {
                    lastLogin: {
                        [Op.lt]: sixMonthsAgo
                    },
                    status: 'Active'
                }
            }
        );
    } catch (error) {
        console.error('Error updating inactive users:', error);
    }
};