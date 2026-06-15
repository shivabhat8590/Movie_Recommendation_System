const User = require('../models/User');

// GET /api/v1/admin/users
const getAllUsers = async (req, res) => {
  const { search = '', role = 'all', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role !== 'all') {
    query.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
};

// PATCH /api/v1/admin/users/:id
const updateUser = async (req, res) => {
  const { name, role, isActive } = req.body;
  const targetUser = await User.findById(req.params.id);

  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  // RULE 1: Only Super Admin can modify an Admin
  if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can modify other admins' });
  }

  // RULE 2: Only Super Admin can change roles
  if (role && role !== targetUser.role && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can change user roles' });
  }

  if (name) targetUser.name = name;
  if (role) targetUser.role = role;
  if (isActive !== undefined) targetUser.isActive = isActive;

  await targetUser.save();
  res.json({ success: true, message: 'User updated successfully', data: { user: targetUser } });
};

// DELETE /api/v1/admin/users/:id
const deleteUser = async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  // RULE 3: Only Super Admin can delete an Admin
  if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can delete other admins' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted successfully' });
};

// GET /api/v1/admin/stats
const getSystemStats = async (req, res) => {
  const [totalUsers, admins, activeUsers] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ isActive: true })
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      admins,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers
    }
  });
};

module.exports = { getAllUsers, updateUser, deleteUser, getSystemStats };
