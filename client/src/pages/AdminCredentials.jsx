import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import './AdminCredentials.css';

export default function AdminCredentials() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // States to toggle showing password plaintext
  const [visiblePasswords, setVisiblePasswords] = useState({});
  
  // States for updating a password
  const [editingUserId, setEditingUserId] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/credentials');
      setUsers(data.data);
    } catch (err) {
      toast.error('Failed to load user credentials');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleStartEdit = (user) => {
    setEditingUserId(user._id);
    setNewPasswordValue('');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setNewPasswordValue('');
  };

  const handleSavePassword = async (userId) => {
    if (!newPasswordValue || newPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post(`/admin/users/${userId}/password`, { password: newPasswordValue });
      toast.success('User password updated successfully');
      
      // Update local state
      setUsers(users.map(u => u._id === userId ? { ...u, password: newPasswordValue } : u));
      setEditingUserId(null);
      setNewPasswordValue('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user password');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="credentials-page page-enter">
      <div className="container">
        
        {/* Navigation */}
        <div className="credentials-header-nav">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            ← Back to Admin Panel
          </button>
          <div className="credentials-title-badge">Security & Credentials</div>
        </div>

        {/* Header Title */}
        <header className="credentials-header">
          <h1>🔑 User Credentials Directory</h1>
          <p>View plain passwords and manage account access security</p>
        </header>

        {/* Search Control */}
        <div className="credentials-controls glass">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search user name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Credentials Table */}
        <div className="credentials-table-container glass">
          <table className="credentials-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Account Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="table-loader">
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    Loading account passwords...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isVisible = !!visiblePasswords[u._id];
                  const isEditing = editingUserId === u._id;

                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-mini">{u.name[0]}</div>
                          <span className="user-name">{u.name}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-pill ${u.role}`}>{u.role}</span>
                      </td>
                      <td className="password-cell">
                        {isEditing ? (
                          <div className="password-edit-form">
                            <input 
                              type="text" 
                              placeholder="New password" 
                              value={newPasswordValue}
                              onChange={(e) => setNewPasswordValue(e.target.value)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="password-value-wrap">
                            <span className="pwd-text">
                              {isVisible ? u.password : '••••••••••••'}
                            </span>
                            <button 
                              className="eye-btn" 
                              onClick={() => togglePasswordVisibility(u._id)}
                              title={isVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isVisible ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {isEditing ? (
                            <>
                              <button 
                                className="action-btn save-btn" 
                                onClick={() => handleSavePassword(u._id)}
                                disabled={submitLoading}
                              >
                                {submitLoading ? 'Saving...' : 'Save'}
                              </button>
                              <button 
                                className="action-btn cancel-btn" 
                                onClick={handleCancelEdit}
                                disabled={submitLoading}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button 
                              className="action-btn edit-pwd-btn" 
                              onClick={() => handleStartEdit(u)}
                            >
                              Reset Password
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="empty-table">
                    No accounts found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
