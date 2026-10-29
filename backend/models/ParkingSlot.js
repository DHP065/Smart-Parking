const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLocation',
    required: true
  },
  slotLabel: { type: String, required: true },
  polygonCoords: [[Number]],
  status: {
    type: String,
    enum: ['empty', 'occupied', 'reserved'],
    default: 'empty'
  },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
