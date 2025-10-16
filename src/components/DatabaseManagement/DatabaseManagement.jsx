import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSync, FaPlug, FaSearch, FaCircle } from 'react-icons/fa';
import { FiDatabase, FiUser, FiEye } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import AddDatabase from './AddDatabase';
import EditDatabase from './EditDatabase';
import ShowDatabase from './ShowDatabase';
import { connectDBPinggy, databaseApi } from '../../utils/api';

const statusStyles = {
  'Connected': 'text-green-500',
  'Disconnected': 'text-red-500',
  'Testing...': 'text-yellow-500',
  'Connecting...': 'text-yellow-500',
  'Disconnecting...': 'text-yellow-500',
  'Connected (Warning)': 'text-orange-500',
};


const fastapiSessionID = process.env.REACT_APP_SESSIONID_KEY;

export default function DatabaseManagement() {
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser] = useState({ role: 'admin' });
  const [showAddDatabaseModal, setShowAddDatabaseModal] = useState(false);
  const [showEditDatabaseModal, setShowEditDatabaseModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const connectionsPerPage = 10;

  const plugRefs = useRef({});

  const fetchDatabases = useCallback(async () => {
    try {
      const { databases, totalPages } = await databaseApi.getAll({
        page: currentPage,
        limit: connectionsPerPage,
      });
      setConnections(databases);
      setTotalPages(totalPages);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch databases');
    }
  }, [currentPage]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const filtered = connections.filter((conn) =>
    `${conn.name} ${conn.host || conn.connection_string || ''}:${conn.port || ''} ${conn.database} ${conn.type}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const displayHostDetails = (connection) => {
    if (connection.server_type === 'external') {
      return 'External Connection';
    }
    return connection.host
      ? `${connection.host}${connection.port ? `:${connection.port}` : ''}`
      : 'Not specified';
  };

  const handleAddDatabase = async (newDatabase) => {
    try {
      await databaseApi.create(newDatabase);
      toast.success('Database added successfully!');
      setShowAddDatabaseModal(false);
      fetchDatabases();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add database';
      if (errorMessage.includes('already exists')) {
        toast.error('A connection with this name or details already exists');
      } else if (errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEditDatabase = async (updatedDatabase) => {
    try {
      await databaseApi.update(updatedDatabase.id, updatedDatabase);
      toast.success('Database updated successfully!');
      setShowEditDatabaseModal(false);
      fetchDatabases();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update database';
      if (errorMessage.includes('already exists')) {
        toast.error('A connection with this name or details already exists');
      } else if (errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleTest = async (id) => {
    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Testing...' } : conn
      ));

      const result = await databaseApi.test(id);

      if (result.success) {
        if (result.message.includes('Warning:')) {
          toast.warn(result.message);
        } else {
          toast.success(result.message);
        }
        await fetchDatabases();
      } else {
        toast.error(result.message);
        setConnections(prev => prev.map(conn =>
          conn.id === id ? { ...conn, status: 'Disconnected' } : conn
        ));
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to test database';
      if (errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnected' } : conn
      ));
    }
    setShowConnectionMenu(null);
  };

  const handleConnect = async (id) => {
    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Connecting...' } : conn
      ));

      const result = await databaseApi.connect(id);

      if (result.success) {
        if (result.message.includes('Warning:')) {
          toast.warn(result.message);
        } else {
          const connectFastAPI = await connectDBPinggy(result.dbdetails);
          
          if (connectFastAPI.success) {
            const fastAPISessions = JSON.parse(localStorage.getItem(fastapiSessionID)) || [];
            if (fastAPISessions.length > 0) {
              const findID = fastAPISessions.filter((val) => val.dbid === connectFastAPI.dbID);
              
              if (findID.length > 0) {
                localStorage.setItem(fastapiSessionID, JSON.stringify(fastAPISessions.map((val) => {
                  if (val.dbid === connectFastAPI.dbID) {
                    return { ...val, token: connectFastAPI.sessionID,expires_at:connectFastAPI.expires_at }
                  }
                  return val
                })))
              } else {
                localStorage.setItem(fastapiSessionID, JSON.stringify([...fastAPISessions, { dbid: connectFastAPI.dbID, token: connectFastAPI.sessionID,expires_at:connectFastAPI.expires_at }]))
              }
            } else {
              localStorage.setItem(fastapiSessionID, JSON.stringify([{ dbid: connectFastAPI.dbID, token: connectFastAPI.sessionID,expires_at:connectFastAPI.expires_at }]));
            }
            toast.success(connectFastAPI.message)
          } else {
            toast.error(connectFastAPI.message);
          }
          toast.success(result.message);

        }
        await fetchDatabases();


      } else {
        toast.error(result.message);
        setConnections(prev => prev.map(conn =>
          conn.id === id ? { ...conn, status: 'Disconnected' } : conn
        ));
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to connect to database';
      if (errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnected' } : conn
      ));
    }
    setShowConnectionMenu(null);
  };

  const handleDisconnect = async (id) => {
    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnecting...' } : conn
      ));

      const result = await databaseApi.disconnect(id);

      if (result.success) {
        toast.success(result.message);
        await fetchDatabases();
      } else {
        toast.error(result.message);
        await fetchDatabases();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to disconnect from database');
      await fetchDatabases();
    }
    setShowConnectionMenu(null);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await databaseApi.delete(id);
        setConnections(prev => prev.filter(conn => conn.id !== id));
        toast.success('Database connection deleted successfully!');
      } catch (error) {
        toast.error(error.message || 'Failed to delete database connection');
      }
    }
  };

  const handleRefresh = () => {
    setRefreshAnimation(true);
    fetchDatabases().finally(() => {
      setTimeout(() => setRefreshAnimation(false), 1000);
    });
  };

  const toggleConnectionMenu = (id, e) => {
    e.stopPropagation();
    const button = plugRefs.current[id];
    const rect = button.getBoundingClientRect();

    const offset = 16;
    setShowConnectionMenu({
      id,
      position: {
        top: rect.top + window.scrollY + offset,
        left: rect.left + window.scrollX,
      },
    });
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setShowConnectionMenu(null);
  };

  const handleEditClick = async (id) => {
    try {
      const connection = await databaseApi.getDetails(id);
      setCurrentConnection(connection);
      setShowEditDatabaseModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch database details');
    }
  };

  const handleShowDatabase = async (id) => {
    try {
      const connection = await databaseApi.getDetails(id);
      setSelectedConnection(connection);
      setShowDatabaseModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch database details');
    }
  };

  const menuConnection = showConnectionMenu && connections.find((conn) => conn.id === showConnectionMenu.id);

  const MenuButton = ({ onClick, children, last = false }) => (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none ${!last ? 'border-b border-gray-200' : ''
        }`}
      style={{ background: 'transparent' }}
    >
      {children}
    </button>
  );

  // Close connection menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showConnectionMenu && !event.target.closest('#conn-menu-root')) {
        setShowConnectionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConnectionMenu]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4 bg-gray-50 text-gray-800"
    >
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Database Connections</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 capitalize">{currentUser.role}</span>
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700">
            <FiUser size={20} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex gap-3 items-center w-full md:w-auto">
          <button
            className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-[#5D3FD3] text-white rounded text-sm sm:text-base
             hover:bg-[#6d4fe4] focus:bg-[#5D3FD3] outline-none transition"
            onClick={() => setShowAddDatabaseModal(true)}
          >
            <FaPlus /> Add Connection
          </button>
          <div className="relative flex-grow md:flex-grow-0 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search connections..."
              className="pl-10 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
              onChange={(e) => setSearchQuery(e.target.value)}
              rows="1"
            />
          </div>
        </div>
        <div className="flex gap-3 items-center text-sm text-gray-600 w-full md:w-auto justify-end">
          <span>{filtered.length} connections</span>
          <button
            onClick={handleRefresh}
            className={`text-gray-500 hover:text-purple-600 transition ${refreshAnimation ? 'animate-spin' : ''
              }`}
            title="Refresh connections"
          >
            <FaSync />
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-max text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Host</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody
              className={
                refreshAnimation ? 'opacity-50 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'
              }
            >
              {filtered.map((conn) => (
                <tr key={conn.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#5D3FD3] rounded flex items-center justify-center text-white">
                        <FiDatabase size={16} />
                      </div>
                      <div>
                        <div className="font-semibold">{conn.name}</div>
                        <div className="text-xs text-gray-500">{conn.database}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">{conn.type}</td>
                  <td className="p-3 font-semibold">
                    <div className="max-w-xs truncate" title={displayHostDetails(conn)}>
                      {displayHostDetails(conn)}
                    </div>
                  </td>
                  <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <FaCircle className={statusStyles[conn.status] || 'text-gray-500'} size={12} />
                      {conn.status}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-3 text-purple-600 relative">
                      <div className="relative">
                        <button
                          ref={(el) => (plugRefs.current[conn.id] = el)}
                          onClick={(e) => toggleConnectionMenu(conn.id, e)}
                          className="hover:text-purple-800 transition text-[#5d3fd3]"
                          title="Connection options"
                          disabled={conn.type === 'MongoDB'}
                        >
                          <FaPlug className={conn.type === 'MongoDB' ? 'opacity-50 cursor-not-allowed' : ''} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleShowDatabase(conn.id)}
                        className="hover:text-purple-800 transition text-[#5d3fd3]"
                        title="View Database"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={() => handleEditClick(conn.id)}
                        className="hover:text-purple-800 transition text-[#5d3fd3]"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="hover:text-purple-800 transition text-[#5d3fd3]"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > connectionsPerPage && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * connectionsPerPage + 1, filtered.length)} to{' '}
              {Math.min(currentPage * connectionsPerPage, filtered.length)} of {filtered.length} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-3 py-1 border rounded-md text-sm ${currentPage === number ? 'bg-purple-600 text-white' : ''
                    }`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showConnectionMenu && menuConnection && (
        <div
          id="conn-menu-root"
          className="z-50 w-24 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 absolute"
          style={{
            top: `${showConnectionMenu.position.top}px`,
            left: `${showConnectionMenu.position.left}px`,
          }}
        >
          {menuConnection.type === 'MongoDB' ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              MongoDB Disabled
            </div>
          ) : menuConnection.status === 'Connected' ||
            menuConnection.status === 'Connected (Warning)' ? (
            <>
              <MenuButton onClick={() => handleDisconnect(menuConnection.id)}>Disconnect</MenuButton>
              <MenuButton onClick={() => handleTest(menuConnection.id)} last>
                Test
              </MenuButton>
            </>
          ) : menuConnection.status === 'Disconnected' ? (
            <>
              <MenuButton onClick={() => handleConnect(menuConnection.id)}>Connect</MenuButton>
              <MenuButton onClick={() => handleTest(menuConnection.id)} last>
                Test
              </MenuButton>
            </>
          ) : (
            <>
              <MenuButton onClick={() => handleConnect(menuConnection.id)}>Connect</MenuButton>
              <MenuButton onClick={() => handleDisconnect(menuConnection.id)} last>
                Stop Testing
              </MenuButton>
            </>
          )}
        </div>
      )}

      {showAddDatabaseModal && (
        <AddDatabase
          onClose={() => setShowAddDatabaseModal(false)}
          onAddDatabase={handleAddDatabase}
        />
      )}

      {showEditDatabaseModal && currentConnection && (
        <EditDatabase
          connection={currentConnection}
          onClose={() => setShowEditDatabaseModal(false)}
          onEditDatabase={handleEditDatabase}
        />
      )}

      {showDatabaseModal && selectedConnection && (
        <ShowDatabase
          connection={selectedConnection}
          onClose={() => {
            setShowDatabaseModal(false);
            setSelectedConnection(null);
          }}
        />
      )}
    </motion.div>
  );
}