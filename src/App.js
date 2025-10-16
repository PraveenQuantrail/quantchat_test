import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Common/Navbar';
import Login from './components/Login/Login';
import ForgotPassword from './components/Login/ForgotPassword';
import Chat from './components/Home/Chat';
import UserManagement from './components/UserManagement/UserManagement';
import DatabaseManagement from './components/DatabaseManagement/DatabaseManagement';
import ProtectedRoute from './components/Common/ProtectedRoute';
import AuthRoute from './components/Common/AuthRoute';

function AppRoutes() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    !!localStorage.getItem('session') || !!sessionStorage.getItem('session')
  );



  
  useEffect(()=>{
    function initmethod(){
      try {
        const SESSIONKEY = process.env.REACT_APP_SESSIONID_KEY;
        const isThere = localStorage.getItem(SESSIONKEY);
        if (!isThere) {
          localStorage.setItem(SESSIONKEY,JSON.stringify([]));
        }
      }
      catch(err) {
        throw err;
      }
    }

    initmethod()
  },[])

  return (
    <>
      <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Routes for authenticated users */}
          <Route element={<ProtectedRoute isAllowed={isAuthenticated} />}>
            <Route path="/chat" element={<Chat />} />
            <Route 
              path="/user-management" 
              element={<UserManagement setIsAuthenticated={setIsAuthenticated} />} 
            />
            <Route path="/database-management" element={<DatabaseManagement />} />
          </Route>

          {/* Routes for non-authenticated users */}
          <Route element={<AuthRoute isAllowed={isAuthenticated} />}>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/chat" replace />
                ) : (
                  <Login setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          
          {/* Catch-all route */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/chat" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;