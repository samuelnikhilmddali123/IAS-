const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../db');

async function resetAllData() {
  console.log('--- Starting Database and Data Files Reset ---');

  // 1. Connect to MongoDB
  const connected = await connectDB();
  if (connected) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Found MongoDB collections:', collections.map(c => c.name));

    for (const col of collections) {
      const colName = col.name;
      // DO NOT delete foods or food items
      if (colName.toLowerCase().includes('food')) {
        console.log(`[KEEP] Preserving food collection: ${colName}`);
        continue;
      }

      if (colName.toLowerCase().includes('admin')) {
        console.log(`[KEEP] Preserving admin collection or keeping default: ${colName}`);
        continue;
      }

      console.log(`[RESET] Dropping/Clearing collection: ${colName}`);
      await mongoose.connection.db.collection(colName).deleteMany({});
      console.log(`[CLEARED] ${colName} is now empty.`);
    }
    console.log('MongoDB reset completed.');
  } else {
    console.warn('Could not connect to MongoDB, skipping Mongo operations.');
  }

  // 2. Reset JSON files in backend/data/
  const dataDir = path.join(__dirname, '../data');
  const filesToEmpty = [
    'users.json',
    'orders.json',
    'qr_tokens.json',
    'email_outbox.json',
    'whatsapp_outbox.json'
  ];

  for (const file of filesToEmpty) {
    const filePath = path.join(dataDir, file);
    fs.writeFileSync(filePath, '[]\n', 'utf8');
    console.log(`[CLEARED JSON] ${file} reset to []`);
  }

  console.log('Food data (foods.json and MongoDB foods collection) was untouched and preserved.');
  console.log('--- Database and Data Reset Successfully Completed ---');
  process.exit(0);
}

resetAllData().catch(err => {
  console.error('Error during reset:', err);
  process.exit(1);
});
