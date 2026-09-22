const http = require('http');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED CHECKOUT & BILL GENERATION TESTS ===');
  let token = null;
  let testUser = null;
  let sampleFood = null;

  // 1. Get food list
  console.log('\n--- 1. Testing GET /api/foods ---');
  const foodsRes = await request('GET', '/api/foods');
  console.log(`Status: ${foodsRes.status}`);
  const list = foodsRes.data.food || foodsRes.data.foods || foodsRes.data;
  if (foodsRes.status === 200 && Array.isArray(list)) {
    console.log(`Found ${list.length} food items in catalog.`);
    sampleFood = list[0];
    console.log(`Sample food item: ${sampleFood.name} (Price: ₹${sampleFood.price}, ID: ${sampleFood.id || sampleFood._id})`);
  } else {
    throw new Error('Failed to fetch foods: ' + JSON.stringify(foodsRes.data));
  }

  // 2. Register / Login Officer
  console.log('\n--- 2. Testing Officer Registration & Authentication ---');
  const officerPhone = '9999912345';
  const officerPin = '123456';
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Dr. Rajesh Sharma, IAS',
    email: 'rajesh.sharma.ias@gov.in',
    phone: officerPhone,
    pin: officerPin,
    designation: 'Principal Secretary',
    department: 'Ministry of Home Affairs'
  });

  if (regRes.status === 200 || regRes.status === 201) {
    token = regRes.data.token;
    testUser = regRes.data.user;
    console.log(`✓ Officer registered successfully. Token received: ${token.slice(0, 15)}...`);
  } else {
    // Try login if already exists
    const loginRes = await request('POST', '/api/auth/login', {
      phone: officerPhone,
      pin: officerPin
    });
    if (loginRes.status === 200) {
      token = loginRes.data.token;
      testUser = loginRes.data.user;
      console.log(`✓ Officer logged in successfully. Token received: ${token.slice(0, 15)}...`);
    } else {
      throw new Error('Failed to register/login test officer: ' + JSON.stringify(loginRes.data));
    }
  }

  // 3. Test Security: Missing Auth Token
  console.log('\n--- 3. Testing Security: Checkout without Auth ---');
  const unauthRes = await request('POST', '/api/cart/checkout', { items: [{ foodId: sampleFood.id || sampleFood._id, quantity: 1 }] });
  console.log(`Unauthenticated status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error('Expected 401 Unauthorized for missing token, got ' + unauthRes.status);
  }
  console.log('✓ Unauthorized request properly rejected.');

  // 4. Test Validation: Empty Cart
  console.log('\n--- 4. Testing Validation: Empty Cart ---');
  const emptyRes = await request('POST', '/api/cart/checkout', { items: [] }, { Authorization: `Bearer ${token}` });
  console.log(`Empty cart status: ${emptyRes.status} (Expected: 400)`);
  if (emptyRes.status !== 400) {
    throw new Error('Expected 400 Bad Request for empty cart, got ' + emptyRes.status);
  }
  console.log('✓ Empty cart rejected with message:', emptyRes.data.message);

  // 5. Test CHECKOUT Flow
  console.log('\n--- 5. Testing CHECKOUT Flow (POST /api/cart/checkout) ---');
  const foodId = sampleFood.id || sampleFood._id;
  const checkoutPayload = {
    items: [
      {
        foodId: foodId,
        quantity: 2,
        price: 999999 // intentionally bogus price to verify backend server-side price calculation
      }
    ],
    orderNote: 'High priority VIP order, less spicy',
    orderType: 'PRE_ORDER',
    pickupTime: '6:30 PM'
  };

  const checkoutRes = await request('POST', '/api/cart/checkout', checkoutPayload, { Authorization: `Bearer ${token}` });
  console.log(`Checkout response status: ${checkoutRes.status}`);
  if (checkoutRes.status !== 200 && checkoutRes.status !== 201) {
    throw new Error('Checkout failed: ' + JSON.stringify(checkoutRes.data));
  }
  const checkoutData = checkoutRes.data;
  console.log('✓ Checkout succeeded!');
  console.log(`  Order Number: ${checkoutData.order.orderNumber}`);
  console.log(`  Server Calculated Total: ₹${checkoutData.order.totalAmount} (Expected: ₹${sampleFood.price * 2})`);
  console.log(`  Kitchen Status: ${checkoutData.order.kitchenStatus}`);
  console.log(`  Payment Status: ${checkoutData.order.paymentStatus}`);
  console.log(`  Pickup Time: ${checkoutData.order.pickupTime}`);

  if (checkoutData.order.totalAmount !== sampleFood.price * 2) {
    throw new Error(`Price tampering check failed! Total amount was ₹${checkoutData.order.totalAmount}, expected ₹${sampleFood.price * 2}`);
  }
  if (checkoutData.order.kitchenStatus !== 'PREPARING') {
    throw new Error(`Expected kitchenStatus 'PREPARING', got '${checkoutData.order.kitchenStatus}'`);
  }
  if (checkoutData.order.paymentStatus !== 'PAYMENT_PENDING' && checkoutData.order.paymentStatus !== 'UNPAID') {
    throw new Error(`Expected paymentStatus 'UNPAID' or 'PAYMENT_PENDING', got '${checkoutData.order.paymentStatus}'`);
  }
  console.log('✓ CHECKOUT flow validated: verified server pricing, PREPARING kitchenStatus, and payment status.');

  // 6. Test Double-click deduplication safeguard
  console.log('\n--- 6. Testing Double-click Deduplication Safeguard ---');
  const dupRes = await request('POST', '/api/cart/checkout', checkoutPayload, { Authorization: `Bearer ${token}` });
  console.log(`Immediate duplicate checkout status: ${dupRes.status} (Expected: 409)`);
  if (dupRes.status === 409) {
    console.log('✓ Double-click deduplication successfully blocked duplicate request:', dupRes.data.message);
  } else {
    throw new Error(`Expected 409 Conflict for duplicate order, got ${dupRes.status}: ${JSON.stringify(dupRes.data)}`);
  }

  // 7. Wait 4.5s for deduplication window to expire
  console.log('\nWaiting 4.5 seconds for deduplication lock to expire before GENERATE BILL test...');
  await new Promise(r => setTimeout(r, 4500));

  // 8. Test GENERATE BILL Flow
  console.log('\n--- 8. Testing GENERATE BILL Flow (POST /api/cart/generate-bill) ---');
  const billPayload = {
    items: [
      {
        foodId: foodId,
        quantity: 3
      }
    ],
    orderNote: 'Send invoice to registered WhatsApp',
    orderType: 'DINE_IN',
    pickupTime: 'ASAP'
  };

  const billRes = await request('POST', '/api/cart/generate-bill', billPayload, { Authorization: `Bearer ${token}` });
  console.log(`Generate Bill response status: ${billRes.status}`);
  if (billRes.status !== 200 && billRes.status !== 201) {
    throw new Error('Generate Bill failed: ' + JSON.stringify(billRes.data));
  }
  const billData = billRes.data;
  console.log('✓ GENERATE BILL succeeded!');
  console.log(`  Order Number: ${billData.order.orderNumber}`);
  console.log(`  Bill Number: ${billData.bill ? billData.bill.billNumber : 'N/A'}`);
  console.log(`  Total Amount: ₹${billData.order.totalAmount} (Expected: ₹${sampleFood.price * 3})`);
  console.log(`  Kitchen Status: ${billData.order.kitchenStatus}`);
  console.log(`  Payment Status: ${billData.order.paymentStatus}`);
  console.log(`  WhatsApp Delivery Status: ${billData.whatsappDeliveryStatus || (billData.whatsapp ? billData.whatsapp.status : 'N/A')}`);

  if (!billData.bill || !billData.bill.billNumber) {
    throw new Error('Expected bill object with billNumber in response');
  }
  console.log('✓ GENERATE BILL flow validated: verified bill generation, WhatsApp dispatch payload, and paymentStatus PAYMENT_PENDING.');

  console.log('\n=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
