import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Global test setup
beforeAll(async () => {
  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Test database disconnection failed:', error);
  }
});

// Clean up database between tests
beforeEach(async () => {
  try {
    // Get all collections
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️ Database not connected, skipping cleanup');
      return;
    }
    
    const collections = await db.collections();
    
    // Clear all collections
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
}); 