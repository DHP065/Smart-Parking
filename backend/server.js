require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cron = require('node-cron');

const { registerSlotEvents, checkExpiredReservations } = require('./socket/slotEvents');

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
// Initialize Firebase Admin (only if real credentials are provided)
if (process.env.FIREBASE_PROJECT_ID !== 'your-firebase-project-id') {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace actual \n text with newlines if it comes through as a string from .env
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
    console.log('Firebase Admin initialized.');
  } catch (err) {
    console.error('Firebase Admin initialization error:', err);
  }
} else {
  console.log('Running without Firebase Admin initialized (Mock mode)');
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Register Socket.IO event handlers
registerSlotEvents(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const slotsRoutes = require('./routes/slots');
const reservationsRoutes = require('./routes/reservations');
const edgeRoutes = require('./routes/edge');

app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/edge', edgeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Cron Job: Expire Reservations Every 30 Seconds ──────────────────────────
cron.schedule('*/30 * * * * *', async () => {
  await checkExpiredReservations(io);
});

// ─── MongoDB + Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[MongoDB] Connected successfully');
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Socket.IO] Listening for connections`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
