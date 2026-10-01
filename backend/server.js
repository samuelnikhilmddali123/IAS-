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
const { enableWindowsKeepAwake } = require('./src/utils/keepAwake');

// Prevent host computer from sleeping during operational canteen hours
enableWindowsKeepAwake();

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

// Static files for KOT Kitchen Display and Normal Admin Dashboard
const kotPath = path.join(__dirname, 'public/admin/kot');
app.use('/admin/kot', express.static(kotPath));
app.use('/admin/kot', (req, res) => {
  res.sendFile(path.join(kotPath, 'index.html'));
});

// High-performance static caching options for images (30-day browser cache + immutable)
const imageStaticOptions = {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
};

app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), imageStaticOptions));
app.use('/ias-images', express.static(path.join(__dirname, 'public/ias images'), imageStaticOptions));
app.use('/ias%20images', express.static(path.join(__dirname, 'public/ias images'), imageStaticOptions));
app.use('/ias-thumbnails', express.static(path.join(__dirname, 'public/ias-thumbnails'), imageStaticOptions));
app.use('/api/ias-images', express.static(path.join(__dirname, 'public/ias images'), imageStaticOptions));
app.use('/public/ias images', express.static(path.join(__dirname, 'public/ias images'), imageStaticOptions));
app.use('/public/ias-images', express.static(path.join(__dirname, 'public/ias images'), imageStaticOptions));
app.use('/public/ias-thumbnails', express.static(path.join(__dirname, 'public/ias-thumbnails'), imageStaticOptions));
app.use('/public', express.static(path.join(__dirname, 'public'), imageStaticOptions));

// Robust multi-source image search (SerpApi + Live Web Search + Wikimedia + Curated Directory)
const { searchOfficerImages } = require('./src/services/officerImageService');

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

// In-memory cache for fast repeated image delivery on mobile/web
const imageCache = new Map();

const handleImageProxy = async (req, res) => {
  const targetUrl = req.query?.url;
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Invalid URL');
  }

  // Check in-memory cache
  if (imageCache.has(targetUrl)) {
    const cached = imageCache.get(targetUrl);
    res.setHeader('Content-Type', cached.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached.buffer);
  }

  try {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CanteenApp/1.0',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': 'https://en.wikipedia.org/',
    };

    const clientReq = lib.get(targetUrl, { headers: reqHeaders, timeout: 5000 }, (remoteRes) => {
      if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        let redirectUrl = remoteRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, targetUrl).toString();
        }
        return res.redirect(`/api/image-proxy?url=${encodeURIComponent(redirectUrl)}`);
      }

      if (remoteRes.statusCode !== 200) {
        return res.status(remoteRes.statusCode).send('Failed to fetch upstream image');
      }

      const contentType = remoteRes.headers['content-type'] || 'image/jpeg';
      const chunks = [];
      remoteRes.on('data', chunk => chunks.push(chunk));
      remoteRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (imageCache.size > 150) {
          const firstKey = imageCache.keys().next().value;
          imageCache.delete(firstKey);
        }
        imageCache.set(targetUrl, { buffer, contentType });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
      });
    });

    clientReq.on('timeout', () => {
      clientReq.destroy();
      res.status(504).send('Image fetch timed out');
    });

    clientReq.on('error', (err) => {
      res.status(502).send(`Proxy error: ${err.message}`);
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

app.get('/search-officer', handleOfficerSearch);
app.post('/search-officer', handleOfficerSearch);
app.get('/api/search-officer', handleOfficerSearch);
app.post('/api/search-officer', handleOfficerSearch);
app.get('/api/officer/search', handleOfficerSearch);
app.post('/api/officer/search', handleOfficerSearch);

// Image proxy for mobile app Expo compatibility
app.get('/image-proxy', handleImageProxy);
app.get('/api/image-proxy', handleImageProxy);

const { swaggerSpec, swaggerUi } = require('./src/config/swagger');

// Swagger UI Documentation & raw JSON spec
app.get('/api-docs/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Government Canteen API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    persistAuthorization: true,
  },
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes); // Versioned alias
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// KOT Kitchen SPA direct entry and wildcard routing
app.get(/^\/admin\/kot(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/kot/index.html'));
});

// Admin React SPA direct entry and wildcard routing for all dedicated pages
// (/admin/dashboard, /admin/food-menu, /admin/orders, /admin/whatsapp, /admin/officers)
app.get(/^\/admin(\/.*)?$/, (req, res) => {
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
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  CANTEEN SERVICES BACKEND ACTIVE ON PORT ${PORT}      `);
    console.log(`  Database Status: ${mongoose.connection.readyState === 1 ? 'MongoDB Connected (Active)' : 'Local JSON Store (Fallback)'}`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/admin       `);
    console.log(`  Food Menu API:   http://localhost:${PORT}/api/foods   `);
    console.log(`  Orders API:      http://localhost:${PORT}/api/orders  `);
    console.log(`  WhatsApp & QR:   http://localhost:${PORT}/api/whatsapp`);
    console.log(`  Officer Search:  http://localhost:${PORT}/search-officer`);
    console.log(`=======================================================`);
  });

  // Connect to MongoDB and synchronize data in background
  connectDB().then((isConnected) => {
    if (isConnected) {
      migrateData().catch((err) => console.warn('[Migrate] Background error:', err.message));
    }
  }).catch((err) => console.warn('[Database] Background connection error:', err.message));
  // Initialize Socket.io for Kitchen Order Ticket (KOT) delivery
  const { Server: SocketIOServer } = require('socket.io');
  io = new SocketIOServer(server, { path: '/api/socket.io', cors: { origin: '*' } });
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

