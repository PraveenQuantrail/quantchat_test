import React, { useState, useEffect } from 'react';
import { FiUser, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

const AddUser = ({ onClose, onAddUser, currentUserRole }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Editor',
    address: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define available roles based on current user's role
  const getAvailableRoles = () => {
    if (currentUserRole === 'Super Admin') {
      return [
        { label: "Super Admin", value: "Super Admin" },
        { label: "Admin", value: "Admin" },
        { label: "Editor", value: "Editor" },
        { label: "Readonly", value: "Readonly" }
      ];
    } else {
      return [
        { label: "Admin", value: "Admin" },
        { label: "Editor", value: "Editor" },
        { label: "Readonly", value: "Readonly" }
      ];
    }
  };

  const roleOptions = getAvailableRoles();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      address: ''
    };

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      valid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
      valid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      valid = false;
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      valid = false;
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      valid = false;
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await onAddUser({
          ...formData,
          status: 'Active',
          twoFA: false
        });
      } catch (error) {
        toast.error(error.message || 'Failed to add user');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="modal-overlay"
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity overlay-fade-in"
        onClick={onClose}
      ></div>

      <div
        className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto popup-slide-in"
        role="dialog"
        aria-modal="true"
        aria-label="Add User Modal"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <FiUser size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Add New User</h2>
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
              <label htmlFor="adduser-name" className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
              <input
                id="adduser-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                placeholder="Enter username"
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="adduser-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
              <input
                id="adduser-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="adduser-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 border border-r-0 rounded-l-lg bg-gray-50 text-gray-600 text-sm">
                  +91
                </span>
                <input
                  id="adduser-phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="10"
                  className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.phone ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  placeholder="Enter 10 digit phone number"
                />
              </div>
              {errors.phone && <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((roleOpt) => (
                  <label 
                    key={roleOpt.value} 
                    htmlFor={`adduser-role-${roleOpt.value.toLowerCase().replace(' ', '-')}`}
                    className="flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200"
                  >
                    <input
                      id={`adduser-role-${roleOpt.value.toLowerCase().replace(' ', '-')}`}
                      type="radio"
                      name="role"
                      value={roleOpt.value}
                      checked={formData.role === roleOpt.value}
                      onChange={handleChange}
                      className="text-purple-600 focus:ring-purple-500 sr-only"
                    />
                    <span className="text-sm font-medium">{roleOpt.label}</span>
                  </label>
                ))}
              </div>
              {currentUserRole === 'Super Admin' && formData.role === 'Super Admin' && (
                <p className="mt-2 text-sm text-yellow-600">
                  Note: Only 3 Super Admins are allowed in total
                </p>
              )}
            </div>

            <div>
              <label htmlFor="adduser-address" className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
              <textarea
                id="adduser-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.address ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                placeholder="123 Main St, City, State - 560001"
              ></textarea>
              {errors.address && <p className="mt-1.5 text-sm text-red-600">{errors.address}</p>}
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
              className="px-5 py-2.5 bg-[#5D3FD3] text-white rounded-lg text-sm font-medium shadow-sm 
             hover:bg-[#6d4fe4] focus:bg-[#5D3FD3] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;