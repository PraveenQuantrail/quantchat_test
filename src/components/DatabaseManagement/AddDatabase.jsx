import React, { useState, useEffect } from 'react';
import { FiDatabase, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { FaCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
// ghjfjhgjfdhgjkdfhgj

// jgdfhgjhfdjghjfdg

// gdfhgjjhdfjgjdfg

const AddDatabase = ({ onClose, onAddDatabase }) => {
  const [formData, setFormData] = useState({
    name: '',
    server_type: 'local',
    type: 'PostgreSQL',
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
    connection_string: '',
    ssl: false
  });

  const [errors, setErrors] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
    connection_string: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Default ports for different database types
  const getDefaultPort = (type) => {
    switch (type) {
      case 'PostgreSQL': return '5432';
      case 'MySQL': return '3306';
      case 'ClickHouse': return '8123';
      default: return '';
    }
  };

  // Set default port when database type changes
  useEffect(() => {
    if (formData.server_type === 'local' && !formData.port) {
      setFormData(prev => ({
        ...prev,
        port: getDefaultPort(prev.type)
      }));
    }
  }, [formData.type, formData.server_type, formData.port]);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: '',
      host: '',
      port: '',
      username: '',
      password: '',
      database: '',
      connection_string: ''
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      valid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
      valid = false;
    }

    if (formData.server_type === 'local') {
      if (!formData.host.trim()) {
        newErrors.host = 'Host is required';
        valid = false;
      }

      if (!formData.port.trim()) {
        newErrors.port = 'Port is required';
        valid = false;
      } else if (!/^\d+$/.test(formData.port)) {
        newErrors.port = 'Port must be a number';
        valid = false;
      }

      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
        valid = false;
      }

      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
        valid = false;
      }
    } else {
      if (!formData.connection_string.trim()) {
        newErrors.connection_string = 'Connection string is required';
        valid = false;
      }
    }

    if (!formData.database.trim()) {
      newErrors.database = 'Database name is required';
      valid = false;
    }

    // Check for default credentials warning
    if (
      formData.server_type === 'local' &&
      formData.type === 'PostgreSQL' &&
      formData.port === '5432' &&
      formData.host === 'localhost' &&
      formData.username === 'postgres'
    ) {
      toast.warn('Warning: Using default PostgreSQL credentials. Consider changing for security.');
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await onAddDatabase(formData);
      } catch (error) {
        toast.error(error.message || 'Failed to add database');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity overlay-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto popup-slide-in">
        <div className="flex justify-between items-center p-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <FiDatabase size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Add New Database</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                placeholder="Enter connection name"
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200">
                  <input
                    type="radio"
                    name="server_type"
                    value="local"
                    checked={formData.server_type === 'local'}
                    onChange={handleChange}
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium">Local/Internal</span>
                </label>
                <label className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200">
                  <input
                    type="radio"
                    name="server_type"
                    value="external"
                    checked={formData.server_type === 'external'}
                    onChange={handleChange}
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium">External (Cloud)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Database Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200">
                  <input
                    type="radio"
                    name="type"
                    value="PostgreSQL"
                    checked={formData.type === 'PostgreSQL'}
                    onChange={handleChange}
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium">PostgreSQL</span>
                </label>
                <label className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200">
                  <input
                    type="radio"
                    name="type"
                    value="MySQL"
                    checked={formData.type === 'MySQL'}
                    onChange={handleChange}
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium">MySQL</span>
                </label>
                <label className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200">
                  <input
                    type="radio"
                    name="type"
                    value="ClickHouse"
                    checked={formData.type === 'ClickHouse'}
                    onChange={handleChange}
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium">ClickHouse</span>
                </label>
                <label className="flex flex-col items-center p-3 border rounded-lg transition-all opacity-50 cursor-not-allowed">
                  <input
                    type="radio"
                    name="type"
                    value="MongoDB"
                    disabled
                    className="text-purple-600 focus:ring-purple-500 sr-only"
                  />
                  <span className="text-sm font-medium text-gray-400">MongoDB (Disabled)</span>
                </label>
              </div>
            </div>

            {formData.server_type === 'local' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Host *</label>
                    <input
                      type="text"
                      name="host"
                      value={formData.host}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.host ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Enter host (e.g., localhost)"
                    />
                    {errors.host && <p className="mt-1.5 text-sm text-red-600">{errors.host}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Port *</label>
                    <input
                      type="text"
                      name="port"
                      value={formData.port}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.port ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Enter port"
                    />
                    {errors.port && <p className="mt-1.5 text-sm text-red-600">{errors.port}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username *</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.username ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      placeholder="Enter username"
                    />
                    {errors.username && <p className="mt-1.5 text-sm text-red-600">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    name="ssl"
                    checked={formData.ssl}
                    onChange={handleChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ssl" className="text-sm text-gray-700">
                    Require SSL connection
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Connection String *</label>
                  <textarea
                    name="connection_string"
                    value={formData.connection_string}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.connection_string ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    placeholder={
                      formData.type === 'ClickHouse' 
                        ? 'http://username:password@host:port/database' 
                        : 'postgres://username:password@host:port/database'
                    }
                    rows="3"
                  />
                  {errors.connection_string && <p className="mt-1.5 text-sm text-red-600">{errors.connection_string}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.type === 'ClickHouse' 
                      ? 'For ClickHouse: http://username:password@host:8123/database' 
                      : formData.type === 'PostgreSQL'
                      ? 'For PostgreSQL: postgres://username:password@host:5432/database'
                      : 'For MySQL: mysql://username:password@host:3306/database'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ssl-external"
                    name="ssl"
                    checked={formData.ssl}
                    onChange={handleChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ssl-external" className="text-sm text-gray-700">
                    Require SSL connection
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Database Name *</label>
              <input
                type="text"
                name="database"
                value={formData.database}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.database ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                placeholder="Enter database name"
              />
              {errors.database && <p className="mt-1.5 text-sm text-red-600">{errors.database}</p>}
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FaCircle className="text-yellow-500" size={12} />
              <span className="text-sm text-gray-600">New connections will be in 'Testing' status</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#5D3FD3] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[#6d4fe4] focus:bg-[#5D3FD3] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDatabase;