const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  verifyQR,
  cancelReservation,
  getAllReservations,
  getReservationStats,
  verifyExitQR
} = require('../controllers/reservationController');
const firebaseAuth = require('../middleware/firebaseAuth');
const roleGuard = require('../middleware/roleGuard');

// Authenticated user routes
router.post('/', firebaseAuth, createReservation);
router.get('/my', firebaseAuth, getMyReservations);
router.patch('/:id/cancel', firebaseAuth, cancelReservation);

// Edge only
router.post('/verify', firebaseAuth, roleGuard(['admin', 'edge']), verifyQR);
router.post('/verify-exit', firebaseAuth, roleGuard(['admin', 'edge']), verifyExitQR);

// Admin only
router.get('/all', firebaseAuth, roleGuard(['admin']), getAllReservations);
router.get('/stats', firebaseAuth, roleGuard(['admin']), getReservationStats);

module.exports = router;
