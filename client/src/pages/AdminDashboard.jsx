import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [search, filterRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get(`/admin/users?search=${search}&role=${filterRole}`),
        api.get('/admin/stats')
      ]);
      setUsers(usersRes.data.data.users);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      await api.patch(`/admin/users/${targetUser._id}`, { isActive: !targetUser.isActive });
      setUsers(users.map(u => u._id === targetUser._id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change ${targetUser.name}'s role to ${newRole}?`)) return;
    try {
      await api.patch(`/admin/users/${targetUser._id}`, { role: newRole });
      setUsers(users.map(u => u._id === targetUser._id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role');
    }
  };

  return (
    <div className="admin-page page-enter">
      <div className="container">
        <header className="admin-header">
          <h1>🛡️ Admin Control Panel</h1>
          <p>Manage users and monitor system health</p>
        </header>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card glass">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{stats?.totalUsers || 0}</span>
          </div>
          <div className="admin-stat-card glass">
            <span className="stat-label">Admins</span>
            <span className="stat-value">{stats?.admins || 0}</span>
          </div>
          <div className="admin-stat-card glass">
            <span className="stat-label">Active Users</span>
            <span className="stat-value">{stats?.activeUsers || 0}</span>
          </div>
          <div className="admin-stat-card glass">
            <span className="stat-label">Inactive</span>
            <span className="stat-value">{stats?.inactiveUsers || 0}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="admin-controls glass">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="user">Users Only</option>
            <option value="admin">Admins Only</option>
          </select>
        </div>

        {/* User Table */}
        <div className="admin-table-container glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="table-loader">Loading users...</td></tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-mini">{u.name[0]}</div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`} />
                      {u.isActive ? 'Active' : 'Banned'}
                    </td>
                    <td>
                      <div className="table-actions">
                        {/* Regular admins can only manage non-admin users */}
                        {(!u.isSuperAdmin && (u.role !== 'admin' || user.isSuperAdmin)) ? (
                          <>
                            <button className="action-btn" onClick={() => handleToggleActive(u)}>
                              {u.isActive ? 'Ban' : 'Unban'}
                            </button>
                            {user.isSuperAdmin && (
                              <button className="action-btn role-toggle" onClick={() => handleToggleRole(u)}>
                                {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                              </button>
                            )}
                            <button className="action-btn delete" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                          </>
                        ) : (
                          <span className="text-muted">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="empty-table">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
