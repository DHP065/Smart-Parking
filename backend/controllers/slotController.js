const ParkingSlot = require('../models/ParkingSlot');
const ParkingLocation = require('../models/ParkingLocation');

// GET /api/slots/:locationId
const getSlotsByLocation = async (req, res) => {
  try {
    const slots = await ParkingSlot.find({ locationId: req.params.locationId }).sort({ slotLabel: 1 });
    return res.status(200).json({ slots });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PATCH /api/slots/:slotId  (edge)
const updateSlot = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['empty', 'occupied', 'reserved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const slot = await ParkingSlot.findByIdAndUpdate(
      req.params.slotId,
      { status, lastUpdated: new Date() },
      { new: true }
    );
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Recalculate location available slots
    const allSlots = await ParkingSlot.find({ locationId: slot.locationId });
    const emptyCount = allSlots.filter(s => s.status === 'empty').length;

    const locationUpdate = { availableSlots: emptyCount };
    if (emptyCount === 0) locationUpdate.status = 'full';
    else if (emptyCount === allSlots.length) locationUpdate.status = 'available';
    else locationUpdate.status = 'available';

    const location = await ParkingLocation.findByIdAndUpdate(
      slot.locationId,
      locationUpdate,
      { new: true }
    );

    // Emit Socket.IO events
    if (req.io) {
      req.io.to(slot.locationId.toString()).emit('slot:update', {
        locationId: slot.locationId.toString(),
        slotId: slot._id.toString(),
        status: slot.status
      });
      req.io.emit('lot:status', {
        locationId: slot.locationId.toString(),
        status: location.status,
        availableSlots: location.availableSlots
      });
    }

    return res.status(200).json({ slot, location });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/slots/configure  (edge)
const configureSlots = async (req, res) => {
  const { locationId, slots } = req.body;
  if (!locationId || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'locationId and slots array required' });
  }

  try {
    const ops = slots.map(slot => ({
      updateOne: {
        filter: { locationId, slotLabel: slot.slotLabel },
        update: {
          $set: {
            locationId,
            slotLabel: slot.slotLabel,
            polygonCoords: slot.polygonCoords || [],
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    await ParkingSlot.bulkWrite(ops);
    const updatedSlots = await ParkingSlot.find({ locationId });
    return res.status(200).json({ slots: updatedSlots });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { getSlotsByLocation, updateSlot, configureSlots };
