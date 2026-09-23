require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const migrateData = require('./src/utils/migrateData');

async function run() {
  try {
    const isConnected = await connectDB();
    if (isConnected) {
      await migrateData();
      console.log('Migration completed successfully.');
    } else {
      console.error('Failed to connect to MongoDB.');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    process.exit(0);
  }
}

run();
