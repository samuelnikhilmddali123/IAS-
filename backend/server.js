const path = require('path');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./db');
const authRoutes = require('./src/routes/authRoutes');
const foodRoutes = require('./src/routes/foodRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const dataStore = require('./src/storage/dataStore');

const app = express();
const PORT = process.env.PORT || 5001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || '2d8c514adc81802ac3aeb0339ae905060021acc30a101f2177316f2bae88e950';

// Ensure upload directories exist
const qrDir = path.join(__dirname, 'uploads/qr');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files for Admin Dashboard and Uploads (Dishes & QR images)
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attempt MongoDB connection (graceful fallback if offline)
connectDB();

// SerpApi Google Images search proxy
function fetchSerpApiGoogleImages(query) {
  return new Promise((resolve, reject) => {
    const apiUrl =
      'https://serpapi.com/search.json?engine=google_images&q=' +
      encodeURIComponent(query + ' IAS officer') +
      '&api_key=' +
      SERPAPI_KEY +
      '&num=10';

    https
      .get(apiUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.images_results || []);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

const handleOfficerSearch = async (req, res) => {
  const name = (req.query.name || req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Officer name is required' });
  }

  try {
    const rawImages = await fetchSerpApiGoogleImages(name);
    const results = rawImages.slice(0, 10).map((img, idx) => ({
      id: `google-img-${idx}`,
      thumbnail: img.thumbnail,
      original: img.original,
      title: img.title || `${name} (IAS)`,
      source: img.source || 'Google Images',
      link: img.link,
    }));

    res.json({
      success: true,
      name,
      images: results,
    });
  } catch (error) {
    console.error('Error fetching officer photos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch officer photos',
      error: error.message,
    });
  }
};

app.get('/search-officer', handleOfficerSearch);
app.post('/search-officer', handleOfficerSearch);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes); // Versioned alias
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Admin Web App direct entry
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Root Health & System Status
app.get('/', (req, res) => {
  const dbStatusMap = {
    0: 'Disconnected (Using Local JSON Storage Engine)',
    1: 'Connected (MongoDB Active)',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  const stats = dataStore.getAdminStats();
  res.json({
    message: 'Government Canteen Services Restaurant Backend is active',
    port: PORT,
    database: dbStatusMap[mongoose.connection.readyState] || 'Local JSON Storage Engine Active',
    storage: 'Dual-Layer Store (Mongoose + backend/data/ JSON)',
    adminDashboard: `http://localhost:${PORT}/admin`,
    metrics: stats,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  CANTEEN SERVICES BACKEND ACTIVE ON PORT ${PORT}      `);
  console.log(`  Admin Dashboard: http://localhost:${PORT}/admin       `);
  console.log(`  Food Menu API:   http://localhost:${PORT}/api/foods   `);
  console.log(`  Orders API:      http://localhost:${PORT}/api/orders  `);
  console.log(`  WhatsApp & QR:   http://localhost:${PORT}/api/whatsapp`);
  console.log(`  Officer Search:  http://localhost:${PORT}/search-officer`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n=======================================================');
    console.error('⚠️  PORT ' + PORT + ' IS ALREADY IN USE!');
    console.error('   The backend server is ALREADY running on port ' + PORT + '.');
    console.error('   If you want to restart it, stop the existing process first:');
    console.error('   Run: netstat -ano | findstr ' + PORT + ' and taskkill /F /PID <pid>');
    console.error('=======================================================\n');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
