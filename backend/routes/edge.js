const express = require('express');
const router = express.Router();
const {
  receiveSlotUpdate,
  receiveTestFeed
} = require('../controllers/edgeController');
const firebaseAuth = require('../middleware/firebaseAuth');
const roleGuard = require('../middleware/roleGuard');

router.post('/slot-update', firebaseAuth, roleGuard(['admin', 'edge']), receiveSlotUpdate);
router.post('/test-feed', firebaseAuth, roleGuard(['admin', 'edge']), receiveTestFeed);

module.exports = router;
