const mongoose = require('mongoose');

const imageCacheSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  images: [{
    id: String,
    thumbnail: String,
    original: String,
    title: String,
    source: String,
    link: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ImageCache', imageCacheSchema);
