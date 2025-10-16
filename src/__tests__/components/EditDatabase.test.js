import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import EditDatabase from '../../components/DatabaseManagement/EditDatabase';

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('EditDatabase', () => {
  const connection = {
    id: '1',
    name: 'TestDB',
    server_type: 'local',
    type: 'PostgreSQL',
    host: 'localhost',
    port: '5432',
    username: 'postgres',
    database: 'mydb',
    connection_string: '',
    ssl: true,
  };

  let onClose;
  let onEditDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    onEditDatabase = jest.fn().mockResolvedValue();
  });

  it('renders form with prefilled values and closes on close/cancel/Escape', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    expect(screen.getByDisplayValue('TestDB')).toBeInTheDocument();
    expect(screen.getByDisplayValue('localhost')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5432')).toBeInTheDocument();
    expect(screen.getByDisplayValue('postgres')).toBeInTheDocument();
    expect(screen.getByDisplayValue('mydb')).toBeInTheDocument();
    expect(screen.getByLabelText(/Require SSL connection/i)).toBeChecked();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // Cancel button (possibly multiple, use the first)
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    await userEvent.click(screen.getAllByText(/Cancel/i)[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // Escape key
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows validation errors for missing fields', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    fireEvent.change(screen.getByDisplayValue('TestDB'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('localhost'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('5432'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('postgres'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('mydb'), { target: { value: '' } });
    await userEvent.click(screen.getByText('Update Connection'));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Host is required')).toBeInTheDocument();
      expect(screen.getByText('Port is required')).toBeInTheDocument();
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Database name is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for short name and port number', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    fireEvent.change(screen.getByDisplayValue('TestDB'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByDisplayValue('5432'), { target: { value: 'abc' } });
    await userEvent.click(screen.getByText('Update Connection'));
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('Port must be a number')).toBeInTheDocument();
    });
  });

  it('submits valid local form and warns for default postgres creds', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    await userEvent.click(screen.getByText('Update Connection'));
    await waitFor(() => {
      expect(require('react-toastify').toast.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Using default PostgreSQL credentials')
      );
      expect(onEditDatabase).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        name: 'TestDB',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        database: 'mydb',
      }));
    });
  });

  it('submits valid external form', async () => {
    const extConn = {
      ...connection,
      server_type: 'external',
      connection_string: 'mongodb+srv://user:pass@host/db',
      host: '',
      port: '',
      username: '',
      password: '',
    };
    render(<EditDatabase connection={extConn} onClose={onClose} onEditDatabase={onEditDatabase} />);
    const connStringArea = screen.getByPlaceholderText(/postgres:\/\/username:password@host:port\/database/i);
    fireEvent.change(connStringArea, { target: { value: 'mongodb+srv://user:pass@host/db' } });
    await userEvent.click(screen.getByText('Update Connection'));
    await waitFor(() => {
      expect(onEditDatabase).toHaveBeenCalledWith(expect.objectContaining({
        connection_string: 'mongodb+srv://user:pass@host/db',
        server_type: 'external',
      }));
    });
  });

  it('shows error toast if onEditDatabase throws', async () => {
    onEditDatabase.mockRejectedValueOnce(new Error('fail'));
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    await userEvent.click(screen.getByText('Update Connection'));
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail');
    });
  });

  it('toggles password visibility', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    const passInput = screen.getByPlaceholderText(/Enter new password/i);
    expect(passInput).toHaveAttribute('type', 'password');
    const passwordDiv = passInput.closest('div');
    const eyeBtn = passwordDiv.querySelector('button');
    await userEvent.click(eyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter new password/i)).toHaveAttribute('type', 'text');
    });
    // Toggle back
    await userEvent.click(eyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter new password/i)).toHaveAttribute('type', 'password');
    });
  });

  it('handles SSL checkbox', async () => {
    render(<EditDatabase connection={connection} onClose={onClose} onEditDatabase={onEditDatabase} />);
    const sslCheckbox = screen.getByLabelText(/Require SSL connection/i);
    expect(sslCheckbox.checked).toBe(true);
    await userEvent.click(sslCheckbox);
    await waitFor(() => expect(sslCheckbox.checked).toBe(false));
    await userEvent.click(sslCheckbox);
    await waitFor(() => expect(sslCheckbox.checked).toBe(true));
  });
});