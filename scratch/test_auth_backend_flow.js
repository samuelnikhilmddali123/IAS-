const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=======================================================');
  console.log('   RUNNING COMPLETE AUTH & DATA INTEGRATION TEST SUITE');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  const testPhone = '9876543210';
  const testPin = '123456';
  const testName = 'Rahul Sharma';
  const testEmail = 'rahul.sharma@ias.gov.in';

  // 1. TEST REGISTRATION
  console.log('1. Testing User Registration...');
  const regRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: testName,
    email: testEmail,
    phone: testPhone,
    pin: testPin,
    designation: 'Officer on Special Duty (IAS)',
    department: 'Cabinet Secretariat • Government of India'
  });

  assert(
    'Registration returns 201 Created and user profile',
    regRes.status === 201 && regRes.body.success && regRes.body.user && regRes.body.user.name === testName,
    `Status: ${regRes.status}, Body: ${JSON.stringify(regRes.body)}`
  );

  assert(
    'Registration dispatches QR via Admin WhatsApp (+91 91212 66269)',
    regRes.body.whatsapp && regRes.body.whatsapp.from === '+91 91212 66269',
    `From: ${regRes.body.whatsapp ? regRes.body.whatsapp.from : 'none'}`
  );

  const token = regRes.body.token;

  // 2. TEST CORRECT LOGIN
  console.log('\n2. Testing Login with correct credentials (9876543210 + 123456)...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    phone: testPhone,
    pin: testPin
  });

  assert(
    'Correct login returns 200 OK and authenticated user profile (Rahul Sharma)',
    loginRes.status === 200 && loginRes.body.success && loginRes.body.user.name === testName,
    `Status: ${loginRes.status}, Name: ${loginRes.body.user?.name}`
  );

  // 3. TEST WRONG PIN
  console.log('\n3. Testing Login with WRONG PIN (9876543210 + 999999)...');
  const wrongPinRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    phone: testPhone,
    pin: '999999'
  });

  assert(
    'Wrong PIN login is rejected (status 401)',
    wrongPinRes.status === 401 && wrongPinRes.body.success === false,
    `Status: ${wrongPinRes.status}, Body: ${JSON.stringify(wrongPinRes.body)}`
  );

  // 4. TEST NON-EXISTENT USER
  console.log('\n4. Testing Login with NON-EXISTENT user (9999999999 + 123456)...');
  const nonExistRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    phone: '9999999999',
    pin: '123456'
  });

  assert(
    'Non-existent user login is rejected (status 401)',
    nonExistRes.status === 401 && nonExistRes.body.success === false,
    `Status: ${nonExistRes.status}, Body: ${JSON.stringify(nonExistRes.body)}`
  );

  // 5. TEST GET /me ENDPOINT WITH TOKEN
  console.log('\n5. Testing GET /api/auth/me profile retrieval...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  assert(
    'GET /me returns registered user details',
    meRes.status === 200 && meRes.body.success && meRes.body.user.name === testName,
    `Status: ${meRes.status}, User: ${JSON.stringify(meRes.body.user)}`
  );

  // 6. TEST FOOD MENU API
  console.log('\n6. Testing Food Menu API (/api/foods)...');
  const foodRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/foods',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  assert(
    'Food menu returns valid items array from backend',
    foodRes.status === 200 && foodRes.body.success && Array.isArray(foodRes.body.food) && foodRes.body.food.length > 0,
    `Status: ${foodRes.status}, Count: ${foodRes.body.food?.length}`
  );

  console.log('\n=======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
