const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function syncDb() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ias_canteen');
  const Food = mongoose.model('Food', new mongoose.Schema({}, { strict: false }));
  
  await Food.updateOne({ name: 'Silver Grand Dining Buffet' }, { $set: { image: '/ias-images/Silver%20Grand%20Dining%20Buffet.jpg' } });
  await Food.updateOne({ name: 'Gold Executive Buffet Spread' }, { $set: { image: '/ias-images/Gold%20Executive%20Buffet%20Spread.jpg' } });
  await Food.updateOne({ name: 'Platinum Royal VIP Buffet' }, { $set: { image: '/ias-images/Platinum%20Royal%20VIP%20Buffet.jpg' } });
  await Food.updateOne({ name: 'Special Staff Dining Buffet' }, { $set: { image: '/ias-images/Special%20Staff%20Dining%20Buffet.jpg' } });

  const all = await Food.find();
  const unsplash = all.filter(f => (f.image || '').includes('unsplash'));
  console.log('MongoDB total foods:', all.length, 'Remaining Unsplash in DB:', unsplash.length);
  await mongoose.disconnect();
}
syncDb();
