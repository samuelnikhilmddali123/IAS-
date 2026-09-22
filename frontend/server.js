const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const SERPAPI_KEY = process.env.SERPAPI_KEY || '2d8c514adc81802ac3aeb0339ae905060021acc30a101f2177316f2bae88e950';

let officerImageService = null;
try {
  officerImageService = require('../backend/src/services/officerImageService');
} catch (e) {
  // If run independently
}

const server = http.createServer(async (req, res) => {
  // Enable Full CORS for local frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Search officer endpoint (supports GET ?name=... and POST { name: ... })
  if (parsedUrl.pathname === '/search-officer') {
    let name = parsedUrl.query.name;

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          if (body) {
            const parsedBody = JSON.parse(body);
            name = parsedBody.name || name;
          }
        } catch {
          // ignore
        }
        await handleSearch(name, res);
      });
      return;
    }

    await handleSearch(name, res);
    return;
  }

  // Health check endpoint
  if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'IAS Officer Search API' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

async function handleSearch(name, res) {
  if (!name || !name.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Officer name is required' }));
    return;
  }

  const queryName = name.trim();
  console.log(`[${new Date().toISOString()}] Searching Images for: "${queryName}"`);

  try {
    let result = null;
    if (officerImageService && officerImageService.searchOfficerImages) {
      result = await officerImageService.searchOfficerImages(queryName, { apiKey: SERPAPI_KEY });
    } else {
      result = {
        success: true,
        name: queryName,
        images: []
      };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching images:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        message: 'Image search failed',
        error: error.message,
      })
    );
  }
}

server.listen(PORT, () => {
  console.log(`IAS Officer Search Server active at http://localhost:${PORT}`);
});
