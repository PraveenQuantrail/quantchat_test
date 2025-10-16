import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthRoute from "../../../components/Common/AuthRoute";

function Dummy() {
  return <div>Public</div>;
}
function DummyChat() {
  return <div>Chat</div>;
}

describe('AuthRoute', () => {
  it('renders children when not allowed (not authenticated)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AuthRoute isAllowed={false} />}>
            <Route path="/" element={<Dummy />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('redirects to /chat when isAllowed (authenticated)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AuthRoute isAllowed={true} />}>
            <Route path="/" element={<Dummy />} />
          </Route>
          <Route path="/chat" element={<DummyChat />} />
        </Routes>
      </MemoryRouter>
    );
    // Should not see Public, but Chat after redirect
    expect(screen.queryByText('Public')).not.toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('redirects to custom path when isAllowed and redirectPath is set', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AuthRoute isAllowed={true} redirectPath="/custom" />}>
            <Route path="/" element={<Dummy />} />
          </Route>
          <Route path="/custom" element={<div>Custom</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.queryByText('Public')).not.toBeInTheDocument();
  });
});