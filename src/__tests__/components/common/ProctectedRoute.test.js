import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from "../../../components/Common/ProtectedRoute";

function DummyProtected() {
  return <div>Protected</div>;
}
function DummyLogin() {
  return <div>Login</div>;
}

describe('ProtectedRoute', () => {
  it('renders children when isAllowed (authenticated)', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute isAllowed={true} />}>
            <Route path="/protected" element={<DummyProtected />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('redirects to / when not allowed (not authenticated)', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute isAllowed={false} />}>
            <Route path="/protected" element={<DummyProtected />} />
          </Route>
          <Route path="/" element={<DummyLogin />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('redirects to custom path when not allowed and redirectPath is set', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute isAllowed={false} redirectPath="/custom" />}>
            <Route path="/protected" element={<DummyProtected />} />
          </Route>
          <Route path="/custom" element={<div>Custom</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });
});