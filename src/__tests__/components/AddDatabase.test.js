import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import AddDatabase from '../../components/DatabaseManagement/AddDatabase';

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AddDatabase', () => {
  let onClose;
  let onAddDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    onAddDatabase = jest.fn().mockResolvedValue();
  });

  it('renders form fields and closes on close/cancel button or Escape', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    expect(screen.getByText(/Add New Database/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter connection name/i)).toBeInTheDocument();
    expect(screen.getByText(/Local\/Internal/i)).toBeInTheDocument();
    expect(screen.getByText(/External \(Cloud\)/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter database name/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Connection/i)).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    // Wait for onClose to be called (since Escape/close icon uses state/prop callback)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    // Re-render to restore modal for cancel button test
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    const cancelButtons = screen.getAllByText(/Cancel/i);
    await userEvent.click(cancelButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors for required fields', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    userEvent.click(screen.getByText('Add Connection'));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Host is required')).toBeInTheDocument();
      expect(screen.getByText('Port is required')).toBeInTheDocument();
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Database name is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for short name and port number', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter connection name/i), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter port/i), { target: { value: 'abc' } });
    userEvent.click(screen.getByText('Add Connection'));
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('Port must be a number')).toBeInTheDocument();
    });
  });

  it('submits valid local form and warns for default postgres creds', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter connection name/i), { target: { value: 'main-db' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter host/i), { target: { value: 'localhost' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter port/i), { target: { value: '5432' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), { target: { value: 'postgres' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter password/i), { target: { value: 'secret' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter database name/i), { target: { value: 'testdb' } });

    userEvent.click(screen.getByText('Add Connection'));
    await waitFor(() => {
      expect(require('react-toastify').toast.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Using default PostgreSQL credentials')
      );
      expect(onAddDatabase).toHaveBeenCalledWith(expect.objectContaining({
        name: 'main-db',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'secret',
        database: 'testdb',
        server_type: 'local',
        type: 'PostgreSQL',
        ssl: false,
        connection_string: ''
      }));
    });
  });

  it('submits valid external form', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    // Change radio input for server_type to "external"
    // There are two radio buttons with same accessible name, so pick by value
    const externalRadio = screen.getByDisplayValue('external');
    await userEvent.click(externalRadio);

    fireEvent.change(screen.getByPlaceholderText(/Enter connection name/i), { target: { value: 'cloud-db' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter database name/i), { target: { value: 'cloudtest' } });
    const connStringArea = screen.getByPlaceholderText(/postgres:\/\/username:password@host:port\/database/i);
    fireEvent.change(connStringArea, { target: { value: 'mongodb+srv://user:pass@host/db' } });

    userEvent.click(screen.getByText('Add Connection'));
    await waitFor(() => {
      expect(onAddDatabase).toHaveBeenCalledWith(expect.objectContaining({
        name: 'cloud-db',
        server_type: 'external',
        connection_string: 'mongodb+srv://user:pass@host/db',
        database: 'cloudtest',
      }));
    });
  });

  it('shows error toast if onAddDatabase throws', async () => {
    onAddDatabase.mockRejectedValueOnce(new Error('fail'));
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    fireEvent.change(screen.getByPlaceholderText(/Enter connection name/i), { target: { value: 'hello' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter host/i), { target: { value: '127.0.0.1' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter port/i), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter password/i), { target: { value: 'pass' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter database name/i), { target: { value: 'db' } });
    userEvent.click(screen.getByText('Add Connection'));
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail');
    });
  });

  it('toggles password visibility', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    const passInput = screen.getByPlaceholderText(/Enter password/i);
    expect(passInput).toHaveAttribute('type', 'password');
    const passwordDiv = passInput.closest('div');
    const eyeBtn = passwordDiv.querySelector('button');
    await userEvent.click(eyeBtn);
    // Wait for the type to change
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter password/i)).toHaveAttribute('type', 'text');
    });
    // Toggle back
    await userEvent.click(eyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter password/i)).toHaveAttribute('type', 'password');
    });
  });

  it('handles SSL checkbox for local', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    const sslCheckbox = screen.getByRole('checkbox', { name: /require ssl connection/i });
    expect(sslCheckbox.checked).toBe(false);
    await userEvent.click(sslCheckbox);
    expect(sslCheckbox.checked).toBe(true);
    await userEvent.click(sslCheckbox);
    expect(sslCheckbox.checked).toBe(false);
  });

  it('handles SSL checkbox for external', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    // Switch to external
    const externalRadio = screen.getByDisplayValue('external');
    await userEvent.click(externalRadio);

    const sslCheckbox = screen.getByRole('checkbox', { name: /require ssl connection/i });
    expect(sslCheckbox.checked).toBe(false);
    await userEvent.click(sslCheckbox);
    expect(sslCheckbox.checked).toBe(true);
    await userEvent.click(sslCheckbox);
    expect(sslCheckbox.checked).toBe(false);
  });

  it('switches between database types', async () => {
    render(<AddDatabase onClose={onClose} onAddDatabase={onAddDatabase} />);
    // Should default to PostgreSQL
    expect(screen.getByDisplayValue('PostgreSQL')).toBeChecked();
    // Switch to MySQL
    await userEvent.click(screen.getByDisplayValue('MySQL'));
    expect(screen.getByDisplayValue('MySQL')).toBeChecked();
    // Switch to MongoDB
    await userEvent.click(screen.getByDisplayValue('MongoDB'));
    expect(screen.getByDisplayValue('MongoDB')).toBeChecked();
    // Switch back to PostgreSQL
    await userEvent.click(screen.getByDisplayValue('PostgreSQL'));
    expect(screen.getByDisplayValue('PostgreSQL')).toBeChecked();
  });
});