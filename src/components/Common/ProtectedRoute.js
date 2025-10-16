import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';

const ProtectedRoute = ({ redirectPath = '/', isAllowed }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(isAllowed);
  const navigate = useNavigate();

  useEffect(() => {
    // Only check if supposed to be allowed
    if (isAllowed) {
      api.get('/api/auth/me')
        .then(() => {
          setAllowed(true);
          setChecking(false);
        })
        .catch(() => {
          // User is deleted or unauthorized
          localStorage.removeItem('session');
          sessionStorage.removeItem('session');
          setAllowed(false);
          setChecking(false);
          navigate('/?message=account_deleted');
        });
    } else {
      setAllowed(false);
      setChecking(false);
    }
  }, [isAllowed, navigate]);

  if (checking) return null; 

  if (!allowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;