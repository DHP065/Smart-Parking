const express = require('express');
const router = express.Router();
const {
  getAllLocations,
  getLocationById,
  updateLotStatus,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/parkingController');
const firebaseAuth = require('../middleware/firebaseAuth');
const roleGuard = require('../middleware/roleGuard');

// Public (for map display)
router.get('/', getAllLocations);
router.get('/:id', getLocationById);

// Admin or Edge
router.post('/', firebaseAuth, roleGuard(['admin', 'edge']), createLocation);
router.put('/:id', firebaseAuth, roleGuard(['admin', 'edge']), updateLocation);
router.delete('/:id', firebaseAuth, roleGuard(['admin', 'edge']), deleteLocation);

// Admin or edge
router.patch('/:id/status', firebaseAuth, roleGuard(['admin', 'edge']), updateLotStatus);

module.exports = router;
