import express, { RequestHandler } from 'express';
import { sendMessage, getMessages } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Send a message
router.post('/send', authenticateToken, sendMessage as RequestHandler);
// Get all messages between authenticated user and another user
router.get('/:userId', authenticateToken, getMessages as RequestHandler);

export default router; 