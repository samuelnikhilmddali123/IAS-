const mongoose = require('mongoose');

async function migrateData() {
  // MongoDB is the exclusive database. JSON migration is retired.
  return;
}

module.exports = migrateData;
