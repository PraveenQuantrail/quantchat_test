import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from "../../context/AuthContext";
// Helper component to test context value
function TestComponent() {
  const { isLoggedIn, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isLoggedIn ? 'LoggedIn' : 'LoggedOut'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn()
  };
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  it('should show LoggedOut initially', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
  });

  it('should show LoggedIn if session exists in localStorage', () => {
    localStorage.setItem('session', 'token');
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedIn');
  });

  it('should show LoggedIn if session exists in sessionStorage', () => {
    sessionStorage.setItem('session', 'token');
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedIn');
  });

  it('login and logout should update auth status', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    act(() => {
      screen.getByText('Login').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedIn');

    act(() => {
      screen.getByText('Logout').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('LoggedOut');
  });
});