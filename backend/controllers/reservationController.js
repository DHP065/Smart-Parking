const { v4: uuidv4 } = require('uuid');
const Reservation = require('../models/Reservation');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingSlot = require('../models/ParkingSlot');

// POST /api/reservations
const createReservation = async (req, res) => {
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  try {
    const location = await ParkingLocation.findById(locationId);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    if (location.status === 'full') {
      return res.status(400).json({ error: 'Parking lot is full' });
    }

    // Check if user already has active reservation here
    const existing = await Reservation.findOne({
      userId: req.user._id,
      locationId,
      status: 'active'
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have an active reservation at this location' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const qrToken = uuidv4();

    // Assign a random empty slot
    const slot = await ParkingSlot.findOneAndUpdate(
      { locationId, status: 'empty' },
      { status: 'reserved', lastUpdated: now },
      { new: true }
    );

    if (!slot) {
      return res.status(400).json({ error: 'No empty slots available right now' });
    }

    const reservation = await Reservation.create({
      userId: req.user._id,
      locationId,
      slotId: slot._id,
      qrToken,
      status: 'active',
      reservedAt: now,
      expiresAt
    });

    // Decrement available slots
    const newAvailable = Math.max(0, location.availableSlots - 1);
    const newStatus = newAvailable === 0 ? 'full' : 'available';
    await ParkingLocation.findByIdAndUpdate(locationId, {
      availableSlots: newAvailable,
      status: newStatus
    });

    // Emit real-time update globally
    if (req.io) {
      req.io.to(locationId.toString()).emit('slot:update', {
        locationId: locationId.toString(),
        slotId: slot._id.toString(),
        slotLabel: slot.slotLabel,
        status: 'reserved'
      });
      req.io.emit('lot:status', {
        locationId,
        status: newStatus,
        availableSlots: newAvailable
      });
      req.io.emit('dashboard:refresh');
    }

    return res.status(201).json({ reservation });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/reservations/my
const getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.user._id })
      .populate('locationId', 'name address')
      .sort({ reservedAt: -1 });
    return res.status(200).json({ reservations });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/reservations/verify  (edge)
const verifyQR = async (req, res) => {
  const { qrToken, locationId } = req.body;
  if (!qrToken) return res.status(400).json({ error: 'qrToken is required' });

  try {
    const reservation = await Reservation.findOne({ qrToken })
      .populate('userId', 'displayName email')
      .populate('locationId', 'name')
      .populate('slotId');

    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    
    // Add location validation
    if (locationId && reservation.locationId._id.toString() !== locationId) {
      return res.status(400).json({ error: 'Wrong location. This reservation is for a different parking lot.' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ error: `Reservation is ${reservation.status}`, reservation });
    }

    const now = new Date();
    if (reservation.expiresAt < now) {
      await Reservation.findByIdAndUpdate(reservation._id, { status: 'expired' });
      return res.status(400).json({ error: 'Reservation has expired' });
    }

    const exitQrToken = uuidv4();

    await Reservation.findByIdAndUpdate(reservation._id, {
      status: 'used',
      arrivedAt: now,
      exitQrToken
    });

    if (reservation.slotId) {
      await ParkingSlot.findByIdAndUpdate(reservation.slotId._id, { status: 'occupied', lastUpdated: now });
      if (req.io) {
        req.io.to(reservation.locationId._id.toString()).emit('slot:update', {
           locationId: reservation.locationId._id.toString(),
           slotId: reservation.slotId._id.toString(),
           slotLabel: reservation.slotId.slotLabel,
           status: 'occupied'
        });
      }
    }

    if (req.io) {
      req.io.emit('dashboard:refresh');
    }

    return res.status(200).json({ 
      message: 'Reservation verified successfully', 
      reservation,
      exitQrToken,
      slotLabel: reservation.slotId?.slotLabel 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/reservations/verify-exit  (edge)
const verifyExitQR = async (req, res) => {
  const { exitQrToken, locationId } = req.body;
  if (!exitQrToken) return res.status(400).json({ error: 'exitQrToken is required' });

  try {
    const reservation = await Reservation.findOne({ exitQrToken, status: 'used' })
      .populate('userId', 'displayName email')
      .populate('locationId', 'name totalSlots');

    if (!reservation) return res.status(404).json({ error: 'Valid active reservation not found for this exit token' });

    // Add location validation
    if (locationId && reservation.locationId._id.toString() !== locationId) {
      return res.status(400).json({ error: 'Wrong location. This reservation is for a different parking lot.' });
    }

    // Mark as completed
    await Reservation.findByIdAndUpdate(reservation._id, { status: 'completed' });

    // Free the slot
    let slotLabel = 'Unknown';
    if (reservation.slotId) {
      const slot = await ParkingSlot.findByIdAndUpdate(
        reservation.slotId, 
        { status: 'empty', lastUpdated: new Date() }, 
        { new: true }
      );
      if (slot) {
          slotLabel = slot.slotLabel;
          if (req.io) {
             req.io.to(reservation.locationId._id.toString()).emit('slot:update', {
                locationId: reservation.locationId._id.toString(),
                slotId: slot._id.toString(),
                slotLabel: slot.slotLabel,
                status: 'empty'
             });
          }
      }
    }

    // Increment available slots for location
    const location = await ParkingLocation.findById(reservation.locationId._id);
    if (location) {
      const newAvailable = Math.min(location.availableSlots + 1, location.totalSlots);
      await ParkingLocation.findByIdAndUpdate(location._id, {
        availableSlots: newAvailable,
        status: 'available'
      });

      if (req.io) {
        req.io.emit('lot:status', {
          locationId: location._id.toString(),
          status: 'available',
          availableSlots: newAvailable
        });
        req.io.emit('dashboard:refresh');
      }
    }

    return res.status(200).json({ message: 'Exit approved', slotLabel });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PATCH /api/reservations/:id/cancel
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    // Only owner or admin can cancel
    if (
      reservation.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ error: 'Only active reservations can be cancelled' });
    }

    await Reservation.findByIdAndUpdate(req.params.id, { status: 'cancelled' });

    // Free the slot if it was reserved
    if (reservation.slotId) {
      const slot = await ParkingSlot.findByIdAndUpdate(reservation.slotId, { status: 'empty', lastUpdated: new Date() }, { new: true });
      if (slot && req.io) {
        req.io.to(reservation.locationId.toString()).emit('slot:update', {
           locationId: reservation.locationId.toString(),
           slotId: slot._id.toString(),
           slotLabel: slot.slotLabel,
           status: 'empty'
        });
      }
    }

    // Restore available slot count
    const location = await ParkingLocation.findById(reservation.locationId);
    if (location) {
      const newAvailable = Math.min(location.availableSlots + 1, location.totalSlots);
      await ParkingLocation.findByIdAndUpdate(reservation.locationId, {
        availableSlots: newAvailable,
        status: 'available'
      });

      // Emit real-time update globally
      if (req.io) {
        req.io.emit('lot:status', {
          locationId: reservation.locationId.toString(),
          status: 'available',
          availableSlots: newAvailable
        });
        req.io.emit('dashboard:refresh');
      }
    } else if (req.io) {
      req.io.emit('dashboard:refresh');
    }

    return res.status(200).json({ message: 'Reservation cancelled' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/reservations/all  (admin)
const getAllReservations = async (req, res) => {
  try {
    const { status, locationId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (locationId) query.locationId = locationId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Reservation.countDocuments(query);
    const reservations = await Reservation.find(query)
      .populate('userId', 'displayName email')
      .populate('locationId', 'name address')
      .sort({ reservedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({ reservations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/reservations/stats  (admin)
const getReservationStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyStats = await Reservation.aggregate([
      {
        $match: { reservedAt: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$reservedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const statusCounts = await Reservation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return res.status(200).json({ dailyStats, statusCounts });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  verifyQR,
  verifyExitQR,
  cancelReservation,
  getAllReservations,
  getReservationStats
};
