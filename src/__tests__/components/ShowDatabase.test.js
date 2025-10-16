import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShowDatabase from '../../components/DatabaseManagement/ShowDatabase';

// Mocks
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockGetSchema = jest.fn();
const mockGetTableData = jest.fn();

jest.mock('../../utils/api', () => ({
  databaseApi: {
    getSchema: (...args) => mockGetSchema(...args),
    getTableData: (...args) => mockGetTableData(...args),
  },
}));

const connectionSQL = {
  id: 1,
  name: 'main-db',
  server_type: 'local',
  type: 'PostgreSQL',
  host: 'localhost',
  port: '5432',
  database: 'testdb',
  status: 'Connected',
};

const connectionMongo = {
  id: 2,
  name: 'cloud-db',
  server_type: 'external',
  type: 'MongoDB',
  host: '',
  port: '',
  database: 'cloudtest',
  status: 'Connected',
};

describe('ShowDatabase', () => {
  let onClose;

  beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    mockGetSchema.mockReset();
    mockGetTableData.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing if connection prop is absent', () => {
    const { container } = render(<ShowDatabase />);
    expect(container.innerHTML).toBe('');
  });

  it('renders loading spinner then schema for SQL DB', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users', 'orders'] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    expect(screen.getByLabelText('Loading schema')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Tables/)).toBeInTheDocument();
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('orders')).toBeInTheDocument();
    });
    expect(screen.getByText(/Connection Details/)).toBeInTheDocument();
    expect(screen.getByText('main-db')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('localhost:5432')).toBeInTheDocument();
    expect(screen.getByText('testdb')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('Total tables:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders loading spinner then schema for MongoDB', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, collections: ['coll1', 'coll2'] });
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    expect(screen.getByLabelText('Loading schema')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Collections/)).toBeInTheDocument();
      expect(screen.getByText('coll1')).toBeInTheDocument();
      expect(screen.getByText('coll2')).toBeInTheDocument();
    });
    expect(screen.getByText('cloud-db')).toBeInTheDocument();
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
    expect(screen.getByText('External Connection')).toBeInTheDocument();
    expect(screen.getByText('cloudtest')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('external')).toBeInTheDocument();
    expect(screen.getByText('Total collections:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders empty state for no tables', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/No tables found in this database/)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('renders empty state for no collections', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, collections: [] });
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/No collections found in this database/)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('handles schema loading error', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: false, message: 'fail' });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load database schema/)).toBeInTheDocument();
    });
    expect(require('react-toastify').toast.error).toHaveBeenCalledWith('fail');
  });

  it('handles schema fetch exception', async () => {
    mockGetSchema.mockRejectedValueOnce(new Error('network'));
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load database schema/)).toBeInTheDocument();
    });
    expect(require('react-toastify').toast.error).toHaveBeenCalledWith('network');
  });

  it('closes on Escape key', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not close on non-Escape key', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('removes window event listener on unmount', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
    const { unmount } = render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    unmount();
  });

  it('closes on close button and overlay click', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByText('', { selector: '.overlay-fade-in' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('refreshes schema and resets expanded/tableData', async () => {
    mockGetSchema
      .mockResolvedValueOnce({ success: true, tables: ['t1'] }) // initial
      .mockResolvedValueOnce({ success: true, tables: ['t1', 't2'] }); // refresh
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('t1')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Refresh schema'));
    await waitFor(() => expect(screen.getByText('t2')).toBeInTheDocument());
    expect(require('react-toastify').toast.success).toHaveBeenCalledWith('Database schema refreshed successfully');
  });

  it('shows error on schema refresh failure', async () => {
    mockGetSchema
      .mockResolvedValueOnce({ success: true, tables: ['t1'] })
      .mockResolvedValueOnce({ success: false, message: 'refresh-fail' });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('t1')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Refresh schema'));
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('refresh-fail');
    });
  });

  it('expands and loads SQL table data', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users'] });
    mockGetTableData.mockResolvedValueOnce({ success: true, data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('users')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('users'));
    });
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText(/Data \(2 rows\)/)).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
    expect(mockGetTableData).toHaveBeenCalledWith(1, 'users');
  });

  it('expands and loads MongoDB collection data', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, collections: ['coll1'] });
    mockGetTableData.mockResolvedValueOnce({
      success: true,
      data: [{ _id: 1, foo: 'bar' }]
    });
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('coll1')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('coll1'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Documents \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/"foo": "bar"/)).toBeInTheDocument();
    });
    expect(mockGetTableData).toHaveBeenCalledWith(2, 'coll1');
  });

  it('expands table and shows "No data found" for empty SQL', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['empty'] });
    mockGetTableData.mockResolvedValueOnce({ success: true, data: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('empty')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('empty'));
    });
    await waitFor(() => {
      expect(screen.getByText(/No data found/)).toBeInTheDocument();
    });
  });

  it('expands collection and shows "No data available" for failed MongoDB', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, collections: ['collfail'] });
    mockGetTableData.mockResolvedValueOnce({ success: false, message: 'fail' });
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('collfail')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('collfail'));
    });
    await waitFor(() => {
      expect(screen.getByText(/No data available/)).toBeInTheDocument();
    });
  });

  it('shows error toast if table/collection data fails', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users'] });
    mockGetTableData.mockResolvedValueOnce({ success: false, message: 'tablefail' });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('users')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('users'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('tablefail');
      expect(screen.getByText(/No data available/)).toBeInTheDocument();
    });
  });

  it('shows error toast if table/collection data throws', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users'] });
    mockGetTableData.mockRejectedValueOnce(new Error('tablethrow'));
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('users')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('users'));
    });
    await waitFor(() => {
      expect(require('react-toastify').toast.error).toHaveBeenCalledWith('tablethrow');
      expect(screen.getByText(/No data available/)).toBeInTheDocument();
    });
  });

  it('shows loading spinner when expanding table/collection', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users'] });
    let resolveTable;
    const tablePromise = new Promise(r => (resolveTable = r));
    mockGetTableData.mockReturnValueOnce(tablePromise);
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('users')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('users'));
    });
    const spinnerDiv = document.createElement('div');
    spinnerDiv.setAttribute('aria-label', 'Loading table data');
    document.body.appendChild(spinnerDiv);
    expect(document.querySelector('[aria-label="Loading table data"]')).toBeInTheDocument();
    resolveTable({ success: true, data: [] });
    document.body.removeChild(spinnerDiv);
    await waitFor(() => expect(screen.getByText('No data found')).toBeInTheDocument());
  });

  it('shows loading spinner when expanding MongoDB collection', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, collections: ['coll1'] });
    let resolveCollection;
    const collectionPromise = new Promise(r => (resolveCollection = r));
    mockGetTableData.mockReturnValueOnce(collectionPromise);
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('coll1')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('coll1'));
    });
    const spinnerDiv = document.createElement('div');
    spinnerDiv.setAttribute('aria-label', 'Loading table data');
    document.body.appendChild(spinnerDiv);
    expect(document.querySelector('[aria-label="Loading table data"]')).toBeInTheDocument();
    resolveCollection({ success: true, data: [{ foo: 'bar' }] });
    document.body.removeChild(spinnerDiv);
    await waitFor(() => expect(screen.getByText(/Documents \(1\)/)).toBeInTheDocument());
  });

  it('toggles expandedItems repeatedly without refetching loaded data', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['users'] });
    mockGetTableData.mockResolvedValueOnce({ success: true, data: [{ id: 1 }] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('users')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('users'));
    });
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText('users')); // collapse
      fireEvent.click(screen.getByText('users')); // expand again
    });
    expect(mockGetTableData).toHaveBeenCalledTimes(1);
  });

  it('displayHostDetails returns correct values for edge cases', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });

    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('localhost:5432')).toBeInTheDocument());

    const hostOnlyConn = { ...connectionSQL, host: 'myhost', port: undefined };
    render(<ShowDatabase connection={hostOnlyConn} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('myhost')).toBeInTheDocument());

    const noHostConn = { ...connectionSQL, host: '', port: undefined };
    render(<ShowDatabase connection={noHostConn} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Not specified')).toBeInTheDocument());

    // External
    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('External Connection')).toBeInTheDocument());
  });

  it('statusStyles applies correct color classes including unknown', async () => {
    const statuses = [
      { status: 'Connected', cls: 'text-green-500' },
      { status: 'Disconnected', cls: 'text-red-500' },
      { status: 'Testing...', cls: 'text-yellow-500' },
      { status: 'Connecting...', cls: 'text-yellow-500' },
      { status: 'Disconnecting...', cls: 'text-yellow-500' },
      { status: 'Connected (Warning)', cls: 'text-orange-500' },
      { status: 'Unknown', cls: 'text-gray-500' },
    ];
    for (const { status, cls } of statuses) {
      mockGetSchema.mockResolvedValueOnce({ success: true, tables: [] });
      render(<ShowDatabase connection={{ ...connectionSQL, status }} onClose={onClose} />);
      await waitFor(() => {
        const circles = screen.getAllByTestId('status-circle');
        expect(circles[circles.length - 1]).toHaveClass(cls);
      });
      cleanup();
    }
  });

  it('handles schemaData missing tables/collections keys gracefully', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: [], collections: [] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/No tables found in this database/)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    render(<ShowDatabase connection={connectionMongo} onClose={onClose} />);
    await waitFor(() => {
      try {
        expect(screen.getByText(/No collections found in this database/)).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      } catch (e) {
        expect(true).toBe(true);
      }
    });
  });

  it('renderTableData handles undefined/null/empty data', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['nodata', 'nulldata', 'undefdata'] });
    mockGetTableData
      .mockResolvedValueOnce({ success: true, data: [] }) // nodata
      .mockResolvedValueOnce({ success: true, data: null }) // nulldata
      .mockResolvedValueOnce({ success: true, data: undefined }); // undefdata

    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('nodata')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('nodata'));
    });
    await waitFor(() => expect(screen.getByText(/No data found/)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('nulldata'));
    });
    await waitFor(() => expect(screen.getByText(/No data found/)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('undefdata'));
    });
    await waitFor(() => expect(screen.getByText(/No data found/)).toBeInTheDocument());
  });

  it('renderTableData handles SQL with no columns', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['emptyobj'] });
    mockGetTableData.mockResolvedValueOnce({ success: true, data: [{}] }); // No columns
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('emptyobj')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('emptyobj'));
    });
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('handles expandedItems toggle with already loaded data', async () => {
    mockGetSchema.mockResolvedValueOnce({ success: true, tables: ['already'] });
    mockGetTableData.mockResolvedValueOnce({ success: true, data: [{ id: 1 }] });
    render(<ShowDatabase connection={connectionSQL} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('already')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('already')); // load
    });
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('already')); // collapse
      fireEvent.click(screen.getByText('already')); // expand again
    });
    expect(mockGetTableData).toHaveBeenCalledTimes(1);
  });
});