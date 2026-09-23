const path = require('path');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

process.on('uncaughtException', (err) => {
  console.warn('[Process] Uncaught Exception caught safely:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Unhandled Rejection caught safely:', reason && (reason.message || reason));
});

const connectDB = require('./db');
const migrateData = require('./src/utils/migrateData');
const authRoutes = require('./src/routes/authRoutes');
const foodRoutes = require('./src/routes/foodRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const orderService = require('./src/services/orderService');
const dataStore = require('./src/storage/dataStore');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/docs/swaggerSpec');

const app = express();
const PORT = process.env.PORT || 5001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || '2d8c514adc81802ac3aeb0339ae905060021acc30a101f2177316f2bae88e950';

// Ensure upload directories exist
const qrDir = path.join(__dirname, 'uploads/qr');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
}

let io = null;
function getIO() {
  return io;
}


// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files for Admin Dashboard and Uploads (Dishes & QR images)
app.get('/admin/styles.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'public/admin/styles.css'));
});
app.get('/admin/bundle.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'public/admin/bundle.css'));
});
app.get('/admin/bundle.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public/admin/bundle.js'));
});
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Robust multi-source image search (Live Web Search + Wikimedia + Curated Directory + Circuit-breaker)
const { searchOfficerImages, proxyImageStream } = require('./src/services/officerImageService');

const handleOfficerSearch = async (req, res) => {
  const name = (req.query?.name || req.body?.name || '').trim();
  const type = (req.query?.type || req.body?.type || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Officer name is required' });
  }

  try {
    const searchRes = await searchOfficerImages(name, {
      type,
      apiKey: SERPAPI_KEY
    });
    res.json(searchRes);
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
app.get('/api/search-officer', handleOfficerSearch);
app.post('/api/search-officer', handleOfficerSearch);

// Safe image proxy endpoint for cross-origin or referrer-restricted officer portraits
app.get('/api/image-proxy', (req, res) => {
  const imgUrl = req.query?.url;
  if (!imgUrl) {
    return res.status(400).json({ error: 'Missing image URL' });
  }
  proxyImageStream(imgUrl, res);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes); // Versioned alias
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Programmatic Catalog of All APIs
const getAllApis = (req, res) => {
  const apis = [];
  for (const [pathKey, pathObj] of Object.entries(swaggerSpec.paths)) {
    for (const [method, details] of Object.entries(pathObj)) {
      apis.push({
        method: method.toUpperCase(),
        path: pathKey,
        tag: details.tags ? details.tags[0] : 'General',
        summary: details.summary || '',
        description: details.description || '',
        authRequired: !!(details.security && details.security.length > 0)
      });
    }
  }
  res.json({
    success: true,
    totalApis: apis.length,
    apis
  });
};

app.get('/api/docs/apis', getAllApis);
app.get('/api/apis', getAllApis);

// Raw OpenAPI 3.0 JSON Specification
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Swagger Interactive API Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'IAS Officers Canteen API Docs | Government of India',
  customCss: '.swagger-ui .topbar { background-color: #0a3d31; } .swagger-ui .topbar .topbar-wrapper img { content: url("https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"); width: 40px; }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true
  }
}));

// Admin React SPA direct entry and wildcard routing for all dedicated pages
// (/admin/dashboard, /admin/food-menu, /admin/orders, /admin/whatsapp, /admin/officers, /admin/reports)
app.get(/^\/admin(?:\/(?!.*\.[a-zA-Z0-9]+$).*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Root Health & System Status
app.get('/', async (req, res) => {
  const dbStatusMap = {
    0: 'Disconnected (Fallback to Local JSON Store)',
    1: 'Connected (MongoDB Active)',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  let stats = {};
  try {
    stats = await orderService.getAdminStats();
  } catch {
    stats = dataStore.getAdminStats();
  }

  res.json({
    message: 'Government Canteen Services Restaurant Backend is active',
    port: PORT,
    database: dbStatusMap[mongoose.connection.readyState] || 'MongoDB Active',
    storage: mongoose.connection.readyState === 1 ? 'MongoDB Primary Database Engine' : 'Local JSON Storage Engine Active',
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

async function startServer() {
  // Connect to MongoDB and synchronize existing data
  const isConnected = await connectDB();
  if (isConnected) {
    await migrateData();
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  CANTEEN SERVICES BACKEND ACTIVE ON PORT ${PORT}      `);
    console.log(`  Database Status: ${mongoose.connection.readyState === 1 ? 'MongoDB Connected (Active)' : 'Local JSON Store (Fallback)'}`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/admin       `);
    console.log(`  Food Menu API:   http://localhost:${PORT}/api/foods   `);
    console.log(`  Orders API:      http://localhost:${PORT}/api/orders  `);
    console.log(`  WhatsApp & QR:   http://localhost:${PORT}/api/whatsapp`);
    console.log(`  Officer Search:  http://localhost:${PORT}/search-officer`);
    console.log(`  Swagger API Docs: http://localhost:${PORT}/api/docs   `);
    console.log(`  OpenAPI JSON:    http://localhost:${PORT}/api/docs.json`);
    console.log(`  All APIs JSON:   http://localhost:${PORT}/api/docs/apis`);
    console.log(`=======================================================`);
  });
  // Initialize Socket.io for Kitchen Order Ticket (KOT) delivery
  const { Server: SocketIOServer } = require('socket.io');
  io = new SocketIOServer(server, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected to live order feed:', socket.id);
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
}

startServer();

module.exports = { app, get io() { return io; }, getIO };

