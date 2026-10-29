const Reservation = require('../models/Reservation');
const ParkingLocation = require('../models/ParkingLocation');

/**
 * Register Socket.IO event handlers
 * @param {import('socket.io').Server} io
 */
const registerSlotEvents = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Client joins a room for a specific parking location
    socket.on('join:location', (locationId) => {
      socket.join(locationId);
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${locationId}`);
    });

    // Client leaves a room
    socket.on('leave:location', (locationId) => {
      socket.leave(locationId);
      console.log(`[Socket.IO] Client ${socket.id} left room: ${locationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Check for expired reservations — called by cron job every 30 seconds
 * @param {import('socket.io').Server} io
 */
const checkExpiredReservations = async (io) => {
  try {
    const now = new Date();
    const expiredReservations = await Reservation.find({
      status: 'active',
      expiresAt: { $lt: now }
    });

    for (const reservation of expiredReservations) {
      await Reservation.findByIdAndUpdate(reservation._id, { status: 'expired' });

      // Emit to user's personal room
      io.to(`user:${reservation.userId.toString()}`).emit('reservation:expired', {
        reservationId: reservation._id.toString(),
        userId: reservation.userId.toString()
      });

      // Restore available slot count
      const location = await ParkingLocation.findById(reservation.locationId);
      if (location) {
        const newAvailable = Math.min(location.availableSlots + 1, location.totalSlots);
        const newStatus = 'available';
        await ParkingLocation.findByIdAndUpdate(reservation.locationId, {
          availableSlots: newAvailable,
          status: newStatus
        });

        // Emit lot status update globally
        io.emit('lot:status', {
          locationId: reservation.locationId.toString(),
          status: newStatus,
          availableSlots: newAvailable
        });
      }

      console.log(`[Cron] Reservation ${reservation._id} expired.`);
    }

    if (expiredReservations.length > 0) {
      console.log(`[Cron] Expired ${expiredReservations.length} reservation(s).`);
      io.emit('dashboard:refresh');
    }
  } catch (error) {
    console.error('[Cron] Error checking expired reservations:', error.message);
  }
};

module.exports = { registerSlotEvents, checkExpiredReservations };
