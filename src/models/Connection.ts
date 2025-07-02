import mongoose, { Document, Schema, Model } from 'mongoose';

// Connection Status Enum
export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked'
}

// Connection Type Interface
export interface IConnection extends Document {
  requester: mongoose.Types.ObjectId; // User who sent the request
  recipient: mongoose.Types.ObjectId; // User who receives the request
  status: ConnectionStatus;
  message?: string; // Optional message with the request
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IConnectionModel extends Model<IConnection> {
  getConnection(user1Id: string, user2Id: string): Promise<IConnection | null>;
  getUserConnections(userId: string, status?: ConnectionStatus): Promise<IConnection[]>;
  getPendingRequests(userId: string): Promise<IConnection[]>;
}

// Connection Schema
const connectionSchema: Schema<IConnection> = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ConnectionStatus),
      default: ConnectionStatus.PENDING,
    },
    message: {
      type: String,
      maxlength: 500, // Limit message length
    },
  },
  { 
    timestamps: true,
    // Ensure unique connection between two users
    indexes: [
      { 
        unique: true, 
        fields: { requester: 1, recipient: 1 } 
      }
    ]
  }
);

// Pre-save middleware to prevent self-connection
connectionSchema.pre('save', function(next) {
  if (this.requester.toString() === this.recipient.toString()) {
    return next(new Error('Cannot send connection request to yourself'));
  }
  next();
});

// Virtual for checking if connection is active
connectionSchema.virtual('isActive').get(function() {
  return this.status === ConnectionStatus.ACCEPTED;
});

// Static method to get connections between two users
connectionSchema.statics.getConnection = function(user1Id: string, user2Id: string) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id },
      { requester: user2Id, recipient: user1Id }
    ]
  });
};

// Static method to get all connections for a user
connectionSchema.statics.getUserConnections = function(userId: string, status?: ConnectionStatus) {
  const query: any = {
    $or: [
      { requester: userId },
      { recipient: userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('requester', 'name email photoURL')
    .populate('recipient', 'name email photoURL')
    .sort({ createdAt: -1 });
};

// Static method to get pending requests for a user
connectionSchema.statics.getPendingRequests = function(userId: string) {
  return this.find({ 
    recipient: userId, 
    status: ConnectionStatus.PENDING 
  })
    .populate('requester', 'name email photoURL')
    .sort({ createdAt: -1 });
};

export const Connection = mongoose.model<IConnection, IConnectionModel>('Connection', connectionSchema); 