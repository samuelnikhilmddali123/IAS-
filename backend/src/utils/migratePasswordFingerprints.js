const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generatePasswordFingerprint } = require('./cryptoUtils');
const dataStore = require('../storage/dataStore');

async function migratePasswordFingerprints() {
  console.log('[Migration] Starting password uniqueness fingerprint migration...');
  const User = require('../models/User');

  if (mongoose.connection.readyState !== 1) {
    console.log('[Migration] MongoDB not connected, running in-memory/JSON migration.');
  }

  // 1. Process MongoDB users if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const users = await User.find({});
      const usedFingerprints = new Set();

      // Predefined unique default passwords for demo accounts
      const uniquePassMap = {
        '9999912345': '123456',
        '8885441222': '888544',
        '88854 41222': '888544',
        '8099667999': '809966',
        '9908178198': '990817',
        '9811122233': '654321',
        '9810012345': '981001',
        '9855544433': '112233',
        '8978765897': '1234',
        '9440451648': '944045'
      };

      for (const u of users) {
        const cleanPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
        let plainPass = uniquePassMap[u.phone] || uniquePassMap[cleanPhone] || u.pin || '123456';
        let fp = generatePasswordFingerprint(plainPass);

        // Ensure uniqueness if collision occurs
        let saltCounter = 1;
        while (usedFingerprints.has(fp)) {
          plainPass = `${plainPass}${saltCounter}`;
          fp = generatePasswordFingerprint(plainPass);
          saltCounter++;
        }
        usedFingerprints.add(fp);

        const hashed = await bcrypt.hash(plainPass, 10);
        u.password = hashed;
        u.pin = plainPass;
        u.passwordUniquenessFingerprint = fp;
        await u.save();
        console.log(`[Migration] Updated user ${u.name} (${u.phone}) with unique fingerprint.`);
      }

      // Ensure index is created
      try {
        await User.collection.createIndex({ passwordUniquenessFingerprint: 1 }, { unique: true, sparse: true });
        console.log('[Migration] Successfully created unique index on passwordUniquenessFingerprint in MongoDB.');
      } catch (idxErr) {
        console.warn('[Migration] Index creation note:', idxErr.message);
      }
    } catch (e) {
      console.error('[Migration] Error migrating MongoDB users:', e.message);
    }
  }

  // 2. Synchronize to dataStore
  try {
    const jsonUsers = dataStore.getUsers ? dataStore.getUsers() : [];
    if (Array.isArray(jsonUsers)) {
      const usedFp = new Set();
      const updated = jsonUsers.map(u => {
        let plain = u.pin || '123456';
        let fp = generatePasswordFingerprint(plain);
        let count = 1;
        while (usedFp.has(fp)) {
          plain = `${plain}${count}`;
          fp = generatePasswordFingerprint(plain);
          count++;
        }
        usedFp.add(fp);
        return {
          ...u,
          pin: plain,
          passwordUniquenessFingerprint: fp
        };
      });
      // Save back to JSON
      const fs = require('fs');
      const path = require('path');
      const usersPath = path.join(__dirname, '../../data/users.json');
      fs.writeFileSync(usersPath, JSON.stringify(updated, null, 2), 'utf-8');
      console.log('[Migration] Updated users.json with unique password fingerprints.');
    }
  } catch (err) {
    console.warn('[Migration] Warning updating users.json:', err.message);
  }

  console.log('[Migration] Password fingerprint migration complete.');
}

module.exports = migratePasswordFingerprints;

if (require.main === module) {
  const connectDB = require('../../db');
  connectDB().then(() => {
    migratePasswordFingerprints().then(() => {
      process.exit(0);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  });
}
