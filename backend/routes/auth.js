const express = require('express');
const router = express.Router();
const {
  register,
  getMe,
  updateUserRole,
  toggleDisableUser,
  getAllUsers
} = require('../controllers/authController');
const firebaseAuth = require('../middleware/firebaseAuth');
const roleGuard = require('../middleware/roleGuard');

// Public
router.post('/register', register);

// Authenticated
router.get('/me', firebaseAuth, getMe);

// Admin only
router.get('/users', firebaseAuth, roleGuard(['admin']), getAllUsers);
router.patch('/users/:uid/role', firebaseAuth, roleGuard(['admin']), updateUserRole);
router.patch('/users/:uid/disable', firebaseAuth, roleGuard(['admin']), toggleDisableUser);

module.exports = router;
