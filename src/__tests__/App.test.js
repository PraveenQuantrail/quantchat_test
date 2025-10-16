import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import App from "../App";

// Mock components
jest.mock('../components/Common/Navbar', () => ({
  __esModule: true,
  default: ({ isAuthenticated }) => (
    <div>
      Navbar
      {isAuthenticated ? ' Authenticated' : ' Not Authenticated'}
    </div>
  ),
}));
jest.mock('../components/Login/Login', () => ({
  __esModule: true,
  default: ({ setIsAuthenticated }) => <div>Login Page</div>,
}));
jest.mock('../components/Login/ForgotPassword', () => ({
  __esModule: true,
  default: () => <div>Forgot Password Page</div>,
}));
jest.mock('../components/Home/Chat', () => ({
  __esModule: true,
  default: () => <div>Chat Page</div>,
}));
jest.mock('../components/UserManagement/UserManagement', () => ({
  __esModule: true,
  default: () => <div>User Management Page</div>,
}));
jest.mock('../components/DatabaseManagement/DatabaseManagement', () => ({
  __esModule: true,
  default: () => <div>Database Management Page</div>,
}));

// Mock route guards
jest.mock('../components/Common/ProtectedRoute', () => {
  const React = require('react');
  const { Outlet } = require('react-router-dom');
  return {
    __esModule: true,
    default: ({ isAllowed }) => {
      // FIX: When not allowed, render Login Page instead of Not Allowed
      return isAllowed ? <Outlet /> : <div>Login Page</div>;
    },
  };
});
jest.mock('../components/Common/AuthRoute', () => {
  const React = require('react');
  const { Outlet } = require('react-router-dom');
  return {
    __esModule: true,
    default: ({ isAllowed }) => {
      return !isAllowed ? <Outlet /> : <div>Already Authenticated</div>;
    },
  };
});

// Cleanup
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
});
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  jest.resetAllMocks();
});

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    window.history.pushState({}, 'Test page', '/');
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Navbar Not Authenticated')).toBeInTheDocument();
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('shows login page when not authenticated', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Chat Page')).not.toBeInTheDocument();
  });

  it('shows chat page when authenticated via localStorage', async () => {
    localStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/chat');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Navbar Authenticated')).toBeInTheDocument();
    expect(await screen.findByText('Chat Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows chat page when authenticated via sessionStorage', async () => {
    sessionStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/chat');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Navbar Authenticated')).toBeInTheDocument();
    expect(await screen.findByText('Chat Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to chat page when authenticated and accessing root', async () => {
    localStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/non-existent-route');
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Chat Page')).toBeInTheDocument();
  });

  it('redirects to login page when not authenticated and accessing protected route', async () => {
    window.history.pushState({}, 'Test page', '/chat');
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Chat Page')).not.toBeInTheDocument();
  });

  it('shows forgot password page when not authenticated', async () => {
    window.history.pushState({}, 'Test page', '/forgot-password');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Forgot Password Page')).toBeInTheDocument();
  });

  it('shows user management page when authenticated', async () => {
    localStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/user-management');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('User Management Page')).toBeInTheDocument();
  });

  it('shows database management page when authenticated', async () => {
    localStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/database-management');
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Database Management Page')).toBeInTheDocument();
  });

  it('handles 404 routes by redirecting to login when not authenticated', async () => {
    window.history.pushState({}, 'Test page', '/non-existent-route');
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('handles 404 routes by redirecting to chat when authenticated', async () => {
    localStorage.setItem('session', 'dummy-token');
    window.history.pushState({}, 'Test page', '/non-existent-route');
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByText('Chat Page')).toBeInTheDocument();
  });
});