const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../db');
const User = require('../src/models/User');

async function run() {
  await connectDB();
  const res = await User.updateMany({}, { $set: { isOfficial: true } });
  console.log('Successfully marked all existing users as isOfficial: true. Result:', res);

  const users = await User.find({});
  console.log('Current users:', users.map(u => ({ id: u._id, name: u.name, phone: u.phone, isOfficial: u.isOfficial })));
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
