require('dotenv').config({ override: true });

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

const http = require('http');
// Trigger restart for nodemon (updated)
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const platformRoutes = require('./routes/platform.routes');
const roomRoutes = require('./routes/room.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const aiRoutes = require('./routes/ai.routes');
const problemRoutes = require('./routes/problem.routes');
const duelRoutes = require('./routes/duel.routes');
const quizRoutes = require('./routes/quiz.routes');

// Connect to database
// Note: We only connect if MONGO_URI is set, to avoid crashing if it's not set up yet
if (process.env.MONGO_URI && process.env.MONGO_URI !== 'your_mongodb_atlas_uri_here') {
  connectDB();
} else {
  console.log('MongoDB connection skipped: MONGO_URI not configured properly in .env');
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'devarena',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('DevArena API is running. Visit /api/health to check health status.');
});
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/quiz', quizRoutes);

const initSocket = require('./socket');

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
    console.warn('WARNING: JDoodle credentials not configured in environment. Secure execution service will fail closed.');
  } else {
    console.log('JDoodle secure code execution service successfully configured.');
  }
});
