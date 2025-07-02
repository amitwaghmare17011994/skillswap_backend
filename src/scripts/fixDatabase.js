const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabaseIndexes() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List all indexes
    console.log('📋 Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log('-', index.name, ':', index.key);
    });

    // Drop the problematic username index if it exists
    const usernameIndex = indexes.find(index => 
      index.key && index.key.username !== undefined
    );

    if (usernameIndex) {
      console.log('🗑️ Dropping username index:', usernameIndex.name);
      await usersCollection.dropIndex(usernameIndex.name);
      console.log('✅ Username index dropped successfully');
    } else {
      console.log('ℹ️ No username index found');
    }

    // Recreate proper indexes based on current schema
    console.log('🔧 Recreating proper indexes...');
    
    // Create unique index on email
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Email index created');

    // Create unique index on uid
    await usersCollection.createIndex({ uid: 1 }, { unique: true });
    console.log('✅ UID index created');

    // List final indexes
    console.log('📋 Final indexes:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(index => {
      console.log('-', index.name, ':', index.key);
    });

    console.log('🎉 Database indexes fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing database indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the fix
fixDatabaseIndexes(); 