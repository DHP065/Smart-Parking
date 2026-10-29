const ParkingSlot = require('../models/ParkingSlot');
const ParkingLocation = require('../models/ParkingLocation');

// POST /api/edge/slot-update
const receiveSlotUpdate = async (req, res) => {
  const { locationId, slotLabel, status } = req.body;
  const validStatuses = ['empty', 'occupied', 'reserved'];

  if (!locationId || !slotLabel || !status) {
    return res.status(400).json({ error: 'locationId, slotLabel, and status are required' });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const slot = await ParkingSlot.findOneAndUpdate(
      { locationId, slotLabel },
      { status, lastUpdated: new Date() },
      { new: true, upsert: false }
    );

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Recalculate available slots
    const allSlots = await ParkingSlot.find({ locationId });
    const emptyCount = allSlots.filter(s => s.status === 'empty').length;
    const updateData = {
      availableSlots: emptyCount,
      status: emptyCount === 0 ? 'full' : 'available'
    };

    const location = await ParkingLocation.findByIdAndUpdate(locationId, updateData, { new: true });

    // Emit real-time events via Socket.IO
    if (req.io) {
      req.io.to(locationId).emit('slot:update', {
        locationId,
        slotId: slot._id.toString(),
        slotLabel: slot.slotLabel,
        status: slot.status
      });
      req.io.to(locationId).emit('lot:status', {
        locationId,
        status: location.status,
        availableSlots: location.availableSlots
      });
      req.io.emit('dashboard:refresh');
    }

    return res.status(200).json({ slot, location });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/edge/test-feed
const receiveTestFeed = async (req, res) => {
  const { locationId, detections, videoFilename, timestamp } = req.body;

  if (!locationId || !Array.isArray(detections)) {
    return res.status(400).json({ error: 'locationId and detections array are required' });
  }

  try {
    // Apply each detection to the slots
    const results = [];
    for (const detection of detections) {
      const { slotLabel, status } = detection;
      const slot = await ParkingSlot.findOneAndUpdate(
        { locationId, slotLabel },
        { status, lastUpdated: new Date() },
        { new: true }
      );
      if (slot) results.push({ slotLabel, status, updated: true });
      else results.push({ slotLabel, status, updated: false, reason: 'Slot not found' });
    }

    // Recalculate lot totals
    const allSlots = await ParkingSlot.find({ locationId });
    const emptyCount = allSlots.filter(s => s.status === 'empty').length;
    const location = await ParkingLocation.findByIdAndUpdate(
      locationId,
      { availableSlots: emptyCount, status: emptyCount === 0 ? 'full' : 'available' },
      { new: true }
    );

    if (req.io) {
      req.io.to(locationId).emit('lot:status', {
        locationId,
        status: location.status,
        availableSlots: location.availableSlots
      });
      req.io.emit('dashboard:refresh');
    }

    return res.status(200).json({
      message: 'Test feed results applied',
      videoFilename,
      timestamp,
      results
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { receiveSlotUpdate, receiveTestFeed };
