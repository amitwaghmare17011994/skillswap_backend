import express, { RequestHandler } from 'express';
import {
  sendConnectionRequest,
  getPendingRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getAcceptedConnections,
  getAllConnectionRequests,
  cancelConnectionRequest,
  removeConnection,
  getConnectionStatus,
} from '../controllers/connection.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 🔒 All connection routes require authentication
router.use(authenticateToken);

// 📤 Send connection request
router.post('/send', sendConnectionRequest as RequestHandler);

// 📥 Get pending connection requests
router.get('/pending', getPendingRequests as RequestHandler);

// ✅ Accept connection request
router.put('/:connectionId/accept', acceptConnectionRequest as RequestHandler);

// ❌ Reject connection request
router.put('/:connectionId/reject', rejectConnectionRequest as RequestHandler);

// 🔗 Get accepted connections
router.get('/accepted', getAcceptedConnections as RequestHandler);

// 📋 Get all connection requests (sent and received)
router.get('/all', getAllConnectionRequests as RequestHandler);

// 🚫 Cancel connection request (requester only)
router.delete('/:connectionId/cancel', cancelConnectionRequest as RequestHandler);

// 🗑️ Remove accepted connection
router.delete('/:connectionId/remove', removeConnection as RequestHandler);

// 🔍 Get connection status with specific user
router.get('/status/:userId', getConnectionStatus as RequestHandler);

export default router; 