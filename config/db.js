// backend/config/db.js
// Handles MongoDB connection via Mongoose

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ does not require these options, but kept for clarity
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    // Log connection events for observability
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnect…');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅  MongoDB reconnected');
    });
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit process on failure — let PM2 / Docker restart it
  }
};

module.exports = connectDB;
