import { Navigate, Outlet } from 'react-router-dom';

const AuthRoute = ({ redirectPath = '/chat', isAllowed }) => {
  if (isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default AuthRoute;