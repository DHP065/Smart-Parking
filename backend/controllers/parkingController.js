const ParkingLocation = require('../models/ParkingLocation');
const ParkingSlot = require('../models/ParkingSlot');

// GET /api/parking
const getAllLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find().sort({ name: 1 });
    return res.status(200).json({ locations });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/parking/:id
const getLocationById = async (req, res) => {
  try {
    const location = await ParkingLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const slots = await ParkingSlot.find({ locationId: req.params.id });
    const slotSummary = {
      total: slots.length,
      empty: slots.filter(s => s.status === 'empty').length,
      occupied: slots.filter(s => s.status === 'occupied').length,
      reserved: slots.filter(s => s.status === 'reserved').length
    };

    return res.status(200).json({ location, slots, slotSummary });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PATCH /api/parking/:id/status  (admin/edge)
const updateLotStatus = async (req, res) => {
  const { status, availableSlots } = req.body;
  const validStatuses = ['available', 'full', 'reserved'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const update = {};
    if (status) update.status = status;
    if (availableSlots !== undefined) update.availableSlots = availableSlots;

    const location = await ParkingLocation.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    if (!location) return res.status(404).json({ error: 'Location not found' });

    // Emit via Socket.IO
    if (req.io) {
      req.io.to(req.params.id).emit('lot:status', {
        locationId: req.params.id,
        status: location.status,
        availableSlots: location.availableSlots
      });
      req.io.emit('dashboard:refresh');
    }

    return res.status(200).json({ location });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const createLocation = async (req, res) => {
  try {
    const locationData = { ...req.body };
    if (!locationData.edgeServerId || locationData.edgeServerId.trim() === '') {
      locationData.edgeServerId = `EDGE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    const location = await ParkingLocation.create(locationData);
    // Create slots if totalSlots provided
    if (location.totalSlots > 0) {
      const slots = [];
      for (let i = 1; i <= location.totalSlots; i++) {
        const col = String.fromCharCode(65 + Math.floor((i - 1) / 10));
        const num = ((i - 1) % 10) + 1;
        slots.push({
          locationId: location._id,
          slotLabel: `${col}${num}`,
          status: 'empty',
          polygonCoords: []
        });
      }
      await ParkingSlot.insertMany(slots);
    }
    if (req.io) req.io.emit('dashboard:refresh');
    return res.status(201).json({ location });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PUT /api/parking/:id  (admin)
const updateLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!location) return res.status(404).json({ error: 'Location not found' });
    if (req.io) req.io.emit('dashboard:refresh');
    return res.status(200).json({ location });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// DELETE /api/parking/:id  (admin)
const deleteLocation = async (req, res) => {
  try {
    await ParkingLocation.findByIdAndDelete(req.params.id);
    await ParkingSlot.deleteMany({ locationId: req.params.id });
    if (req.io) req.io.emit('dashboard:refresh');
    return res.status(200).json({ message: 'Location deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  updateLotStatus,
  createLocation,
  updateLocation,
  deleteLocation
};
