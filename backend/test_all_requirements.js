const http = require('http');
const { io } = require('../frontend/node_modules/socket.io-client');

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

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('  IAS OFFICERS CANTEEN — END-TO-END COMPREHENSIVE TEST SUITE   ');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const passwordA = `OfficerPasswordA_${timestamp}`;
  const phoneA = `98${String(timestamp).slice(-8)}`;
  const emailA = `officerA_${timestamp}@ias.gov.in`;

  const passwordB = `OfficerPasswordB_${timestamp}`;
  const phoneB = `97${String(timestamp).slice(-8)}`;
  const emailB = `officerB_${timestamp}@ias.gov.in`;

  // -------------------------------------------------------------------------
  // REQUIREMENT 2: PASSWORD UNIQUENESS ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 1] Testing Global Password Uniqueness Enforcement...');
  
  // Register User A with unique passwordA
  const regUserARes = await request('POST', '/api/auth/register', {
    name: 'Officer A (IAS)',
    phone: phoneA,
    email: emailA,
    password: passwordA,
    designation: 'Joint Secretary',
    department: 'Dept of Personnel & Training'
  });
  if (regUserARes.status !== 200 && regUserARes.status !== 201) {
    throw new Error(`Failed to register Officer A: ${JSON.stringify(regUserARes.data)}`);
  }
  const tokenA = regUserARes.data.token;
  const userA = regUserARes.data.user;
  console.log(`  ✓ Officer A registered successfully with unique password: ${userA.name} (${userA.phone})`);

  // Attempt to register User B with the EXACT SAME password as User A
  console.log('  Testing duplicate password rejection for Officer B...');
  const regDuplicatePasswordRes = await request('POST', '/api/auth/register', {
    name: 'Officer Impostor (IAS)',
    phone: phoneB,
    email: emailB,
    password: passwordA, // Duplicate of User A's password
    designation: 'Under Secretary'
  });

  console.log(`  Duplicate registration HTTP status: ${regDuplicatePasswordRes.status}`);
  console.log(`  Duplicate registration error message: "${regDuplicatePasswordRes.data.message}"`);

  if (regDuplicatePasswordRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for duplicate password, got ${regDuplicatePasswordRes.status}`);
  }
  const expectedMsg = 'This password is already used. Please choose another password.';
  if (regDuplicatePasswordRes.data.message !== expectedMsg) {
    throw new Error(`Expected error message "${expectedMsg}", got "${regDuplicatePasswordRes.data.message}"`);
  }
  console.log('  ✓ Duplicate password correctly rejected with exact required message: "This password is already used. Please choose another password."\n');

  // Now register User B with their OWN unique passwordB
  const regUserBRes = await request('POST', '/api/auth/register', {
    name: 'Officer B (IAS)',
    phone: phoneB,
    email: emailB,
    password: passwordB,
    designation: 'Additional Secretary',
    department: 'Ministry of External Affairs'
  });
  if (regUserBRes.status !== 200 && regUserBRes.status !== 201) {
    throw new Error(`Failed to register Officer B: ${JSON.stringify(regUserBRes.data)}`);
  }
  const tokenB = regUserBRes.data.token;
  const userB = regUserBRes.data.user;
  console.log(`  ✓ Officer B registered successfully with distinct unique password: ${userB.name} (${userB.phone})\n`);

  // -------------------------------------------------------------------------
  // REQUIREMENT 3: PASSWORD-ONLY LOGIN
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 2] Testing Password-Only Customer Login...');

  // 1. Valid password-only login (NO phone, NO email, NO username)
  const passwordOnlyLoginRes = await request('POST', '/api/auth/login', {
    password: passwordA
  });

  if (passwordOnlyLoginRes.status !== 200 || !passwordOnlyLoginRes.data.success) {
    throw new Error(`Password-only login failed: ${JSON.stringify(passwordOnlyLoginRes.data)}`);
  }
  if (!passwordOnlyLoginRes.data.token) {
    throw new Error('Expected JWT token in password-only login response');
  }
  if (passwordOnlyLoginRes.data.user.phone !== phoneA) {
    throw new Error(`Expected authenticated user phone ${phoneA}, got ${passwordOnlyLoginRes.data.user.phone}`);
  }
  console.log(`  ✓ Successfully authenticated Officer A using ONLY password! (Token: ${passwordOnlyLoginRes.data.token.slice(0, 15)}...)`);

  // 2. Invalid password login rejection
  const invalidPasswordLoginRes = await request('POST', '/api/auth/login', {
    password: 'CompletelyWrongPassword_XYZ'
  });
  if (invalidPasswordLoginRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for invalid password, got ${invalidPasswordLoginRes.status}`);
  }
  console.log(`  ✓ Invalid password rejected with HTTP 401: "${invalidPasswordLoginRes.data.message}"\n`);

  // -------------------------------------------------------------------------
  // REQUIREMENT 1 & 6: CART CHECKOUT & BILL GENERATION (NO PAYMENT SCREEN)
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 3] Testing Cart Checkout & Bill Generation Flow...');

  // Get sample food
  const foodsRes = await request('GET', '/api/foods');
  const foodList = foodsRes.data.food || foodsRes.data.foods || foodsRes.data;
  const sampleFood = Array.isArray(foodList) && foodList[0] ? foodList[0] : { id: 'food-1', name: 'Dal Makhani', price: 120 };
  const foodId = sampleFood.id || sampleFood._id;

  // Checkout order for User A
  const checkoutPayload = {
    userId: userA.id,
    userName: userA.name,
    userPhone: userA.phone,
    items: [
      { foodId: foodId, name: sampleFood.name, price: sampleFood.price, quantity: 2 }
    ],
    orderType: 'INSTANT',
    orderNote: 'Urgent meeting order'
  };

  const checkoutRes = await request('POST', '/api/cart/checkout', checkoutPayload, { Authorization: `Bearer ${tokenA}` });
  if (checkoutRes.status !== 200 && checkoutRes.status !== 201) {
    throw new Error(`Checkout failed: ${JSON.stringify(checkoutRes.data)}`);
  }
  const orderA = checkoutRes.data.order;
  console.log(`  ✓ Order placed successfully: Order #${orderA.orderNumber}`);
  console.log(`    Initial Status: ${orderA.status || orderA.kitchenStatus}`);
  console.log(`    Server Calculated Total: ₹${orderA.totalAmount}`);
  console.log(`    Payment Status: ${orderA.paymentStatus}`);

  if (orderA.kitchenStatus !== 'NEW' && orderA.status !== 'NEW') {
    throw new Error(`Expected initial status 'NEW', got ${orderA.kitchenStatus || orderA.status}`);
  }

  // -------------------------------------------------------------------------
  // REQUIREMENT 4: ORDER STATUS LIFECYCLE & TRANSITION VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n▶ [TEST 4] Testing 5-Stage Order Status Lifecycle & Transition Guard...');
  const orderId = orderA.id || orderA._id;

  // Step 1: NEW -> ACCEPTED
  console.log('  Testing transition: NEW -> ACCEPTED...');
  const acceptRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'ACCEPTED' });
  if (acceptRes.status !== 200) {
    throw new Error(`Failed transition to ACCEPTED: ${JSON.stringify(acceptRes.data)}`);
  }
  console.log('  ✓ Transitioned to ACCEPTED');

  // Step 2: ACCEPTED -> PREPARING
  console.log('  Testing transition: ACCEPTED -> PREPARING...');
  const prepRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'PREPARING' });
  if (prepRes.status !== 200) {
    throw new Error(`Failed transition to PREPARING: ${JSON.stringify(prepRes.data)}`);
  }
  console.log('  ✓ Transitioned to PREPARING');

  // Step 3: PREPARING -> READY
  console.log('  Testing transition: PREPARING -> READY...');
  const readyRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'READY' });
  if (readyRes.status !== 200) {
    throw new Error(`Failed transition to READY: ${JSON.stringify(readyRes.data)}`);
  }
  console.log('  ✓ Transitioned to READY');

  // Step 4: READY -> COMPLETED
  console.log('  Testing transition: READY -> COMPLETED...');
  const completeRes = await request('PUT', `/api/orders/${orderId}/status`, { status: 'COMPLETED' });
  if (completeRes.status !== 200) {
    throw new Error(`Failed transition to COMPLETED: ${JSON.stringify(completeRes.data)}`);
  }
  console.log('  ✓ Transitioned to COMPLETED');

  // Test Invalid Transition Guard:
  // Create order 2 (starts at NEW) and attempt invalid jump: NEW -> COMPLETED
  console.log('\n  Testing invalid transition rejection (NEW -> COMPLETED)...');
  const order2Res = await request('POST', '/api/cart/checkout', {
    ...checkoutPayload,
    items: [{ foodId: foodId, name: sampleFood.name, price: sampleFood.price, quantity: 1 }],
    orderNote: 'Jump test order'
  }, { Authorization: `Bearer ${tokenA}` });

  const order2 = order2Res.data.order;
  const order2Id = order2.id || order2._id;

  const invalidJumpRes = await request('PUT', `/api/orders/${order2Id}/status`, { status: 'COMPLETED' });
  console.log(`  Invalid jump HTTP status: ${invalidJumpRes.status}`);
  console.log(`  Invalid jump response message: "${invalidJumpRes.data.message}"`);
  if (invalidJumpRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for invalid jump NEW -> COMPLETED, got ${invalidJumpRes.status}`);
  }
  console.log('  ✓ Invalid transition guard properly blocked illegal status jump!\n');

  // -------------------------------------------------------------------------
  // REQUIREMENT 5: REAL-TIME SOCKET.IO ORDER TRACKING
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 5] Testing Real-Time Order Status Updates via Socket.IO...');
  const socketReceivedPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket.IO event timeout after 6 seconds')), 6000);
    const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('  ✓ Socket.IO test client connected to server');
    });

    socket.on('orderStatusUpdated', (data) => {
      console.log(`  ✓ Socket received 'orderStatusUpdated' event for order #${data.orderNumber || data.order?.orderNumber}`);
      const eventOrderId = data.orderId || data.id || data._id || data.orderNumber || data.order?.id;
      if (eventOrderId === order2Id || eventOrderId === order2.orderNumber || eventOrderId === String(order2Id)) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(data);
      }
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Trigger valid transition NEW -> ACCEPTED on order 2 to emit socket event
  await new Promise(r => setTimeout(r, 500));
  await request('PUT', `/api/orders/${order2Id}/status`, { status: 'ACCEPTED' });

  const socketData = await socketReceivedPromise;
  console.log(`  ✓ Real-time Socket.IO emission verified for order #${order2.orderNumber} (Status: ${socketData.status || socketData.kitchenStatus})\n`);

  // -------------------------------------------------------------------------
  // REQUIREMENT 6: USER ISOLATION (Strict JWT User Scoping)
  // -------------------------------------------------------------------------
  console.log('▶ [TEST 6] Testing Strict Customer Order Isolation...');

  // Officer A queries their orders
  const officerAOrdersRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${tokenA}` });
  if (officerAOrdersRes.status !== 200 || !officerAOrdersRes.data.success) {
    throw new Error(`Officer A my-orders query failed: ${JSON.stringify(officerAOrdersRes.data)}`);
  }
  const ordersOfA = officerAOrdersRes.data.orders;
  console.log(`  Officer A query returned ${ordersOfA.length} order(s)`);
  if (ordersOfA.length === 0) {
    throw new Error('Expected Officer A to have at least 1 order');
  }

  // Officer B queries their orders (should be 0 because Officer B placed no orders)
  const officerBOrdersRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${tokenB}` });
  if (officerBOrdersRes.status !== 200 || !officerBOrdersRes.data.success) {
    throw new Error(`Officer B my-orders query failed: ${JSON.stringify(officerBOrdersRes.data)}`);
  }
  const ordersOfB = officerBOrdersRes.data.orders;
  console.log(`  Officer B query returned ${ordersOfB.length} order(s)`);

  if (ordersOfB.length !== 0) {
    throw new Error(`User isolation violation! Officer B received orders belonging to another officer: ${JSON.stringify(ordersOfB)}`);
  }
  console.log('  ✓ Strict User Isolation verified: Officer B cannot access Officer A’s orders via /api/orders/my-orders.\n');

  console.log('================================================================');
  console.log('  ALL 6 REQUIREMENTS VALIDATED & VERIFIED SUCCESSFULLY!        ');
  console.log('================================================================');
}

runComprehensiveTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
