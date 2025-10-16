# quantchat_test
development version

# QuantChat - AI-Powered Data Analysis Platform

![React](https://img.shields.io/badge/React-18.2-%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-%2306B6D4)
![Jest](https://img.shields.io/badge/Jest-29.7-%23C21325)
![Google_OAuth](https://img.shields.io/badge/Google_OAuth-2.0-%234285F4)

## 🚀 Overview
QuantChat is a cutting-edge React application that combines AI-powered data analysis with robust user management in an intuitive chat interface.


---

## 🛠 Technology Stack

### Core Technologies
| Component        | Technology          | Version |
|------------------|---------------------|---------|
| Frontend Framework | React.js           | 18.2    |
| CSS Framework    | TailwindCSS         | 3.4     |
| Authentication   | Google OAuth 2.0    | 2.0     |
| Testing          | Jest                | 29.7    |

### Supporting Tools
- React Testing Library
- npm Package Manager
- ESLint (Code Quality)
- Prettier (Code Formatting)

---

## 📋 Prerequisites
Before installation, ensure your system has:
- Node.js ≥ v14
- npm ≥ v6
- Google Cloud account (for OAuth configuration)

---

## 📂 Project Structure

```text
quantchat-client/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   └── logo.png
│
├── src/
│   ├── __tests__/               # All test files
│   │   ├── App.test.js
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── AuthRoute.test.js
│   │   │   │   ├── Navbar.test.js
│   │   │   │   └── ProtectedRoute.test.js
│   │   │   ├── AddDatabase.test.js
│   │   │   ├── AddUser.test.js
│   │   │   ├── DatabaseManagement.test.js
│   │   │   ├── EditDatabase.test.js
│   │   │   ├── EditUser.test.js
│   │   │   ├── ForgotPassword.test.js
│   │   │   ├── Login.test.js
│   │   │   ├── ShowDatabase.test.js
│   │   │   └── UserManagement.test.js
│   │   ├── context/
│   │   │   └── AuthContext.test.js
│   │   └── utils/
│   │       └── api.test.js
│   │
│   ├── components/
│   │   ├── Common/
│   │   │   ├── AuthRoute.js
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.js
│   │   ├── DatabaseManagement/
│   │   │   ├── AddDatabase.jsx
│   │   │   ├── DatabaseManagement.jsx
│   │   │   ├── EditDatabase.jsx
│   │   │   └── ShowDatabase.jsx
│   │   ├── Home/
│   │   │   ├── ViewSelectedDB.jsx
│   │   │   └── Chat.jsx
│   │   ├── Login/
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── Login.jsx
│   │   └── UserManagement/
│   │       ├── AddUser.jsx
│   │       ├── EditUser.jsx
│   │       └── UserManagement.jsx
│   │
│   ├── context/
│   │   └── AuthContext.js
│   │
│   ├── utils/
│   │   └── api.js
│   │
│   ├── App.js
│   ├── index.css
│   ├── index.js
│   └── setupTests.js
│
├── .env
├── .gitignore
├── jest.config.json
├── package.json
├── package-lock.json
├── README.md
└── tailwind.config.js
```

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone --single-branch --branch devp https://github.com/Quantrail-Data/webapp-mvp.git
cd client
```

## 2. Install Dependencies

```bash
npm install
```

## 3. 🔑 Environment Variables Setup

Create a `.env` file in the root directory and add your Google OAuth Client ID:

  ```env
  REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
  ```

### 🔒 Getting the Google OAuth Client ID (Quick Steps)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select an existing project
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application** as the application type
6. Under **Authorized JavaScript origins**, add:
  ```arduino
  http://localhost:3000
  ```

7. Click Create and copy the generated Client ID
8. Paste it into your .env file like this:
  ```env
  REACT_APP_GOOGLE_CLIENT_ID=your_generated_client_id_here
  ```

## 4. Run the Application

```bash
npm start
```
The app will be available at:

```url
http://localhost:3000
```

---

## 🧪 Testing

QuantChat includes Jest tests for components, context, and utility functions.

---

### ✅ Run All Tests

```bash
npm test
```

- Starts Jest in watch mode  
- Runs all `.test.js` files  
- Displays interactive test results in the terminal  

### 📊 Run Tests with Coverage Report

```bash
npm test -- --coverage
```

- Displays code coverage summary in the terminal
- Generates detailed report in the /coverage folder
= Includes line-by-line breakdown of which code is covered

---

## 🚨 Frontend Troubleshooting

### Common Issues

#### Google OAuth Failures
- Verify `REACT_APP_GOOGLE_CLIENT_ID` is set in `.env`
- Check authorized origins in Google Cloud Console
- Ensure the domain matches exactly (including http/https)
- Clear browser cache after configuration changes

#### React Application Errors
- Check for console errors in browser DevTools
- Verify all dependencies are installed (`node_modules` exists)
- Ensure you're using compatible Node.js version (v14+)

#### Styling Issues
- Confirm TailwindCSS is properly configured
- Check `tailwind.config.js` for customizations
- Verify PostCSS is processing styles correctly

#### Test Failures
- Check for snapshot mismatches
- Verify mock data matches current API responses
- Ensure all async operations are properly handled in tests

### Development Tips

#### Hot Reload Not Working
- Try manual refresh (Ctrl+R/Cmd+R)
- Check for errors in terminal where dev server is running
- Verify `react-scripts` version matches package.json

#### Performance Issues
- Run production build for performance testing:
  ```bash
  npm run build
  serve -s build
  ```

### 🆘 Getting Help

When reporting issues, please include:

- 🧾 **Browser console errors**
- 🔁 **Steps to reproduce**
- 🖼️ **Screenshots**, if applicable
- 💻 **Environment details** (OS, Node.js version, etc.)
- 🛠️ **Any recent changes** made

For additional help, please open an issue in the repository.

---


