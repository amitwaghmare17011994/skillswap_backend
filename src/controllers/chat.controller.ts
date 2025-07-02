import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Message } from '../models/Message';
import { User } from '../models/User';

// Send a message
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user.id;
    const { recipientId, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Ensure both users exist
    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findById(recipientId)
    ]);
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content: content.trim(),
    });
    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get all messages between authenticated user and another user
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email')
      .populate('recipient', 'name email');
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 