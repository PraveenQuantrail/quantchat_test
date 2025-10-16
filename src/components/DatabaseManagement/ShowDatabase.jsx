import React, { useState, useEffect } from 'react';
import { FiDatabase, FiX, FiRefreshCw, FiTable, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { FaCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { databaseApi } from '../../utils/api';

// Always call hooks at the top level, before any return or conditional.
const ShowDatabase = ({ connection, onClose }) => {
  const [schemaData, setSchemaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [tableData, setTableData] = useState({});
  const [loadingTable, setLoadingTable] = useState({});

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        if (connection) {
          const result = await databaseApi.getSchema(connection.id);
          if (result.success) {
            setSchemaData(result);
          } else {
            toast.error(result.message || 'Failed to fetch database schema');
          }
        }
      } catch (error) {
        toast.error(error.message || 'Failed to fetch database schema');
      } finally {
        setLoading(false);
      }
    };

    if (connection) {
      fetchSchema();
    }
  }, [connection]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const result = await databaseApi.getSchema(connection.id);
      if (result.success) {
        setSchemaData(result);
        setExpandedItems({});
        setTableData({});
        toast.success('Database schema refreshed successfully');
      } else {
        toast.error(result.message || 'Failed to refresh database schema');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to refresh database schema');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = async (itemName) => {
    const isExpanded = expandedItems[itemName];
    if (!isExpanded && !tableData[itemName]) {
      // Fetch table/collection data if not already loaded
      try {
        setLoadingTable(prev => ({ ...prev, [itemName]: true }));
        const result = await databaseApi.getTableData(connection.id, itemName);
        if (result.success) {
          setTableData(prev => ({ ...prev, [itemName]: result.data }));
        } else {
          toast.error(result.message || `Failed to fetch ${connection.type === 'MongoDB' ? 'collection' : 'table'} data`);
        }
      } catch (error) {
        toast.error(error.message || `Failed to fetch ${connection.type === 'MongoDB' ? 'collection' : 'table'} data`);
      } finally {
        setLoadingTable(prev => ({ ...prev, [itemName]: false }));
      }
    }
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const displayHostDetails = (connection) => {
    if (connection.server_type === 'external') {
      return 'External Connection';
    }
    return connection.host
      ? `${connection.host}${connection.port ? `:${connection.port}` : ''}`
      : 'Not specified';
  };

  const statusStyles = {
    'Connected': 'text-green-500',
    'Disconnected': 'text-red-500',
    'Testing...': 'text-yellow-500',
    'Connecting...': 'text-yellow-500',
    'Disconnecting...': 'text-yellow-500',
    'Connected (Warning)': 'text-orange-500',
  };

  const renderTableData = (data, itemName) => {
    if (connection.type === 'MongoDB') {
      // MongoDB collection data (array of documents)
      return (
        <div className="mt-2 bg-gray-50 rounded-lg p-3">
          <h4 className="font-semibold text-sm mb-2">Documents ({data.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.map((doc, index) => (
              <div key={index} className="bg-white p-3 rounded border text-sm">
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(doc, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // SQL table data
      if (data.length === 0) {
        return <div className="mt-2 text-sm text-gray-500">No data found</div>;
      }

      const columns = Object.keys(data[0]);
      return (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 overflow-x-auto">
          <h4 className="font-semibold text-sm mb-2">Data ({data.length} row{data.length > 1 ? 's' : ''})</h4>
          <table className="min-w-full text-xs" role="table">
            <thead>
              <tr className="bg-gray-200">
                {columns.map(column => (
                  <th key={column} className="px-2 py-1 text-left font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-200 even:bg-gray-100">
                  {columns.map(column => (
                    <td key={column} className="px-2 py-1 truncate max-w-xs" title={String(row[column])}>
                      {String(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-gray-500">
            Showing {data.length} row{data.length > 1 ? 's' : ''}
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Defensive: Do not render if connection is undefined
  if (!connection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity overlay-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto popup-slide-in">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <FiDatabase size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Database Details</h2>
              <p className="text-sm text-gray-500">View database information and schema</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-purple-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh schema"
              disabled={refreshing}
            >
              <FiRefreshCw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Database Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Connection Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{connection.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{connection.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Host</p>
                <p className="font-medium">{displayHostDetails(connection)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Database</p>
                <p className="font-medium">{connection.database}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="flex items-center gap-2">
                  <FaCircle data-testid="status-circle" className={statusStyles[connection.status] || 'text-gray-500'} size={12} />
                  <span className="font-medium">{connection.status}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Server Type</p>
                <p className="font-medium capitalize">{connection.server_type}</p>
              </div>
            </div>
          </div>

          {/* Database Schema */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {connection.type === 'MongoDB' ? 'Collections' : 'Tables'}
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
                  aria-label="Loading schema"
                ></div>
              </div>
            ) : schemaData ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
                  {connection.type === 'MongoDB' ? (
                    schemaData.collections.length > 0 ? (
                      schemaData.collections.map((collection, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleExpand(collection)}
                            className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center">
                              <FiTable className="text-purple-600 mr-2" />
                              <span className="text-sm font-medium">{collection}</span>
                            </div>
                            {expandedItems[collection] ? <FiChevronDown /> : <FiChevronRight />}
                          </button>
                          
                          {expandedItems[collection] && (
                            <div className="p-3 border-t border-gray-200">
                              {loadingTable[collection] ? (
                                <div className="flex justify-center py-2">
                                  <div
                                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"
                                    aria-label="Loading table data"
                                  ></div>
                                </div>
                              ) : tableData[collection] ? (
                                renderTableData(tableData[collection], collection)
                              ) : (
                                <div className="text-sm text-gray-500">No data available</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No collections found in this database
                      </div>
                    )
                  ) : (
                    schemaData.tables.length > 0 ? (
                      schemaData.tables.map((table, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleExpand(table)}
                            className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center">
                              <FiTable className="text-purple-600 mr-2" />
                              <span className="text-sm font-medium">{table}</span>
                            </div>
                            {expandedItems[table] ? <FiChevronDown /> : <FiChevronRight />}
                          </button>
                          
                          {expandedItems[table] && (
                            <div className="p-3 border-t border-gray-200">
                              {loadingTable[table] ? (
                                <div className="flex justify-center py-2">
                                  <div
                                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"
                                    aria-label="Loading table data"
                                  ></div>
                                </div>
                              ) : tableData[table] ? (
                                renderTableData(tableData[table], table)
                              ) : (
                                <div className="text-sm text-gray-500">No data available</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No tables found in this database
                      </div>
                    )
                  )}
                </div>
                
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Total {connection.type === 'MongoDB' ? 'collections' : 'tables'}:{' '}
                    <span className="font-medium">
                      {connection.type === 'MongoDB' ? schemaData.collections.length : schemaData.tables.length}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Failed to load database schema. Please try refreshing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowDatabase;