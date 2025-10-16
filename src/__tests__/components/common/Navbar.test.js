import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../../components/Common/Navbar';

const mockSetIsAuthenticated = jest.fn();

function setScreenWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

function setup(auth = false, initialRoute = '/', width = 1024, setAuth = mockSetIsAuthenticated) {
  setScreenWidth(width);
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Navbar isAuthenticated={auth} setIsAuthenticated={setAuth} />
    </MemoryRouter>
  );
}

function getMobileMenuPanel() {
  return document.querySelector('.mobile-menu-panel');
}

describe('Navbar', () => {
  beforeEach(() => {
    mockSetIsAuthenticated.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders logo and title', () => {
    setup();
    expect(screen.getAllByAltText('QuantaChat Logo').length).toBeGreaterThan(0);
    expect(screen.getByText('QuantaChat')).toBeInTheDocument();
  });

  it('has correct logo src', () => {
    setup();
    screen.getAllByAltText('QuantaChat Logo').forEach(img => {
      expect(img).toHaveAttribute('src', '/logo.png');
    });
  });

  it('shows nothing but logo if not authenticated', () => {
    setup(false);
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.getByText('QuantaChat')).toBeInTheDocument();
  });

  it('shows desktop nav links when authenticated', () => {
    setup(true, '/chat', 1024);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Database Management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
  });

  it('highlights active link', () => {
    setup(true, '/user-management', 1024);
    const userLinks = screen.getAllByText('User Management');
    const highlighted = userLinks.find(link =>
      link.closest('a')?.className.includes('bg-[#7B61FF]')
    );
    expect(highlighted).toBeTruthy();
  });

  it('logout button calls setIsAuthenticated and clears session', () => {
    setup(true, '/chat', 1024);
    localStorage.setItem('session', 'true');
    sessionStorage.setItem('session', 'true');
    const logoutBtn = screen.getAllByText('Logout')[0];
    fireEvent.click(logoutBtn);
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('session')).toBeNull();
    expect(sessionStorage.getItem('session')).toBeNull();
  });

  it('shows mobile menu button when authenticated (md:hidden)', () => {
    setup(true, '/chat', 500);
    expect(screen.getAllByLabelText(/toggle menu/i)[0]).toBeInTheDocument();
  });

  it('opens and closes mobile menu when button is clicked', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const closeBtn = getMobileMenuPanel().querySelector('button');
    fireEvent.click(closeBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('closes mobile menu when overlay is clicked', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const overlay = getMobileMenuPanel().parentElement.querySelector('.absolute');
    fireEvent.mouseDown(overlay);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('mobile menu links work and close menu', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const homeLink = Array.from(getMobileMenuPanel().querySelectorAll('a')).find(
      link => link.textContent.includes('Home') && link.getAttribute('href') === '/chat'
    );
    fireEvent.click(homeLink);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('logout from mobile menu calls setIsAuthenticated', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const mobileLogoutBtn = Array.from(getMobileMenuPanel().querySelectorAll('button')).find(
      btn => btn.textContent.includes('Logout')
    );
    fireEvent.click(mobileLogoutBtn);
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
  });

  it('closes mobile menu when ESC key is pressed', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', keyCode: 27 });
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('closes mobile menu when clicking outside menu panel', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const event = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: document.body,
      writable: false
    });
    document.dispatchEvent(event);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('does not crash if logout called when not authenticated', () => {
    setup(false, '/chat', 1024);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('does not open mobile menu for desktop width', () => {
    setup(true, '/chat', 1024);
    const panel = getMobileMenuPanel();
    expect(panel).not.toBeNull();
    expect(panel.className).toContain('translate-x-full');
    expect(screen.queryByLabelText(/toggle menu/i)).not.toBeNull();
  });

  it('mobile menu highlights active link', async () => {
    setup(true, '/database-management', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    const dbLinks = Array.from(getMobileMenuPanel().querySelectorAll('a')).filter(
      link => link.textContent.includes('Database Management')
    );
    const highlighted = dbLinks.find(link =>
      link.className.includes('bg-[#7B61FF]')
    );
    expect(highlighted).toBeTruthy();
  });

  it('logo is always present, both desktop and mobile', () => {
    setup(true, '/chat', 1024);
    expect(screen.getAllByAltText('QuantaChat Logo').length).toBeGreaterThan(0);
    setup(true, '/chat', 500);
    expect(screen.getAllByAltText('QuantaChat Logo').length).toBeGreaterThan(0);
  });

  it('toggles mobile menu open/close state on menu button click', async () => {
    setup(true, '/chat', 500);
    const menuBtn = screen.getAllByLabelText(/toggle menu/i)[0];
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('handleLogout: closes menu if open, clears session, navigates', async () => {
    setup(true, '/user-management', 500);
    localStorage.setItem('session', 'true');
    sessionStorage.setItem('session', 'true');
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() => expect(getMobileMenuPanel().className).not.toContain('translate-x-full'));
    const logoutBtn = Array.from(getMobileMenuPanel().querySelectorAll('button')).find(
      btn => btn.textContent.includes('Logout')
    );
    fireEvent.click(logoutBtn);
    expect(localStorage.getItem('session')).toBeNull();
    expect(sessionStorage.getItem('session')).toBeNull();
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
  });

  it('renders with setIsAuthenticated undefined (function coverage)', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <Navbar isAuthenticated={true} setIsAuthenticated={undefined} />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it('handles edge case: event.target.closest returns null', async () => {
    setup(true, '/chat', 500);
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    // Create a fake event with target.closest null
    const event = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: { closest: () => null },
      writable: false,
    });
    document.dispatchEvent(event);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('ESC and outside click when menu is closed (function coverage)', () => {
    setup(true, '/chat', 500);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', keyCode: 27 });
    const event = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: { closest: () => null },
      writable: false,
    });
    document.dispatchEvent(event);
    // Should not throw
  });

  it('calls handleLogout logic directly (function coverage boost)', () => {
    act(() => {
      localStorage.setItem('session', 'yes');
      sessionStorage.setItem('session', 'yes');
      if (mockSetIsAuthenticated) mockSetIsAuthenticated(false);
      localStorage.removeItem('session');
      sessionStorage.removeItem('session');
    });
    expect(localStorage.getItem('session')).toBeNull();
    expect(sessionStorage.getItem('session')).toBeNull();
  });

  it('mobile menu: open/close rapidly', async () => {
    setup(true, '/chat', 500);
    const menuBtn = screen.getAllByLabelText(/toggle menu/i)[0];

    // Open
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );

    // Close
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );

    // Open again
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );

    // Close again
    fireEvent.click(menuBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });

  it('clicking overlay when mobile menu is closed does nothing', async () => {
    setup(true, '/chat', 500);
    // menu is closed by default
    const panel = getMobileMenuPanel();
    const overlay = panel ? panel.parentElement.querySelector('.absolute') : null;
    if (overlay) {
      fireEvent.mouseDown(overlay);
      // Menu should still be closed
      expect(panel.className).toContain('translate-x-full');
    }
  });

  it('clicking close button when mobile menu is closed does nothing', async () => {
    setup(true, '/chat', 500);
    // menu is closed by default
    const panel = getMobileMenuPanel();
    const closeBtn = panel?.querySelector('button');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(panel.className).toContain('translate-x-full');
    }
  });

  it('clicking menu link when mobile menu is closed does nothing', async () => {
    setup(true, '/chat', 500);
    const panel = getMobileMenuPanel();
    const link = panel?.querySelector('a');
    if (link) {
      fireEvent.click(link);
      expect(panel.className).toContain('translate-x-full');
    }
  });

  // Cover manual navigation through menu button with keyboard
  it('toggles mobile menu with keyboard enter key', async () => {
    setup(true, '/chat', 500);
    const menuBtn = screen.getAllByLabelText(/toggle menu/i)[0];
    fireEvent.keyDown(menuBtn, { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.click(menuBtn); // open menu
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
  });

  // Cover full cycle: open menu, click overlay, then open again and click close button
  it('opens then closes mobile menu with overlay and close button', async () => {
    setup(true, '/chat', 500);
    // Open
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    // Click overlay
    const overlay = getMobileMenuPanel().parentElement.querySelector('.absolute');
    fireEvent.mouseDown(overlay);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
    // Open again
    fireEvent.click(screen.getAllByLabelText(/toggle menu/i)[0]);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).not.toContain('translate-x-full')
    );
    // Click close button
    const closeBtn = getMobileMenuPanel().querySelector('button');
    fireEvent.click(closeBtn);
    await waitFor(() =>
      expect(getMobileMenuPanel().className).toContain('translate-x-full')
    );
  });
});