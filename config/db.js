// config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ FATAL ERROR: MONGODB_URI is not defined in .env file');
      process.exit(1); // Exit the application if DB connection string is missing
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB; // Export the function to be used in server.js