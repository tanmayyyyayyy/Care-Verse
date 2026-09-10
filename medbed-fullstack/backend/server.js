// backend/server.js
// Main entry point — Express app + Socket.IO + MongoDB

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');

const connectDB           = require('./config/db');
const { initSockets }     = require('./sockets/socketManager');
const { errorHandler }    = require('./middleware/errorHandler');

// ── Route imports ────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/authRoutes');
const patientRoutes   = require('./routes/patientRoutes');
const transferRoutes  = require('./routes/transferRoutes');
const alertRoutes     = require('./routes/alertRoutes');
const hospitalRoutes  = require('./routes/hospitalRoutes');
const { initBedSensorEmitter } = require('./sockets/bedSensorEmitter');

// ── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow the frontend origin
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5502",
    "http://localhost:5502",
    "http://localhost:5002",
    "http://127.0.0.1:5002"
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Request logging (dev only)
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static frontend files ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.redirect('/index.html');
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/patients',   patientRoutes);
app.use('/api/transfers',  transferRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/hospitals',  hospitalRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MedBed OS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (!req.originalUrl.startsWith('/api')) {
    return res.redirect('/login.html');
  }
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── HTTP server + Socket.IO ──────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5502",
      "http://localhost:5502",
      "http://localhost:5002",
      "http://127.0.0.1:5002"
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Make io accessible inside controllers via req.app.get('io')
app.set('io', io);

// Boot socket handlers
initSockets(io);

initBedSensorEmitter(io);
// ── Start listening ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀  MedBed OS backend running`);
  console.log(`    ➜  API   : http://localhost:${PORT}/api`);
  console.log(`    ➜  Health: http://localhost:${PORT}/api/health`);
  console.log(`    ➜  Mode  : ${process.env.NODE_ENV || 'development'}\n`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled rejection:', err.message);
  httpServer.close(() => process.exit(1));
});
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received — shutting down gracefully');
  httpServer.close(() => process.exit(0));
});
