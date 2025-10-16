import React, { useState, useEffect } from 'react';
import { FiUser, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

const EditUser = ({ user, currentUserId, currentUserRole, onClose, onUpdateUser }) => {
  // Always reflect latest user's role (even if changed)
  const [formData, setFormData] = useState({
    phone: user.phone || '',
    role: user.role || 'Editor',
    address: user.address || ''
  });

  const [errors, setErrors] = useState({
    phone: '',
    address: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is editing themselves
  const isEditingSelf = currentUserId && currentUserId.toString() === user.id.toString();

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

  // If user's role changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      role: user.role 
    }));
  }, [user.role]);

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
      phone: '',
      address: ''
    };

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
        // For Super Admin editing themselves or other Super Admins, only send phone and address
        const updateData = { 
          phone: formData.phone, 
          address: formData.address 
        };

        // Only include role if it's changed and current user is Super Admin and not editing themselves
        if (formData.role !== user.role && currentUserRole === 'Super Admin' && !isEditingSelf) {
          updateData.role = formData.role;
        }

        await onUpdateUser(user.id, updateData);
      } catch (error) {
        toast.error(error.message || 'Failed to update user');
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

  const isSuperAdmin = user.role === 'Super Admin';
  const isCurrentUserSuperAdmin = currentUserRole === 'Super Admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity overlay-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto popup-slide-in">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <FiUser size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
              {isSuperAdmin && (
                <p className="text-sm text-yellow-600 mt-1">Super Admin User</p>
              )}
              {isEditingSelf && (
                <p className="text-sm text-blue-600 mt-1">You can edit your phone and address but not your role</p>
              )}
            </div>
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
              <label htmlFor="edituser-name" className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                id="edituser-name"
                type="text"
                name="name"
                value={user.name || ''}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="edituser-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="edituser-email"
                type="email"
                name="email"
                value={user.email || ''}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="edituser-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 border border-r-0 rounded-l-lg bg-gray-50 text-gray-600 text-sm">
                  +91
                </span>
                <input
                  id="edituser-phone"
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
                {roleOptions.map((roleOpt) => {
                  // Determine if this role option should be disabled
                  let disabled = false;
                  let checked = formData.role === roleOpt.value;
                  
                  // Super Admin role logic
                  if (roleOpt.value === 'Super Admin') {
                    // Disable Super Admin option for non-Super Admin users
                    if (!isCurrentUserSuperAdmin) disabled = true;
                    // Disable if editing self
                    if (isEditingSelf) disabled = true;
                  }
                  
                  // For self-edit, only current role is "selected" and others unselected and disabled
                  if (isEditingSelf) {
                    disabled = formData.role !== roleOpt.value;
                  }
                  
                  // For Super Admin users being edited by other Super Admins, allow role changes
                  if (isSuperAdmin && isCurrentUserSuperAdmin && !isEditingSelf) {
                    disabled = false; // Super Admins can change other Super Admins' roles
                  }

                  return (
                    <label
                      key={roleOpt.value}
                      htmlFor={`edituser-role-${roleOpt.value.toLowerCase().replace(' ', '-')}`}
                      className={
                        `flex flex-col items-center p-3 border rounded-lg transition-all ` +
                        (disabled
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                          : 'cursor-pointer hover:border-purple-300 hover:bg-purple-50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50 has-[:checked]:ring-1 has-[:checked]:ring-purple-200')
                      }
                    >
                      <input
                        id={`edituser-role-${roleOpt.value.toLowerCase().replace(' ', '-')}`}
                        type="radio"
                        name="role"
                        value={roleOpt.value}
                        checked={checked}
                        onChange={handleChange}
                        className="text-purple-600 focus:ring-purple-500 sr-only"
                        disabled={disabled}
                      />
                      <span className="text-sm font-medium">{roleOpt.label}</span>
                    </label>
                  );
                })}
              </div>
              {isSuperAdmin && !isCurrentUserSuperAdmin && (
                <p className="mt-2 text-sm text-yellow-600">Only Super Admins can edit Super Admin users</p>
              )}
              {isEditingSelf && (
                <p className="mt-2 text-sm text-blue-600">You cannot change your own role</p>
              )}
              {formData.role === 'Super Admin' && isCurrentUserSuperAdmin && !isEditingSelf && (
                <p className="mt-2 text-sm text-yellow-600">
                  Note: Only 3 Super Admins are allowed in total
                </p>
              )}
            </div>

            <div>
              <label htmlFor="edituser-address" className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
              <textarea
                id="edituser-address"
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
              {isSubmitting ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;