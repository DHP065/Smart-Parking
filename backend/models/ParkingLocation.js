const mongoose = require('mongoose');

const cameraFeedSchema = new mongoose.Schema({
  id: String,
  label: String,
  streamUrl: String
});

const parkingLocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  totalSlots: { type: Number, required: true, default: 0 },
  availableSlots: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['available', 'full', 'reserved'],
    default: 'available'
  },
  edgeServerId: { type: String, default: '' },
  hourlyFee: { type: Number, default: 0 },
  cameraFeeds: [cameraFeedSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParkingLocation', parkingLocationSchema);
