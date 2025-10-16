// Disabling dotenv logs during tests
require('dotenv').config({ silent: true, debug: false });

// Setting test-specific environment variables
process.env.ORGANIZATION_NAME = 'Test Org';