const http = require('http');

function apiCall(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ networkError: true, code: err.code, message: err.message });
    });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Simulates frontend CanteenContext.login() logic
async function frontendLogin(phone, pin) {
  const cleanPhone = (phone || '').trim();
  const cleanPin = (pin || '').trim();

  if (!cleanPhone || !cleanPin) {
    return { success: false, error: 'Mobile number and PIN are required' };
  }

  const res = await apiCall({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { phone: cleanPhone, pin: cleanPin });

  if (res.networkError) {
    return {
      success: false,
      error: 'Unable to connect to backend server. Please ensure the backend is running.',
    };
  }

  if (res.status === 200 && res.body?.success && res.body?.user) {
    return {
      success: true,
      user: res.body.user,
    };
  }

  return {
    success: false,
    error: res.body?.message || 'Invalid phone number or password',
  };
}

// Simulates frontend CanteenContext.fetchMenu() logic
async function frontendFetchMenu() {
  const res = await apiCall({
    hostname: 'localhost',
    port: 5001,
    path: '/api/foods',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (res.networkError) {
    return {
      items: [],
      error: 'Unable to load menu: Cannot connect to backend server. Please verify the backend is running.',
    };
  }

  if (res.status === 200 && res.body?.success && Array.isArray(res.body?.food)) {
    return {
      items: res.body.food,
      error: null,
    };
  }

  return {
    items: [],
    error: 'Unable to load menu: Backend returned an error response.',
  };
}

// Simulates frontend CanteenContext.registerUser() logic
async function frontendRegister(payload) {
  if (!payload.name || !payload.phone || !payload.pin) {
    return { success: false, error: 'Full name, phone number, and PIN are required' };
  }

  const res = await apiCall({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, payload);

  if (res.networkError) {
    return {
      success: false,
      error: 'Unable to connect to backend server. Please ensure the backend is running.',
    };
  }

  if (res.status === 201 && res.body?.success && res.body?.user) {
    return {
      success: true,
      user: res.body.user,
      whatsapp: res.body.whatsapp,
    };
  }

  return {
    success: false,
    error: res.body?.message || 'Registration failed.',
  };
}

module.exports = {
  apiCall,
  frontendLogin,
  frontendFetchMenu,
  frontendRegister,
};
