const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authDatabase = require('../middlewares/authDatabase'); // <--- ADD THIS LINE

// Get all users - GET /api/users
router.get('/', authDatabase, usersController.getAllUsers);

// Create a new user - POST /api/users
router.post('/', authDatabase, usersController.createUser);

// Update a user - PUT /api/users/:id
router.put('/:id', authDatabase, usersController.updateUser);

// Delete a user - DELETE /api/users/:id
router.delete('/:id', authDatabase, usersController.deleteUser);

module.exports = router;