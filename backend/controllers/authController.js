const admin = require('firebase-admin');
const User = require('../models/User');

// POST /api/auth/register
const register = async (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: 'uid and email are required' });
  }

  try {
    // Upsert: create if not exists
    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({
        uid,
        email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        role: 'user'
      });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

// PATCH /api/auth/users/:uid/role  (admin only)
const updateUserRole = async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;

  if (!['user', 'admin', 'edge'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await User.findOneAndUpdate({ uid }, { role }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PATCH /api/auth/users/:uid/disable  (admin only)
const toggleDisableUser = async (req, res) => {
  const { uid } = req.params;
  const { disabled } = req.body;

  try {
    const user = await User.findOneAndUpdate({ uid }, { disabled }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/auth/users  (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { register, getMe, updateUserRole, toggleDisableUser, getAllUsers };
