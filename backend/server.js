require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { initializeDatabase } = require('./src/database');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const io = new Server(server, { cors: { origin: FRONTEND_URL, credentials: true } });

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/events', require('./src/routes/events'));

// Health
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React frontend (production build)
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// WebSocket
io.on('connection', (socket) => {
  socket.on('join-event', (eventId) => socket.join(`event:${eventId}`));
  socket.on('challenge-completed', (data) => io.to(`event:${data.eventId}`).emit('leaderboard-update', data));
  socket.on('new-connection', (data) => io.to(`event:${data.eventId}`).emit('connection-made', data));
});

app.set('io', io);

const PORT = process.env.PORT || 3001;

initializeDatabase();
server.listen(PORT, '0.0.0.0', () => console.log(`ConnectQuest running on port ${PORT}`));
