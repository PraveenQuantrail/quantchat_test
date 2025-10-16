const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const authDatabase = require('../middlewares/authDatabase'); 

// Get all databases - GET /api/databases
router.get('/', authDatabase, databaseController.getAllDatabases);

// Add a new database - POST /api/databases
router.post('/', authDatabase, databaseController.addDatabase);

// Test a database connection - POST /api/databases/:id/test
router.post('/:id/test', authDatabase, databaseController.testDatabase);

// Connect to a database - POST /api/databases/:id/connect
router.post('/:id/connect', authDatabase, databaseController.connectDatabase);

// Disconnect from a database - POST /api/databases/:id/disconnect
router.post('/:id/disconnect', authDatabase, databaseController.disconnectDatabase);

// Get database details - GET /api/databases/:id
router.get('/:id', authDatabase, databaseController.getDatabaseDetails);

// Get database schema/tables - GET /api/databases/:id/schema
router.get('/:id/schema', authDatabase, databaseController.getDatabaseSchema);

// Get table/collection data - GET /api/databases/:id/table-data/:tableName
router.get('/:id/table-data/:tableName', authDatabase, databaseController.getTableData);

// Updated database - PUT /api/databases/:id
router.put('/:id', authDatabase, databaseController.updateDatabase);

// Delete database - DELETE /api/databases/:id
router.delete('/:id', authDatabase, databaseController.deleteDatabase);

module.exports = router;