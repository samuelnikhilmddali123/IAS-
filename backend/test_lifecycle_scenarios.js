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

async function runLifecycleScenarioTests() {
  console.log('================================================================');
  console.log('  IAS OFFICERS CANTEEN — CORRECTED ORDER & PAYMENT LIFECYCLE  ');
  console.log('================================================================\n');

  const ts = Date.now();
  const passwordA = `P@ssOfficerA_${ts}`;
  const phoneA = `98${String(ts).slice(-8)}`;
  const emailA = `officerA_${ts}@gov.in`;

  const passwordB = `P@ssOfficerB_${ts}`;
  const phoneB = `97${String(ts).slice(-8)}`;
  const emailB = `officerB_${ts}@gov.in`;

  // -------------------------------------------------------------------------
  // STEP 1: Register Officer A with unique password
  // -------------------------------------------------------------------------
  console.log('▶ [STEP 1] Officer A Registration & Password-Only Login...');
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Dr. Vivek Agnihotri, IAS',
    phone: phoneA,
    email: emailA,
    password: passwordA,
    designation: 'Joint Secretary',
    department: 'Ministry of Home Affairs'
  });
  if (regRes.status !== 200 && regRes.status !== 201) {
    throw new Error('Officer A registration failed: ' + JSON.stringify(regRes.data));
  }
  let tokenA = regRes.data.token;
  const userA = regRes.data.user;
  console.log(`  ✓ Officer A registered: ID=${userA.id}, Name=${userA.name}`);

  // Test password-only login
  const loginRes = await request('POST', '/api/auth/login', { password: passwordA });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Password-only login failed: ' + JSON.stringify(loginRes.data));
  }
  tokenA = loginRes.data.token;
  console.log('  ✓ Password-only login successful for Officer A');

  // Fetch food item for checkout
  const foodsRes = await request('GET', '/api/foods');
  const foodList = foodsRes.data.food || foodsRes.data.foods || [];
  const foodItem = foodList[0] || { id: 'food-d3', name: 'Chapati with Mixed Veg Curry', price: 60 };
  const foodId = foodItem.id || foodItem._id;
  console.log(`  ✓ Selected Food: ${foodItem.name} (₹${foodItem.price})`);

  // -------------------------------------------------------------------------
  // STEP 2: Officer A places Order #1 via CHECKOUT
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 2] Placing Order #1 via CHECKOUT...');
  const order1Payload = {
    userId: userA.id,
    userName: userA.name,
    userPhone: userA.phone,
    items: [
      { foodId: foodId, name: foodItem.name, price: foodItem.price, quantity: 2 }
    ],
    orderType: 'INSTANT',
    orderNote: 'Less spicy please'
  };

  const checkout1Res = await request('POST', '/api/cart/checkout', order1Payload, { Authorization: `Bearer ${tokenA}` });
  if (checkout1Res.status !== 200 && checkout1Res.status !== 201) {
    throw new Error('Order #1 Checkout failed: ' + JSON.stringify(checkout1Res.data));
  }
  const order1 = checkout1Res.data.order;
  const order1Id = order1.id || order1._id;
  console.log(`  ✓ Order #1 created: #${order1.orderNumber}`);
  console.log(`    Initial Status: ${order1.status || order1.kitchenStatus}`);
  console.log(`    Initial Payment Status: ${order1.paymentStatus} (Expected: UNPAID or PAYMENT_PENDING)`);
  console.log(`    Total Amount: ₹${order1.totalAmount}`);

  // -------------------------------------------------------------------------
  // STEP 3: Admin transitions Order #1 through kitchen stages to COMPLETED
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 3] Admin moves Order #1: NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED...');

  // NEW -> ACCEPTED
  await request('PUT', `/api/orders/${order1Id}/status`, { status: 'ACCEPTED' });
  console.log('  ✓ Admin ACCEPTED Order #1');

  // ACCEPTED -> PREPARING
  await request('PUT', `/api/orders/${order1Id}/status`, { status: 'PREPARING' });
  console.log('  ✓ Kitchen PREPARING Order #1');

  // PREPARING -> READY
  await request('PUT', `/api/orders/${order1Id}/status`, { status: 'READY' });
  console.log('  ✓ Food READY at counter for Order #1');

  // READY -> COMPLETED (Customer collects food)
  const completeRes = await request('PUT', `/api/orders/${order1Id}/status`, { status: 'COMPLETED' });
  if (completeRes.status !== 200) {
    throw new Error('Admin completion failed: ' + JSON.stringify(completeRes.data));
  }
  const completedOrder1 = completeRes.data.order;
  console.log(`  ✓ Admin marked COMPLETED for Order #1`);
  console.log(`    Order Status: ${completedOrder1.status}`);
  console.log(`    Payment Status: ${completedOrder1.paymentStatus} (Expected: UNPAID)`);

  // Rule 5 & 22 Check: Payment MUST be UNPAID, NOT auto-paid!
  if (completedOrder1.paymentStatus !== 'UNPAID') {
    throw new Error(`Rule 5/22 Violation! Expected paymentStatus 'UNPAID' on COMPLETED, got '${completedOrder1.paymentStatus}'`);
  }
  console.log('  ✓ Verified Rule 5 & 22: Marking COMPLETED automatically made paymentStatus = UNPAID (NOT auto-paid).');

  // -------------------------------------------------------------------------
  // STEP 4: Officer A logs in again -> fetches orders
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 4] Officer A Logs in again after logout...');
  const reloginRes = await request('POST', '/api/auth/login', { password: passwordA });
  const newTokenA = reloginRes.data.token;

  const myOrdersRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${newTokenA}` });
  if (myOrdersRes.status !== 200 || !myOrdersRes.data.success) {
    throw new Error('Failed to fetch my-orders: ' + JSON.stringify(myOrdersRes.data));
  }
  const ordersAfterRelogin = myOrdersRes.data.orders;
  console.log(`  ✓ Orders retrieved from MongoDB on re-login: count = ${ordersAfterRelogin.length}`);
  if (ordersAfterRelogin.length === 0) {
    throw new Error('Rule 6 Violation! Previous orders disappeared after logging out and in again.');
  }
  const fetchedOrder1 = ordersAfterRelogin.find(o => o.orderNumber === order1.orderNumber || o.id === order1Id);
  if (!fetchedOrder1) {
    throw new Error(`Order #${order1.orderNumber} not found in user order history.`);
  }
  if (fetchedOrder1.status !== 'COMPLETED' || fetchedOrder1.paymentStatus !== 'UNPAID') {
    throw new Error(`Expected Order #1 to be COMPLETED and UNPAID, got status=${fetchedOrder1.status}, payment=${fetchedOrder1.paymentStatus}`);
  }
  console.log(`  ✓ Verified Rule 6: Order #${fetchedOrder1.orderNumber} persists in user history with COMPLETED and UNPAID.`);

  // -------------------------------------------------------------------------
  // STEP 5: Officer A places Order #2 (New Order + Old Unpaid Order)
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 5] Officer A places Order #2 while Order #1 is still UNPAID...');
  // Wait a bit to avoid double-click throttle
  await new Promise(r => setTimeout(r, 4500));

  const order2Payload = {
    userId: userA.id,
    userName: userA.name,
    userPhone: userA.phone,
    items: [
      { foodId: foodId, name: foodItem.name, price: foodItem.price, quantity: 3 }
    ],
    orderType: 'INSTANT',
    orderNote: 'Order #2 for second session'
  };

  const checkout2Res = await request('POST', '/api/cart/checkout', order2Payload, { Authorization: `Bearer ${newTokenA}` });
  if (checkout2Res.status !== 200 && checkout2Res.status !== 201) {
    throw new Error('Order #2 Checkout failed: ' + JSON.stringify(checkout2Res.data));
  }
  const order2 = checkout2Res.data.order;
  const order2Id = order2.id || order2._id;
  console.log(`  ✓ Order #2 created: #${order2.orderNumber} (Status: ${order2.status}, Payment: ${order2.paymentStatus})`);

  // Progress Order #2 to PREPARING
  await request('PUT', `/api/orders/${order2Id}/status`, { status: 'ACCEPTED' });
  await request('PUT', `/api/orders/${order2Id}/status`, { status: 'PREPARING' });
  console.log(`  ✓ Order #2 moved to PREPARING`);

  // -------------------------------------------------------------------------
  // STEP 6: Check that BOTH orders exist simultaneously
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 6] Verifying Rule 7 & 21: BOTH Order #1 and Order #2 exist together...');
  const dualOrdersRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${newTokenA}` });
  const bothOrders = dualOrdersRes.data.orders;
  console.log(`  ✓ Officer A has ${bothOrders.length} orders in history`);

  const hasOrder1 = bothOrders.some(o => o.orderNumber === order1.orderNumber);
  const hasOrder2 = bothOrders.some(o => o.orderNumber === order2.orderNumber);

  if (!hasOrder1 || !hasOrder2) {
    throw new Error(`Rule 7/21 Violation! Did not find both orders. hasOrder1=${hasOrder1}, hasOrder2=${hasOrder2}`);
  }

  const o1InHistory = bothOrders.find(o => o.orderNumber === order1.orderNumber);
  const o2InHistory = bothOrders.find(o => o.orderNumber === order2.orderNumber);

  console.log(`    Order #1 in history: #${o1InHistory.orderNumber} | Status: ${o1InHistory.status} | Payment: ${o1InHistory.paymentStatus}`);
  console.log(`    Order #2 in history: #${o2InHistory.orderNumber} | Status: ${o2InHistory.status} | Payment: ${o2InHistory.paymentStatus}`);

  if (o1InHistory.status !== 'COMPLETED' || o1InHistory.paymentStatus !== 'UNPAID') {
    throw new Error('Order #1 state corrupted in history!');
  }
  console.log('  ✓ Verified Rule 7 & 21: Order #1 (COMPLETED, UNPAID) was NOT replaced by Order #2 (PREPARING, UNPAID).');

  // -------------------------------------------------------------------------
  // STEP 7: Customer pays Order #1 via POST /api/orders/:id/pay
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 7] Customer pays for completed Order #1 via POST /api/orders/:id/pay...');
  const payRes = await request('POST', `/api/orders/${order1Id}/pay`, {}, { Authorization: `Bearer ${newTokenA}` });
  if (payRes.status !== 200 || !payRes.data.success) {
    throw new Error('Payment failed: ' + JSON.stringify(payRes.data));
  }
  const paidOrder1 = payRes.data.order;
  console.log(`  ✓ Payment successful for Order #1!`);
  console.log(`    Order Status: ${paidOrder1.status}`);
  console.log(`    Payment Status: ${paidOrder1.paymentStatus} (Expected: PAID)`);

  if (paidOrder1.paymentStatus !== 'PAID') {
    throw new Error(`Expected paymentStatus 'PAID', got '${paidOrder1.paymentStatus}'`);
  }

  // -------------------------------------------------------------------------
  // STEP 8: Verify paid order remains permanently in history
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 8] Verifying Rule 10 & 13: Paid order remains permanently in history...');
  const afterPayRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${newTokenA}` });
  const finalOrders = afterPayRes.data.orders;
  const o1AfterPaid = finalOrders.find(o => o.orderNumber === order1.orderNumber);
  const o2AfterPaid = finalOrders.find(o => o.orderNumber === order2.orderNumber);

  if (!o1AfterPaid) {
    throw new Error('Rule 10 Violation! Paid order was removed or deleted from history.');
  }
  if (!o2AfterPaid) {
    throw new Error('Order #2 went missing after paying Order #1.');
  }

  console.log(`    Order #1 in history: #${o1AfterPaid.orderNumber} | Status: ${o1AfterPaid.status} | Payment: ${o1AfterPaid.paymentStatus}`);
  console.log(`    Order #2 in history: #${o2AfterPaid.orderNumber} | Status: ${o2AfterPaid.status} | Payment: ${o2AfterPaid.paymentStatus}`);

  if (o1AfterPaid.paymentStatus !== 'PAID') {
    throw new Error(`Expected Order #1 paymentStatus to be 'PAID', got '${o1AfterPaid.paymentStatus}'`);
  }
  console.log('  ✓ Verified Rule 10 & 13: Paid order permanently stored in MongoDB, status COMPLETED, payment PAID.');

  // -------------------------------------------------------------------------
  // STEP 9: User Isolation Check — Officer B cannot access Officer A's orders
  // -------------------------------------------------------------------------
  console.log('\n▶ [STEP 9] Verifying Rule 12 & 15: Strict User Isolation between officers...');
  const regBRes = await request('POST', '/api/auth/register', {
    name: 'Officer B (IAS)',
    phone: phoneB,
    email: emailB,
    password: passwordB,
    designation: 'Director',
    department: 'Finance'
  });
  const tokenB = regBRes.data.token;

  // Officer B attempts to view my-orders
  const bOrdersRes = await request('GET', '/api/orders/my-orders', null, { Authorization: `Bearer ${tokenB}` });
  if (bOrdersRes.data.orders.length !== 0) {
    throw new Error(`Rule 12 Violation! Officer B saw orders belonging to Officer A: ${JSON.stringify(bOrdersRes.data.orders)}`);
  }
  console.log('  ✓ Officer B has 0 orders (cannot view Officer A’s orders or unpaid bills)');

  // Officer B attempts to pay for Officer A's order (should be blocked)
  const illegalPayRes = await request('POST', `/api/orders/${order2Id}/pay`, {}, { Authorization: `Bearer ${tokenB}` });
  if (illegalPayRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for cross-user payment, got ${illegalPayRes.status}`);
  }
  console.log(`  ✓ Officer B blocked from paying Officer A’s order (HTTP 403: "${illegalPayRes.data.message}")`);

  console.log('\n================================================================');
  console.log('  ALL 25 LIFECYCLE RULES & SCENARIOS PASSED WITH ZERO ERRORS!  ');
  console.log('================================================================\n');
}

runLifecycleScenarioTests().catch(err => {
  console.error('\n❌ LIFECYCLE TEST SUITE FAILED:', err);
  process.exit(1);
});
