const express = require('express');
const router = express.Router();
const {
  getSlotsByLocation,
  updateSlot,
  configureSlots
} = require('../controllers/slotController');
const firebaseAuth = require('../middleware/firebaseAuth');
const roleGuard = require('../middleware/roleGuard');

// Authenticated users can view slots
router.get('/:locationId', firebaseAuth, getSlotsByLocation);

// Edge or admin only
router.patch('/:slotId', firebaseAuth, roleGuard(['admin', 'edge']), updateSlot);
router.post('/configure', firebaseAuth, roleGuard(['admin', 'edge']), configureSlots);

module.exports = router;
