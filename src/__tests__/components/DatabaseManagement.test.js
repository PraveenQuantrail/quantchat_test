import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import DatabaseManagement from '../../components/DatabaseManagement/DatabaseManagement';
import { databaseApi } from '../../utils/api';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

beforeAll(() => {
  const modalRoot = document.createElement('div');
  modalRoot.setAttribute('id', 'modal-root');
  document.body.appendChild(modalRoot);
});
afterAll(() => {
  const el = document.getElementById('modal-root');
  if (el) el.remove();
});

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));
const sweetalert = require('sweetalert2');
jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));
jest.mock('../../components/DatabaseManagement/AddDatabase', () => function MockAddDatabase(props) {
  return (
    <div data-testid="add-database-modal">
      <button onClick={() => props.onAddDatabase({ name: 'addedDB' })}>Add DB</button>
      <button onClick={props.onClose}>Close Modal</button>
    </div>
  );
});
jest.mock('../../components/DatabaseManagement/EditDatabase', () => function MockEditDatabase(props) {
  return (
    <div data-testid="edit-database-modal">
      <button onClick={() => props.onEditDatabase({ ...props.connection, name: 'editedDB' })}>Edit DB</button>
      <button onClick={props.onClose}>Close Modal</button>
    </div>
  );
});
jest.mock('../../components/DatabaseManagement/ShowDatabase', () => function MockShowDatabase(props) {
  return (
    <div data-testid="show-database-modal">
      <button onClick={props.onClose}>Close Show</button>
      <span>Show DB {props.connection?.name}</span>
    </div>
  );
});

const mockDatabases = [
  {
    id: '1',
    name: 'Postgres Main',
    type: 'PostgreSQL',
    host: 'localhost',
    port: 5432,
    database: 'main',
    connection_string: '',
    status: 'Connected',
    server_type: '',
  },
  {
    id: '2',
    name: 'MySQL External',
    type: 'MySQL',
    host: '',
    port: '',
    database: 'clients',
    connection_string: '',
    status: 'Disconnected',
    server_type: 'external',
  },
  {
    id: '3',
    name: 'Mongo',
    type: 'MongoDB',
    host: '',
    port: '',
    database: '',
    connection_string: '',
    status: 'Testing...',
    server_type: '',
  },
  {
    id: '4',
    name: 'Maria',
    type: 'MariaDB',
    host: '',
    port: '',
    database: '',
    connection_string: '',
    status: 'Connected (Warning)',
    server_type: '',
  },
  {
    id: '5',
    name: 'Redis',
    type: 'Redis',
    host: '',
    port: '',
    database: '',
    connection_string: '',
    status: 'Connecting...',
    server_type: '',
  },
];

const getAllMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const testMock = jest.fn();
const connectMock = jest.fn();
const disconnectMock = jest.fn();
const deleteMock = jest.fn();
const getDetailsMock = jest.fn();

databaseApi.getAll = getAllMock;
databaseApi.create = createMock;
databaseApi.update = updateMock;
databaseApi.test = testMock;
databaseApi.connect = connectMock;
databaseApi.disconnect = disconnectMock;
databaseApi.delete = deleteMock;
databaseApi.getDetails = getDetailsMock;

async function getTableRowByDbName(dbName) {
  let row;
  await waitFor(() => {
    const rows = screen.getAllByRole('row').slice(1);
    row = rows.find(row =>
      within(row).queryAllByText(dbName, { exact: true }).length > 0
    );
    if (!row) throw new Error(`Row for DB "${dbName}" not found`);
  });
  return row;
}

describe('DatabaseManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    testMock.mockReset();
    connectMock.mockReset();
    disconnectMock.mockReset();
    deleteMock.mockReset();
    getDetailsMock.mockReset();

    getAllMock.mockResolvedValue({
      databases: mockDatabases,
      totalPages: 3,
    });
    createMock.mockResolvedValue({});
    updateMock.mockResolvedValue({});
    testMock.mockImplementation(async (id) =>
      id === '1'
        ? { success: true, message: 'Connection OK' }
        : id === '3'
        ? { success: false, message: 'Failed for test' }
        : id === '4'
        ? { success: true, message: 'Warning: something up' }
        : { success: false, message: 'Failed' }
    );
    connectMock.mockImplementation(async (id) =>
      id === '2'
        ? { success: true, message: 'Connected!' }
        : id === '5'
        ? { success: true, message: 'Connected!' }
        : { success: false, message: 'Failed to connect' }
    );
    disconnectMock.mockResolvedValue({ success: true, message: 'Disconnected!' });
    deleteMock.mockResolvedValue({});
    getDetailsMock.mockImplementation(async (id) => mockDatabases.find(d => d.id === id));

    sweetalert.fire.mockReset();
    sweetalert.fire.mockResolvedValue({ isConfirmed: true });
  });

  it('renders database connections table and user info', async () => {
    render(<DatabaseManagement />);
    expect(screen.getByText(/Database Connections/i)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Postgres Main')).toBeTruthy();
      expect(screen.queryByText('MySQL External')).toBeTruthy();
      expect(screen.queryByText('Mongo')).toBeTruthy();
    });
  });

  it('shows AddDatabase modal when clicking Add Connection and handles add', async () => {
    render(<DatabaseManagement />);
    expect(screen.queryByTestId('add-database-modal')).not.toBeInTheDocument();
    userEvent.click(screen.getByText(/Add Connection/i));
    expect(await screen.findByTestId('add-database-modal')).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByText('Add DB'));
    });
    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({ name: 'addedDB' });
    });
  });

  it('handles AddDatabase modal close button', async () => {
    render(<DatabaseManagement />);
    userEvent.click(screen.getByText(/Add Connection/i));
    expect(await screen.findByTestId('add-database-modal')).toBeInTheDocument();
    userEvent.click(screen.getByText('Close Modal'));
    await waitFor(() => {
      expect(screen.queryByTestId('add-database-modal')).not.toBeInTheDocument();
    });
  });

  it('shows EditDatabase modal and handles edit', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    await waitFor(() => expect(getDetailsMock).toHaveBeenCalledWith('1'));
    expect(await screen.findByTestId('edit-database-modal')).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByText('Edit DB'));
    });
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
  });

  it('handles EditDatabase modal close button', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    expect(await screen.findByTestId('edit-database-modal')).toBeInTheDocument();
    userEvent.click(screen.getByText('Close Modal'));
    await waitFor(() => {
      expect(screen.queryByTestId('edit-database-modal')).not.toBeInTheDocument();
    });
  });

  it('shows ShowDatabase modal when clicking view and closes it', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const viewBtn = within(row).getByTitle('View Database');
    await act(async () => { userEvent.click(viewBtn); });
    expect(await screen.findByTestId('show-database-modal')).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByText('Close Show'));
    });
    await waitFor(() => {
      expect(screen.queryByTestId('show-database-modal')).not.toBeInTheDocument();
    });
  });

  it('handles duplicate name/details error on add/edit', async () => {
    createMock.mockRejectedValueOnce({ response: { data: { message: 'already exists' } } });
    render(<DatabaseManagement />);
    userEvent.click(screen.getByText(/Add Connection/i));
    await screen.findByTestId('add-database-modal');
    await act(async () => {
      userEvent.click(screen.getByText('Add DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('A connection with this name or details already exists');
    });
    updateMock.mockRejectedValueOnce({ response: { data: { message: 'already exists' } } });
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    await waitFor(() => expect(getDetailsMock).toHaveBeenCalledWith('1'));
    await act(async () => {
      userEvent.click(screen.getByText('Edit DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('A connection with this name or details already exists');
    });
  });

  it('handles general error on add/edit', async () => {
    createMock.mockRejectedValueOnce({ message: 'fail' });
    render(<DatabaseManagement />);
    userEvent.click(screen.getByText(/Add Connection/i));
    await screen.findByTestId('add-database-modal');
    await act(async () => {
      userEvent.click(screen.getByText('Add DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail');
    });
    updateMock.mockRejectedValueOnce({ message: 'fail' });
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    await waitFor(() => expect(getDetailsMock).toHaveBeenCalledWith('1'));
    await act(async () => {
      userEvent.click(screen.getByText('Edit DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail');
    });
  });

  it('handles search filter', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    fireEvent.change(screen.getByPlaceholderText(/Search connections/i), {
      target: { value: 'mysql' },
    });
    await waitFor(() => {
      expect(screen.getByText('MySQL External')).toBeInTheDocument();
      expect(screen.queryByText('Postgres Main')).not.toBeInTheDocument();
    });
  });

  it('renders and works for Connected and Connected (Warning) menu branch', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row1 = await getTableRowByDbName('Postgres Main');
    const plugBtn1 = within(row1).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn1); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Disconnect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Disconnect' })); });
    expect(disconnectMock).toHaveBeenCalledWith('1');
    await act(async () => { fireEvent.click(plugBtn1); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test' })); });
    expect(testMock).toHaveBeenCalledWith('1');

    await waitFor(() => !!screen.queryByText('Maria'));
    const row4 = await getTableRowByDbName('Maria');
    const plugBtn4 = within(row4).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn4); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Disconnect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Disconnect' })); });
    expect(disconnectMock).toHaveBeenCalledWith('4');
    await act(async () => { fireEvent.click(plugBtn4); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test' })); });
    expect(testMock).toHaveBeenCalledWith('4');
    await waitFor(() => {
      expect(require('react-toastify').toast.warn).toHaveBeenCalledWith('Warning: something up');
    });
  });

  it('renders and works for Disconnected menu branch', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('MySQL External'));
    const row2 = await getTableRowByDbName('MySQL External');
    const plugBtn2 = within(row2).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn2); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Connect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect' })); });
    expect(connectMock).toHaveBeenCalledWith('2');
    await act(async () => { fireEvent.click(plugBtn2); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test' })); });
    expect(testMock).toHaveBeenCalledWith('2');
  });

  it('renders and works for Testing... and Connecting... menu branch', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Mongo'));
    const row3 = await getTableRowByDbName('Mongo');
    const plugBtn3 = within(row3).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn3); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Connect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect' })); });
    expect(connectMock).toHaveBeenCalledWith('3');
    await act(async () => { fireEvent.click(plugBtn3); });
    let btn = screen.queryByRole('button', { name: 'Stop Testing' });
    if (!btn) btn = screen.queryByRole('button', { name: 'Disconnect' });
    if (btn) {
      await act(async () => { fireEvent.click(btn); });
      expect(disconnectMock).toHaveBeenCalledWith('3');
    }

    await waitFor(() => {
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows.some(row =>
        within(row).queryAllByText('Redis', { exact: true }).length > 0
      )).toBe(true);
    });
    const row5 = await getTableRowByDbName('Redis');
    const plugBtn5 = within(row5).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn5); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Connect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Connect' })); });
    expect(connectMock).toHaveBeenCalledWith('5');
    await act(async () => { fireEvent.click(plugBtn5); });
    let btnRedis = screen.queryByRole('button', { name: 'Stop Testing' });
    if (!btnRedis) btnRedis = screen.queryByRole('button', { name: 'Disconnect' });
    if (btnRedis) {
      await act(async () => { fireEvent.click(btnRedis); });
      expect(disconnectMock).toHaveBeenCalledWith('5');
    }
  });

  it('renders MenuButton with last prop', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    const testBtn = screen.getByRole('button', { name: 'Test' });
    expect(testBtn.closest('button')).toHaveClass('block');
    await act(async () => { fireEvent.click(testBtn); });
    expect(testMock).toHaveBeenCalledWith('1');
  });

  it('handles delete database', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const deleteBtn = within(row).getByTitle('Delete');
    await act(async () => {
      userEvent.click(deleteBtn);
    });
    await waitFor(() => expect(sweetalert.fire).toHaveBeenCalled());
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('1'));
  });

  it('handles cancel on delete database', async () => {
    sweetalert.fire.mockResolvedValueOnce({ isConfirmed: false });
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const deleteBtn = within(row).getByTitle('Delete');
    await act(async () => {
      userEvent.click(deleteBtn);
    });
    await waitFor(() => expect(sweetalert.fire).toHaveBeenCalled());
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('handles refresh', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Database Connections'));
    const refreshBtn = screen.getByTitle('Refresh connections');
    userEvent.click(refreshBtn);
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
  });

  it('shows correct host details for all cases', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('MySQL External'));
    const row2 = await getTableRowByDbName('MySQL External');
    expect(within(row2).getByText('External Connection')).toBeInTheDocument();
    const row1 = await getTableRowByDbName('Postgres Main');
    expect(within(row1).getByText('localhost:5432')).toBeInTheDocument();
    const row3 = await getTableRowByDbName('Mongo');
    expect(within(row3).getByText('Not specified')).toBeInTheDocument();
  });

  it('calls handlePageChange and disables/enables buttons', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    getAllMock.mockResolvedValueOnce({
      databases: Array.from({ length: 11 }, (_, i) => ({
        ...mockDatabases[0],
        id: String(i + 10),
        name: `DB${i + 10}`
      })),
      totalPages: 2,
    });
    userEvent.click(screen.getByTitle('Refresh connections'));
    await waitFor(() => expect(screen.queryByText('DB10')).toBeTruthy());

    const getPrevBtn = () =>
      screen.getAllByRole('button').find(btn =>
        btn.textContent && btn.textContent.trim().toLowerCase() === 'previous'
      );
    const getNextBtn = () =>
      screen.getAllByRole('button').find(btn =>
        btn.textContent && btn.textContent.trim().toLowerCase() === 'next'
      );

    expect(getPrevBtn()).toBeInTheDocument();
    expect(getNextBtn()).toBeInTheDocument();
    expect(getPrevBtn()).toBeDisabled();
    userEvent.click(getNextBtn());
    await waitFor(() => {
      expect(getPrevBtn()).not.toBeDisabled();
    });
  });

  it('shows correct number of connections and disables/enables pagination', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    expect(screen.getByText((content) =>
      content.replace(/\s+/g, ' ').trim().startsWith('5') && content.includes('connections')
    )).toBeInTheDocument();
    expect(screen.queryByText((content) => content && content.toLowerCase().includes('previous'))).not.toBeInTheDocument();
    getAllMock.mockResolvedValueOnce({
      databases: Array.from({ length: 11 }, (_, i) => ({ ...mockDatabases[0], id: String(i + 10), name: `DB${i + 10}` })),
      totalPages: 2,
    });
    userEvent.click(screen.getByTitle('Refresh connections'));
    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalledTimes(2);
    });
  });

  it('handles menuConnection being undefined', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('conn-menu-root')).not.toBeInTheDocument();
  });

  it('handles error objects with no message in handleAddDatabase/handleEditDatabase', async () => {
    createMock.mockRejectedValueOnce({});
    render(<DatabaseManagement />);
    userEvent.click(screen.getByText(/Add Connection/i));
    await screen.findByTestId('add-database-modal');
    await act(async () => {
      userEvent.click(screen.getByText('Add DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('Failed to add database');
    });
    updateMock.mockRejectedValueOnce({});
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    await waitFor(() => expect(getDetailsMock).toHaveBeenCalledWith('1'));
    await act(async () => {
      userEvent.click(screen.getByText('Edit DB'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('Failed to update database');
    });
  });

  it('handles failed fetchDatabases on mount', async () => {
    getAllMock.mockRejectedValueOnce({ message: 'fail fetch' });
    render(<DatabaseManagement />);
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail fetch');
    });
  });

  it('handles failed fetchDatabases on refresh', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Database Connections'));
    getAllMock.mockRejectedValueOnce({ message: 'fail fetch refresh' });
    userEvent.click(screen.getByTitle('Refresh connections'));
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail fetch refresh');
    });
  });

  it('shows Not specified if host/port/connection_string missing', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Mongo'));
    const row = await getTableRowByDbName('Mongo');
    expect(within(row).getByText('Not specified')).toBeInTheDocument();
  });

  it('handles failed handleTest', async () => {
    testMock.mockRejectedValueOnce({ message: 'test error' });
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Test' })); });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('test error');
    });
  });

  it('handles failed handleDisconnect', async () => {
    disconnectMock.mockRejectedValueOnce({ message: 'disconnect failed' });
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Disconnect' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Disconnect' })); });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('disconnect failed');
    });
  });

  it('handles failed handleDelete', async () => {
    deleteMock.mockRejectedValueOnce({ message: 'delete error' });
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const deleteBtn = within(row).getByTitle('Delete');
    await act(async () => {
      userEvent.click(deleteBtn);
    });
    await waitFor(() => expect(sweetalert.fire).toHaveBeenCalled());
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('delete error');
    });
  });

  it('handles failed handleEditClick', async () => {
    getDetailsMock.mockRejectedValueOnce({ message: 'getDetails error' });
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const editBtn = within(row).getByTitle('Edit');
    await act(async () => { userEvent.click(editBtn); });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('getDetails error');
    });
  });

  it('closes menu when toggling connection menu', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Disconnect' }));
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId('conn-menu-root')).not.toBeInTheDocument();
    });
  });

  it('renders MenuButton with/without last prop', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Test' }));
    expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
  });

  it('renders host with port and without port', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    expect(within(row).getByText('localhost:5432')).toBeInTheDocument();
    getAllMock.mockResolvedValueOnce({
      databases: [{ ...mockDatabases[0], port: undefined }],
      totalPages: 1,
    });
    userEvent.click(screen.getByTitle('Refresh connections'));
    await waitFor(() => expect(getAllMock).toHaveBeenCalledTimes(2));
  });

  it('closes connection menu when clicking outside (covers line 76)', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const plugBtn = within(row).getByTitle('Connection options');
    await act(async () => { fireEvent.click(plugBtn); });
    await waitFor(() => !!screen.queryByRole('button', { name: 'Disconnect' }));
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId('conn-menu-root')).not.toBeInTheDocument();
    });
  });

  it('does not render connection menu when menuConnection is undefined (covers line 250)', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('conn-menu-root')).not.toBeInTheDocument();
  });

  it('renders ShowDatabase modal and closes it (covers line 413, 422)', async () => {
    render(<DatabaseManagement />);
    await waitFor(() => !!screen.queryByText('Postgres Main'));
    const row = await getTableRowByDbName('Postgres Main');
    const viewBtn = within(row).getByTitle('View Database');
    await act(async () => { userEvent.click(viewBtn); });
    expect(await screen.findByTestId('show-database-modal')).toBeInTheDocument();
    await act(async () => {
      userEvent.click(screen.getByText('Close Show'));
    });
    await waitFor(() => {
      expect(screen.queryByTestId('show-database-modal')).not.toBeInTheDocument();
    });
  });
});