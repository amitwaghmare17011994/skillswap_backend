import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Connection, ConnectionStatus } from '../models/Connection';
import { User } from '../models/User';

// 1. Send Connection Request
export const sendConnectionRequest = async (req: Request, res: Response) => {
  try {
    const { recipientId, message } = req.body;
    const requesterId = req.user._id;

    // Validate recipient ID
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Prevent self-connection
    if (requesterId.toString() === recipientId) {
      return res.status(400).json({ error: 'Cannot send connection request to yourself' });
    }

    // Check if connection already exists
    const existingConnection = await Connection.getConnection(requesterId.toString(), recipientId);
    if (existingConnection) {
      return res.status(400).json({ 
        error: 'Connection already exists',
        status: existingConnection.status 
      });
    }

    // Create connection request
    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      message: message?.trim() || undefined,
    });

    // Populate user details
    await connection.populate('requester', 'name email photoURL');
    await connection.populate('recipient', 'name email photoURL');

    res.status(201).json({
      message: 'Connection request sent successfully',
      connection
    });

  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Connection request already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// 2. Get Pending Connection Requests
export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;

    const pendingRequests = await Connection.getPendingRequests(userId.toString());

    res.json({
      count: pendingRequests.length,
      requests: pendingRequests
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Accept Connection Request
export const acceptConnectionRequest = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id;

    // Validate connection ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Find connection request
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Verify user is the recipient
    if (connection.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only accept requests sent to you' });
    }

    // Check if request is pending
    if (connection.status !== ConnectionStatus.PENDING) {
      return res.status(400).json({ 
        error: 'Connection request is not pending',
        status: connection.status 
      });
    }

    // Accept the request
    connection.status = ConnectionStatus.ACCEPTED;
    await connection.save();

    // Populate user details
    await connection.populate('requester', 'name email photoURL');
    await connection.populate('recipient', 'name email photoURL');

    res.json({
      message: 'Connection request accepted successfully',
      connection
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Reject Connection Request
export const rejectConnectionRequest = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id;

    // Validate connection ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Find connection request
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Verify user is the recipient
    if (connection.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only reject requests sent to you' });
    }

    // Check if request is pending
    if (connection.status !== ConnectionStatus.PENDING) {
      return res.status(400).json({ 
        error: 'Connection request is not pending',
        status: connection.status 
      });
    }

    // Reject the request
    connection.status = ConnectionStatus.REJECTED;
    await connection.save();

    res.json({
      message: 'Connection request rejected successfully',
      connection
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Get All Connections (Accepted)
export const getAcceptedConnections = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;

    const connections = await Connection.getUserConnections(userId.toString(), ConnectionStatus.ACCEPTED);

    res.json({
      count: connections.length,
      connections
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Get All Connection Requests (Sent and Received)
export const getAllConnectionRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    let connections;
    if (status && Object.values(ConnectionStatus).includes(status as ConnectionStatus)) {
      connections = await Connection.getUserConnections(userId.toString(), status as ConnectionStatus);
    } else {
      connections = await Connection.getUserConnections(userId.toString());
    }

    // Separate sent and received requests
    const sentRequests = connections.filter(conn => conn.requester.toString() === userId.toString());
    const receivedRequests = connections.filter(conn => conn.recipient.toString() === userId.toString());

    res.json({
      count: connections.length,
      sent: sentRequests,
      received: receivedRequests,
      all: connections
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Cancel Connection Request (Requester can cancel pending request)
export const cancelConnectionRequest = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id;

    // Validate connection ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Find connection request
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Verify user is the requester
    if (connection.requester.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only cancel requests you sent' });
    }

    // Check if request is pending
    if (connection.status !== ConnectionStatus.PENDING) {
      return res.status(400).json({ 
        error: 'Connection request is not pending',
        status: connection.status 
      });
    }

    // Delete the request
    await Connection.findByIdAndDelete(connectionId);

    res.json({
      message: 'Connection request cancelled successfully'
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Remove Connection (Both users can remove accepted connection)
export const removeConnection = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id;

    // Validate connection ID
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Find connection
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Verify user is part of the connection
    if (connection.requester.toString() !== userId.toString() && 
        connection.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only remove connections you are part of' });
    }

    // Check if connection is accepted
    if (connection.status !== ConnectionStatus.ACCEPTED) {
      return res.status(400).json({ 
        error: 'Connection is not accepted',
        status: connection.status 
      });
    }

    // Delete the connection
    await Connection.findByIdAndDelete(connectionId);

    res.json({
      message: 'Connection removed successfully'
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 9. Get Connection Status with Another User
export const getConnectionStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get connection between users
    const connection = await Connection.getConnection(currentUserId.toString(), userId);

    if (!connection) {
      return res.json({
        status: 'none',
        message: 'No connection exists'
      });
    }

    // Determine the relationship
    let relationship = 'none';
    if (connection.status === ConnectionStatus.ACCEPTED) {
      relationship = 'connected';
    } else if (connection.status === ConnectionStatus.PENDING) {
      if (connection.requester.toString() === currentUserId.toString()) {
        relationship = 'request_sent';
      } else {
        relationship = 'request_received';
      }
    } else if (connection.status === ConnectionStatus.REJECTED) {
      relationship = 'rejected';
    }

    res.json({
      status: connection.status,
      relationship,
      connection
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}; 