import React, { useState, useEffect } from 'react';
import { FiDatabase, FiX, FiRefreshCw, FiTable, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { databaseApi } from '../../utils/api';

const ViewSelectedDBInfo = ({ connection, schemaData, onClose }) => {
  const [localSchemaData, setLocalSchemaData] = useState(schemaData);
  const [loading, setLoading] = useState(!schemaData);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [tableData, setTableData] = useState({});
  const [loadingTable, setLoadingTable] = useState({});

  useEffect(() => {
    const fetchSchema = async () => {
      if (!connection || localSchemaData) return;
      
      try {
        setLoading(true);
        const result = await databaseApi.getSchema(connection.id);
        if (result.success) {
          setLocalSchemaData(result);
        }
      } catch (error) {
        console.error('Failed to fetch database schema:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [connection, localSchemaData]);

  const handleRefresh = async () => {
    if (!connection) return;
    
    try {
      setRefreshing(true);
      const result = await databaseApi.getSchema(connection.id);
      if (result.success) {
        setLocalSchemaData(result);
        setExpandedItems({});
        setTableData({});
      }
    } catch (error) {
      console.error('Failed to refresh database schema:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = async (itemName) => {
    const isExpanded = expandedItems[itemName];
    if (!isExpanded && !tableData[itemName]) {
      try {
        setLoadingTable(prev => ({ ...prev, [itemName]: true }));
        const result = await databaseApi.getTableData(connection.id, itemName);
        if (result.success) {
          setTableData(prev => ({ ...prev, [itemName]: result.data }));
        }
      } catch (error) {
        console.error(`Failed to fetch ${connection.type === 'MongoDB' ? 'collection' : 'table'} data:`, error);
      } finally {
        setLoadingTable(prev => ({ ...prev, [itemName]: false }));
      }
    }
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const renderTableData = (data, itemName) => {
    if (connection.type === 'MongoDB') {
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

  if (!connection) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      ></motion.div>

      <motion.div
        className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, type: "spring", damping: 25 }}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <FiDatabase size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{connection.name} - Database Structure</h2>
              <p className="text-sm text-gray-500">
                {connection.type === 'MongoDB' ? 'Collections' : 'Tables'} in {connection.database}
              </p>
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

        <div className="p-6">
          {/* Database Schema */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {connection.type === 'MongoDB' ? 'Collections' : 'Tables'} 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({connection.type === 'MongoDB' ? 'MongoDB' : 'SQL'} Database)
              </span>
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
                  aria-label="Loading schema"
                ></div>
              </div>
            ) : localSchemaData ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
                  {connection.type === 'MongoDB' ? (
                    localSchemaData.collections && localSchemaData.collections.length > 0 ? (
                      localSchemaData.collections.map((collection, index) => (
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
                          
                          <AnimatePresence>
                            {expandedItems[collection] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No collections found in this database
                      </div>
                    )
                  ) : (
                    localSchemaData.tables && localSchemaData.tables.length > 0 ? (
                      localSchemaData.tables.map((table, index) => (
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
                          
                          <AnimatePresence>
                            {expandedItems[table] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
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
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                      {connection.type === 'MongoDB' 
                        ? (localSchemaData.collections ? localSchemaData.collections.length : 0)
                        : (localSchemaData.tables ? localSchemaData.tables.length : 0)
                      }
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
      </motion.div>
    </motion.div>
  );
};

export default ViewSelectedDBInfo;