const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const usersRouter = require('./routes/usersRoutes');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const checkInactiveUsers = require('./middlewares/checkInactiveUsers');
const usersController = require('./controllers/usersController');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', usersRouter);
app.use('/api/auth', authRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/databases', databaseRoutes);


// Run inactive user check every day
setInterval(checkInactiveUsers, 24 * 60 * 60 * 1000);
checkInactiveUsers().catch(console.error); // Run immediately on startup

// Run token cleanup every 6 hours
setInterval(() => {
  usersController.cleanupRevokedTokens(24); // Clean tokens older than 24 hours
}, 6 * 60 * 60 * 1000);

// Error handling middleware
app.use(errorHandler);

// Test database connection and sync models
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.sync();
    console.log('Database synchronized');

    // Initialize core admin after database sync
    await usersController.initializeSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }
};

startServer();