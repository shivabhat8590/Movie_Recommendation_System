const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Helpers ---
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

// Helper to validate registration input
const validateRegistration = async (name, email, password) => {
  if (!name || !name.trim()) return 'Enter a valid username';
  const nameTrimmed = name.trim();
  if (nameTrimmed.length < 3) return 'Username must contain at least 3 characters';
  if (nameTrimmed.length > 50) return 'Username must contain at most 50 characters';
  if (!/^[a-zA-Z\s]+$/.test(nameTrimmed)) return 'Username cannot contain numbers or special characters';

  if (!email || !email.trim()) return 'Enter a valid email';
  const emailLower = email.toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(emailLower)) return 'Please enter a valid mail(e.g. example@gmail.com)';

  const existing = await User.findOne({ email: emailLower });
  if (existing) return 'Email already registered';

  if (!password) return 'Enter a valid password';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (password.length > 32) return 'Password must be at most 32 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain one special character';

  return null;
};

// POST /api/v1/auth/register
const register = async (req, res) => {
  const { name, email, password, preferences } = req.body;

  const validationError = await validateRegistration(name, email, password);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: password, // pre-save hook hashes it
    passwordPlain: password,
    preferences: preferences || {},
  });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

  res.status(201).json({
    success: true,
    message: 'User account created successfully',
    data: { user, accessToken, refreshToken },
  });
};

// POST /api/v1/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Enter a valid email' });
  }
  const emailLower = email.toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(emailLower)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid mail(e.g. example@gmail.com)' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Enter a valid password' });
  }

  const user = await User.findOne({ email: emailLower }).select('+passwordHash +refreshTokens');
  if (!user) {
    return res.status(404).json({ success: false, message: 'No account found with this email' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated' });
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    return res.status(403).json({ success: false, message: 'Your account has been temporarily locked. Please try again later.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 minutes
      user.loginAttempts = 0; // reset attempts
    }
    await user.save();

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ success: false, message: 'Your account has been temporarily locked. Please try again later.' });
    }
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  // Reset lock and attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
};

// POST /api/v1/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    return res.status(401).json({ success: false, message: 'Refresh token not recognized' });
  }

  const newAccessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
};

// POST /api/v1/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken && req.user) {
    await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: refreshToken } });
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /api/v1/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

// PUT /api/v1/auth/me
const updateMe = async (req, res) => {
  const allowed = ['name', 'avatar', 'preferences', 'socialLinks'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, message: 'Profile updated', data: { user } });
};

// PUT /api/v1/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both passwords are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.passwordHash = newPassword;
  user.passwordPlain = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
};

module.exports = { register, login, refresh, logout, getMe, updateMe, changePassword };
