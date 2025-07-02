import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import userRoutes from './routes/user.routes';
import skillRoutes from './routes/skill.routes';
import connectionRoutes from './routes/connection.routes';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authenticateToken } from './middleware/auth';

// Load environment variables
dotenv.config();

// Debug: Check if JWT_SECRET is loaded
console.log('🔍 Environment Check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('PORT:', process.env.PORT || '3000 (default)');

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required in .env file');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SkillSwap Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/connections', connectionRoutes);

// Create HTTP server and Socket.IO server
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map to track online users: userId -> socketId
const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  // Listen for user identification
  socket.on('identify', (userId: string) => {
    onlineUsers.set(userId, socket.id);
  });

  // Listen for chat messages
  socket.on('chat message', async (data) => {
    // data: { senderId, recipientId, content }
    const { senderId, recipientId, content } = data;
    // Save to DB (reuse your Message model)
    try {
      const { Message } = await import('./models/Message');
      const message = await Message.create({ sender: senderId, recipient: recipientId, content });
      // Emit to recipient if online
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('chat message', {
          _id: message._id,
          sender: senderId,
          recipient: recipientId,
          content,
          createdAt: message.createdAt,
        });
      }
      // Optionally, emit to sender for confirmation
      socket.emit('chat message', {
        _id: message._id,
        sender: senderId,
        recipient: recipientId,
        content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      socket.emit('error', { error: 'Failed to send message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /health',
      'POST /api/users/register',
      'POST /api/users/login',
      'POST /api/users/google-login',
      'GET /api/users',
      'GET /api/users/:id',
      'PUT /api/users/:id',
      'GET /api/users/search/by-skill',
      'POST /api/skills',
      'GET /api/skills',
      'GET /api/skills/:id',
      'PUT /api/skills/:id',
      'DELETE /api/skills/:id',
      'POST /api/connections/send',
      'GET /api/connections/pending',
      'PUT /api/connections/:connectionId/accept',
      'PUT /api/connections/:connectionId/reject',
      'GET /api/connections/accepted',
      'GET /api/connections/all',
      'DELETE /api/connections/:connectionId/cancel',
      'DELETE /api/connections/:connectionId/remove',
      'GET /api/connections/status/:userId'
    ]
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired'
    });
    return;
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
