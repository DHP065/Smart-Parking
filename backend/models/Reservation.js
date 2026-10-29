const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLocation',
    required: true
  },
  qrToken: { type: String, required: true, unique: true },
  exitQrToken: { type: String, sparse: true, unique: true },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSlot'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'used', 'completed', 'cancelled'],
    default: 'active'
  },
  reservedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  arrivedAt: { type: Date }
});

module.exports = mongoose.model('Reservation', reservationSchema);
