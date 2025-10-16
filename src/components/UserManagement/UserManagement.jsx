import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import AddUser from './AddUser';
import EditUser from './EditUser';
import { userApi, authApi } from '../../utils/api';
import { formatDateTime } from '../../utils/api';
// import arrowImage from "data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"


const statuses = ['All Status', 'Active', 'Inactive'];
const USERS_PER_PAGE = 10;

export default function UserManagement({ setIsAuthenticated }) {
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState(['All Roles']);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');

  // Function to update current user info from session and refresh from server
  const updateCurrentUserInfo = async () => {
    try {
      const session = sessionStorage.getItem('session') || localStorage.getItem('session');
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.token) {
          const tokenPayload = JSON.parse(atob(sessionData.token.split('.')[1]));
          setCurrentUserId(tokenPayload.userId);
          
          // Get fresh user data from server to ensure role is updated
          try {
            const currentUserData = await authApi.getCurrentUser();
            if (currentUserData && currentUserData.user) {
              const freshRole = currentUserData.user.role;
              setCurrentUserRole(freshRole);
              
              // Update token in session if role changed
              if (freshRole !== tokenPayload.role) {
                const newTokenPayload = {
                  ...tokenPayload,
                  role: freshRole
                };
                
                // Update session with new token data
                const newSession = {
                  ...sessionData,
                  user: { ...sessionData.user, role: freshRole }
                };
                
                if (localStorage.getItem('session')) {
                  localStorage.setItem('session', JSON.stringify(newSession));
                }
                if (sessionStorage.getItem('session')) {
                  sessionStorage.setItem('session', JSON.stringify(newSession));
                }
              }
            }
          } catch (error) {
            // Fallback to token role if API call fails
            console.error('Error fetching current user:', error);
            if (tokenPayload.role) {
              setCurrentUserRole(tokenPayload.role);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user info:', error);
    }
  };

  useEffect(() => {
    updateCurrentUserInfo();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit: USERS_PER_PAGE,
          role: roleFilter !== 'All Roles' ? roleFilter : undefined,
          status: statusFilter !== 'All Status' ? statusFilter : undefined,
          search: searchQuery || undefined
        };
        const data = await userApi.getAll(params);
        
        // Sort users: Super Admins first, then by creation date (earliest first)
        const sortedUsers = data.users.sort((a, b) => {
          // First sort by role: Super Admin first
          if (a.role === 'Super Admin' && b.role !== 'Super Admin') return -1;
          if (a.role !== 'Super Admin' && b.role === 'Super Admin') return 1;
          
          // If same role, sort by creation date (earliest first)
          const dateA = new Date(a.createdAt || a.created_at);
          const dateB = new Date(b.createdAt || b.created_at);
          return dateA - dateB;
        });
        
        setUsers(sortedUsers);
        setRoles(['All Roles', ...data.availableRoles]);
      } catch (error) {
        toast.error(error.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter, searchQuery]);

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
    const userName = user.name || '';
    const userEmail = user.email || '';
    const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const start = (currentPage - 1) * USERS_PER_PAGE;
  const end = start + USERS_PER_PAGE;
  const usersToDisplay = filteredUsers.slice(start, end);

  const handleDelete = async (id) => {
    const userToDelete = users.find(user => user.id === id);

    // Check if user is Super Admin
    if (userToDelete?.role === 'Super Admin') {
      if (currentUserRole !== 'Super Admin') {
        toast.error('You cannot delete a Super Admin user');
        return;
      }
      if (currentUserId && currentUserId.toString() === id.toString()) {
        toast.error('Super Admin cannot delete their own account');
        return;
      }
    }

    if (currentUserId && currentUserId.toString() === id.toString()) {
      toast.error('You cannot delete your own account');
      return;
    }

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
        await userApi.delete(id);
        setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
        toast.success('User deleted successfully!');
        if (currentUserId && currentUserId.toString() === id.toString()) {
          toast.info('Your account has been deleted. Logging out...');
          setTimeout(() => {
            localStorage.removeItem('session');
            sessionStorage.removeItem('session');
            setIsAuthenticated(false);
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        if (error.message.includes('cannot delete your own account')) {
          toast.error('You cannot delete your own account');
        } else if (error.message.includes('Super Admin cannot delete their own account')) {
          toast.error('Super Admin cannot delete their own account');
        } else if (error.message.includes('You cannot delete a Super Admin user')) {
          toast.error('You cannot delete a Super Admin user');
        } else {
          toast.error(error.message || 'Failed to delete user');
        }
      }
    }
  };

  const handleEdit = (id) => {
    const userToEdit = users.find(user => user.id === id);
    
    // Check if user is Super Admin and current user is not Super Admin
    if (userToEdit?.role === 'Super Admin' && currentUserRole !== 'Super Admin') {
      toast.error('You cannot edit a Super Admin user');
      return;
    }
    
    setCurrentUser(userToEdit);
    setShowEditUserModal(true);
  };

  const handleAddUser = async (newUser) => {
    try {
      const createdUser = await userApi.create(newUser);
      setUsers(prevUsers => [...prevUsers, {
        ...createdUser,
        id: createdUser.uid || Date.now(),
        lastLogin: null,
        createdAt: new Date().toISOString()
      }]);
      setShowAddUserModal(false);
      toast.success('User added successfully!');
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add user';
      if (errorMessage.toLowerCase().includes('already exists')) {
        toast.error('User with this email already exists');
      } else if (errorMessage.includes('Only Super Admins can create Super Admin users')) {
        toast.error('Only Super Admins can create Super Admin users');
      } else if (errorMessage.includes('Cannot create more than 3 Super Admins')) {
        toast.error('Cannot create more than 3 Super Admins');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleUpdateUser = async (id, updatedData) => {
    try {
      const updatedUser = await userApi.update(id, updatedData);
      
      // Update the users list
      const updatedUsers = users.map(user =>
        user.id === id ? { ...user, ...updatedUser } : user
      );
      
      // Re-sort users after update
      const sortedUsers = updatedUsers.sort((a, b) => {
        if (a.role === 'Super Admin' && b.role !== 'Super Admin') return -1;
        if (a.role !== 'Super Admin' && b.role === 'Super Admin') return 1;
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateA - dateB;
      });
      
      setUsers(sortedUsers);
      setShowEditUserModal(false);
      toast.success('User updated successfully!');
      await updateCurrentUserInfo();
      
    } catch (error) {
      if (error.message.includes('cannot change your own role')) {
        toast.error('You cannot change your own role');
      } else if (error.message.includes('Super admin role cannot be changed')) {
        toast.error('Super Admin role cannot be changed');
      } else if (error.message.includes('You cannot edit a Super Admin user')) {
        toast.error('You cannot edit a Super Admin user');
      } else if (error.message.includes('Only Super Admins can assign Super Admin role')) {
        toast.error('Only Super Admins can assign Super Admin role');
      } else if (error.message.includes('Cannot have more than 3 Super Admins')) {
        toast.error('Cannot have more than 3 Super Admins');
      } else if (error.message.includes('You cannot change your own role from Super Admin')) {
        toast.error('You cannot change your own role from Super Admin');
      } else {
        toast.error(error.message || 'Failed to update user');
      }
    }
  };

  const canEditUser = (user) => {
    if (user.role === 'Super Admin') {
      return currentUserRole === 'Super Admin';
    }
    return true;
  };

  const canDeleteUser = (user) => {
    if (user.role === 'Super Admin') {
      return currentUserRole === 'Super Admin' && currentUserId.toString() !== user.id.toString();
    }
    return currentUserId.toString() !== user.id.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-3 sm:p-6 bg-gray-50 text-gray-80"
    >
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">User Management</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            data-testid="add-user-button"
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm sm:text-base
             hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition"
            onClick={() => setShowAddUserModal(true)}
          >
            <FaUserPlus className="text-sm sm:text-base" /> Add User
          </button>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700">
            <FiUser className="text-sm sm:text-base" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="relative w-full sm:w-64 lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 text-sm" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-center gap-2 flex-nowrap">
          <select
            aria-label="Filter by role"
            className={"p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base "}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <select
            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block text-sm text-gray-600 whitespace-nowrap">
          Showing {start + 1}-{Math.min(end, totalUsers)} of {totalUsers} users
        </div>

        <div className="sm:hidden text-xs text-gray-600 whitespace-nowrap">
          Showing {start + 1}-{Math.min(end, totalUsers)} of {totalUsers} users
        </div>
      </div>

      {/* Table container: w-full, overflow-x-auto, NO vertical scroll */}
      <div className="bg-white shadow rounded w-full overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 sm:p-3">USER</th>
                <th className="p-2 sm:p-3">ROLE</th>
                <th className="p-2 sm:p-3">STATUS</th>
                <th className="p-2 sm:p-3">2FA</th>
                <th className="p-2 sm:p-3">LAST LOGIN</th>
                <th className="p-2 sm:p-3">ADDED DATE</th>
                <th className="p-2 sm:p-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  </td>
                </tr>
              ) : usersToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                usersToDisplay.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-t hover:bg-gray-50 ${user.role === 'Super Admin' ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 hover:from-amber-100/80 hover:to-yellow-100/80 border-l-4 border-l-amber-400 shadow-sm' : ''}`}
                  >
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${user.role === 'Super Admin' ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md' : 'bg-purple-100 text-purple-700'}`}>
                          <FiUser className="text-xs sm:text-sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        user.role === 'Super Admin' 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:shadow-lg'
                          : user.role === 'Admin'
                            ? 'bg-[#5D3FD3] text-white'
                            : user.role === 'Editor'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                        {user.role === 'Super Admin' && (
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded ${user.status === 'Active'
                          ? 'bg-green-100 text-green-800 font-medium'
                          : 'bg-red-100 text-red-800 font-medium'
                          }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={user.twoFA}
                          readOnly
                        />
                        <div className={`w-9 h-5 sm:w-11 sm:h-6 ${user.twoFA ? 'bg-purple-600' : 'bg-gray-200'} rounded-full peer transition-all relative`}>
                          <div className={`absolute top-0.5 sm:top-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow transition-all ${user.twoFA ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`} />
                        </div>
                      </label>
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap">
                      {formatDateTime(user.lastLogin)}
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <div className="flex gap-2 sm:gap-4 justify-center text-purple-600">
                        <button 
                          onClick={() => handleEdit(user.id)} 
                          className={`hover:text-purple-800 ${
                            !canEditUser(user) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!canEditUser(user)}
                          title={
                            !canEditUser(user) 
                              ? user.role === 'Super Admin' 
                                ? 'Only Super Admins can edit Super Admin users'
                                : 'Cannot edit user'
                              : (currentUserId && currentUserId.toString() === user.id.toString())
                                ? 'You can edit your phone and address but not your role'
                                : 'Edit user'
                          }
                        >
                          <FaEdit className="text-sm sm:text-base" />
                        </button>
                        <button
                          data-testid="delete-user-button"
                          onClick={() => handleDelete(user.id)}
                          className={`hover:text-purple-800 ${
                            !canDeleteUser(user) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!canDeleteUser(user)}
                          title={
                            !canDeleteUser(user)
                              ? user.role === 'Super Admin'
                                ? currentUserRole !== 'Super Admin'
                                  ? 'You cannot delete a Super Admin user'
                                  : 'Super Admin cannot delete their own account'
                                : 'You cannot delete your own account'
                              : 'Delete user'
                          }
                        >
                          <FaTrash className="text-sm sm:text-base" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * USERS_PER_PAGE + 1, totalUsers)} to{' '}
              {Math.min(currentPage * USERS_PER_PAGE, totalUsers)} of {totalUsers} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  className={`px-3 py-1 border rounded-md text-sm ${currentPage === number ? 'bg-purple-600 text-white' : ''
                    }`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {showAddUserModal && (
        <AddUser
          onClose={() => setShowAddUserModal(false)}
          onAddUser={handleAddUser}
          currentUserRole={currentUserRole}
        />
      )}
      {showEditUserModal && currentUser && (
        <EditUser
          user={currentUser}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowEditUserModal(false)}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </motion.div>
  );
}