# QuantChat Server - Backend API

![Node.js](https://img.shields.io/badge/Node.js-20.18-%23339933)
![Express](https://img.shields.io/badge/Express-5.1-%23000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.5-%23336791)
![JWT](https://img.shields.io/badge/JWT-Auth-%23000000)
![Jest](https://img.shields.io/badge/Jest-30.0-%23C21325)

## 🚀 Overview
QuantChat Server is the backend API powering the QuantChat platform, providing user authentication, data management, and email services with robust security measures.

---

## 🛠 Technology Stack

### Core Technologies
| Component        | Technology          | Version |
|------------------|---------------------|---------|
| Runtime          | Node.js             | 20.18   |
| Framework        | Express.js          | 5.1     |
| Database         | PostgreSQL          | 17.5    |
| Authentication   | JWT & Google OAuth  | 2.0     |
| Email Service    | Nodemailer          | 7.0     |
| Testing          | Jest                | 30.0    |

### Supporting Libraries
- pg (PostgreSQL client)
- jsonwebtoken
- otp-generator
- bcryptjs
- google-auth-library

---

## 📋 Prerequisites
Before installation, ensure your system has:
- Node.js ≥ v18
- npm ≥ v8
- PostgreSQL ≥ v15
- Google Cloud account (for OAuth configuration)

---

## 📂 Project Structure

```text
quantchat-server/
├── __tests__/                      # All test files
│   ├── controllers/
│   │   ├── authController.test.js
│   │   ├── databaseController.test.js
│   │   ├── passwordResetController.test.js
│   │   └── usersController.test.js
│   ├── middlewares/
│   │   ├── authDatabase.test.js
│   │   ├── checkInactiveUsers.test.js
│   │   └── errorHandler.test.js
│   ├── models/
│   │   ├── databaseModels.test.js
│   │   └── usersModels.test.js
│   ├── routes/
│   │   ├── authRoutes.test.js
│   │   ├── databaseRoutes.test.js
│   │   ├── passwordResetRoutes.test.js
│   │   └── userRoutes.test.js
│   ├── utils/
│   │   ├── emailSender.test.js
│   │   └── otpStore.test.js
│   └── setup.js
│
├── config/
│   └── db.js                       # Database configuration
│
├── controllers/
│   ├── authController.js           # Authentication logic
│   ├── databaseController.js       # Database Management
│   ├── passwordResetController.js  # Password reset handling
│   └── usersController.js          # User management
│
├── middlewares/
│   ├── authDatabase.js             # Authorizing Databases Middleware
│   ├── checkInactiveUsers.js       # Inactive user checker
│   └── errorHandler.js             # Global error handler
│
├── models/
│   ├── usersModels.js              # User DB models
│   └── databaseModels.js           # Database DB models
│
├── routes/
│   ├── authRoutes.js               # Authentication routes
│   ├── databaseRoutes.js           # Database management routes
│   ├── passwordResetRoutes.js      # Password reset routes
│   └── usersRoutes.js              # User management routes
│
├── utils/
│   ├── emailSender.js              # Email service
│   └── otpStore.js                 # OTP management
│
├── .env
├── .gitignore
├── jest.config.js
├── package.json
├── package-lock.json
├── README.md
└── server.js                       # Main application entry point
```

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone --single-branch --branch devp-back https://github.com/Quantrail-Data/webapp-mvp.git
cd server
```

### 2. Install Dependencies

```bash
npm install
```

---

## 🔑 Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_NAME=your_database_name
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Super Admin User Configuration
SUPER_ADMIN_EMAIL=admin@quantrail.com
SUPER_ADMIN_NAME=your_admin_name
SUPER_ADMIN_PHONE=your_admin_phone_no (10 digits)
SUPER_ADMIN_ADDRESS=your_admin_address

# Email Configuration
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM_NAME="QuantChat Team"

# JWT and Token Settings
JWT_SECRET=your_very_strong_secret_key
TOKEN_EXPIRY=2h
REMEMBER_ME_EXPIRY=7d

# Organization Information
ORGANIZATION_NAME="Quantrail"
WEBAPP_NAME = "QuantChat

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Application Environment
NODE_ENV=development
PORT=5000
```

---

## 🗄️ Database Setup

### 1. Install PostgreSQL

Ensure you have PostgreSQL installed and running:

```bash
# Check if PostgreSQL is running (Linux/Mac)
sudo service postgresql status

# For Windows
services.msc → Check "PostgreSQL" service status
```

### 2. Create Database

Create a new database for **QuantChat**:

```bash
# Access PostgreSQL CLI
psql -U postgres

# Create database
CREATE DATABASE quantchat;

# Create user (optional but recommended)
CREATE USER quantchat_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE quantchat TO quantchat_user;

# Exit
\q
```

### 3. Configure Connection

Update your `.env` file with these exact database credentials:

```env
DB_NAME=quantchat (for eg)
DB_USER=quantchat_user (for eg)
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

### 4. Verify Connection

Test your database connection:

```bash
# Using psql
psql -h localhost -U quantchat_user -d quantchat

# Or via Node.js (after running the server)
# Check terminal for connection success message
```

### 5. Initialize Schema

The tables will be automatically created when you:

- Start the server for the first time
- Run the test suite using:

  ```bash
  npm test
  ```

### 6. Database Schema Setup  

### 🧱 Manual Table Creation (PostgreSQL)  

If you need to manually create the tables, here are the SQL queries:  

### **Users Table**  

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
    role VARCHAR NOT NULL DEFAULT 'Editor' CHECK (role IN ('Super Admin', 'Admin', 'Editor', 'Readonly')),
    status VARCHAR NOT NULL DEFAULT 'Inactive' CHECK (status IN ('Active', 'Inactive')),
    twoFA BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMP,
    address TEXT NOT NULL,
    password VARCHAR NOT NULL,
    selected_database INTEGER,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_selected_database 
        FOREIGN KEY (selected_database) 
        REFERENCES database_connections(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL
);

-- Create index for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### **Database Connections Table**

```sql
CREATE TABLE database_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    server_type VARCHAR NOT NULL DEFAULT 'local' CHECK (server_type IN ('local', 'external')),
    type VARCHAR NOT NULL CHECK (type IN ('PostgreSQL', 'MySQL', 'MongoDB', 'ClickHouse')),
    host VARCHAR,
    port VARCHAR,
    username VARCHAR,
    password VARCHAR,
    database VARCHAR NOT NULL,
    connection_string TEXT,
    ssl BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR DEFAULT 'Disconnected' CHECK (status IN (
        'Connected', 
        'Disconnected', 
        'Testing...',
        'Connecting...',
        'Disconnecting...',
        'Connected (Secure)',
        'Connected (Warning)'
    )),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraints for local connections
CREATE UNIQUE INDEX unique_local_connection 
ON database_connections (host, port, type, database) 
WHERE server_type = 'local';

-- Create unique constraints for external connections
CREATE UNIQUE INDEX unique_external_connection 
ON database_connections (connection_string) 
WHERE server_type = 'external';

-- Create indexes for better performance
CREATE INDEX idx_database_connections_name ON database_connections(name);
CREATE INDEX idx_database_connections_type ON database_connections(type);
CREATE INDEX idx_database_connections_status ON database_connections(status);
CREATE INDEX idx_database_connections_server_type ON database_connections(server_type);
CREATE INDEX idx_database_connections_created_at ON database_connections(created_at);
```

---

## 📧 Email Service Setup (Nodemailer)

### 1. Choose Your Email Provider
Configure based on your provider:

#### For Gmail:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password  # Not your regular password!
EMAIL_FROM_NAME="QuantChat Team"
```

### 2. Generate App Password (For Gmail)

1. Go to **Google Account → Security**
2. Enable **2-Step Verification** if not already enabled
3. Create an **App Password**:
   - Select app: `"Mail"`
   - Select device: `"Other"` (name it `"QuantChat"`)
   - Use the generated **16-digit password** in your `.env` file

---

### 3. Enable Less Secure Apps (If Required)

For some email providers:

- Visit your email provider's **security settings**
- Enable **"Allow less secure apps"** (recommended only during development)

---

### 4. Verify Configuration

Test your email setup by:

- Starting the server
- Triggering a test email (e.g., password reset or user registration)

Check both:

- Your **application logs** for any errors
- Your **email inbox** (including the **spam/junk folder**)

---

### 5. Troubleshooting

If emails aren't sending:

- ✅ Verify all `.env` values match exactly  
- 📧 Check your provider's **daily sending limits**  
- 🔒 Confirm port `587` isn’t blocked by your firewall  
- ⏳ For Gmail: Wait **5 minutes** after enabling new settings  

---

## 👑 Super Admin Setup  

### 🚀 Why Super Admin is Essential  

The **Super Admin** is a critical component of the **QuantChat** platform that ensures:  

- **Initial Access:** When the application is first deployed, there are no users in the system. Without any users, no one can log in or create new accounts.  
- **Primary Administrator:** The Super Admin serves as the main administrator who can manage all other users, databases, and system settings.  
- **Automatic Creation:** The Super Admin user is automatically created during the application startup if no users exist in the system.  
- **Highest Privileges:** This user has the highest level of permissions (`is_super_admin: true` and `role: 'Super Admin'`) and can perform all administrative functions.  

### ⚙️ How It Works  

1. **Automatic Detection:** When the server starts, it checks if any users exist in the database.  
2. **Auto-Creation:** If no users are found, the system automatically creates the Super Admin user using the credentials from your `.env` file.  
3. **Secure Setup:** The Super Admin password is automatically generated and can be reset via the “Forgot Password” flow.  
4. **Initial Login:** Once created, you can use the Super Admin email to log in and begin managing the platform.  

### 🧩 Configuration Requirements  

Make sure to set these values in your **`.env`** file:  

  ```env
  # Super Admin Configuration
  SUPER_ADMIN_EMAIL=admin@quantrail.com
  SUPER_ADMIN_NAME=your_admin_name
  SUPER_ADMIN_PHONE=your_admin_phone_no (10 digits)
  SUPER_ADMIN_ADDRESS=your_admin_address
  ```

---

## 🔒 Getting the Google OAuth Client ID (Quick Steps)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select an existing project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Web application** as the application type.
6. Under **Authorized JavaScript origins**, add:
   ```arduino
   http://localhost:5000
   ```
7. Click **Create** and copy the generated Client ID.
8. Paste it into your `.env` file as:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

### 5. Run the Application

```bash
node server.js
```

The server will be available at:

```url
http://localhost:5000
```

---

## 🧪 Testing

The server includes comprehensive **Jest** tests for all major components.

#### ✅ Run All Tests

```bash
npm test
```

- Executes all test suites  
- Runs in **watch mode** by default  
- Covers **controllers**, **models**, **routes**, and **utilities**

### 📊 Generate Test Coverage Report

```bash
npm test -- --coverage
```

- Generates detailed coverage report
- Creates HTML report in the /coverage directory
- Shows line-by-line test coverage

## 🔧 Database Setup

To initialize your database:

1. Ensure your PostgreSQL server is running
2. Create a new database for the application
3. Set up the required tables and schema using:
   - The schema definitions provided in the model files
   - Your preferred database migration tool
   - Manual SQL scripts if needed

The database connection configuration can be found in `config/db.js` and uses the environment variables from your `.env` file.

---

## 📄 API Documentation

The server provides RESTful API endpoints organized by functionality. Detailed route specifications can be found in:

- Authentication endpoints
- Password reset functionality  
- User management operations

Each route file contains documentation for:
- Available endpoints
- Required parameters
- Expected responses
- Authentication requirements

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify PostgreSQL is running
- Check `.env` database credentials
- Ensure user has proper permissions

#### Email Service Failures
- Verify SMTP settings in `.env`
- Check for provider-specific requirements (e.g., Gmail requires "Less Secure Apps" enabled or app passwords)

#### JWT Authentication Issues
- Ensure `JWT_SECRET` is set and consistent
- Verify token expiration settings
- Check token generation and verification flow

#### Google OAuth Problems
- Validate Google Client ID in `.env`
- Ensure authorized redirect URIs are properly configured
- Check that the OAuth consent screen is properly set up

### Getting Help
For additional assistance:
1. Check the application logs for detailed error messages
2. Review the test cases for expected behavior examples
3. [Open an issue](https://github.com/your-repo/issues) in the repository with:
   - Error messages
   - Steps to reproduce
   - Environment details

For additional help, please open an issue in the repository.

---
