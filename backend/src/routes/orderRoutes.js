const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrdersForAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  getUnpaidOrders,
  getRestaurantPaymentQr,
  getAdminStats,
  getLiveOrders
} = require('../services/orderService');
const { getPrebookSlots, validateSlot } = require('../services/slotService');

const router = express.Router();

// ==========================================
// PREBOOKING / TIME SLOTS API
// ==========================================
// Get available dining time slots (?date=YYYY-MM-DD&mealType=all|breakfast|lunch|snacks|dinner)
const handleGetSlots = async (req, res) => {
  try {
    const { date, mealType } = req.query;
    const result = await getPrebookSlots({ date, mealType });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch prebooking slots'
    });
  }
};

router.get('/slots', handleGetSlots);
router.get('/prebook-slots', handleGetSlots);
router.get('/preorder/slots', handleGetSlots);

// Validate a specific slot before placing order
router.post('/slots/validate', async (req, res) => {
  try {
    const { slotId, pickupTime, pickupDate, mealSlot } = req.body;
    const validation = await validateSlot({ slotId, pickupTime, pickupDate, mealSlot });
    res.status(200).json({
      success: true,
      ...validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Slot validation failed'
    });
  }
});

// Place new order (Cart checkout from frontend)
router.post('/', async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully (Payment Pending)',
      order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's unpaid orders and outstanding dues
router.get('/unpaid', async (req, res) => {
  try {
    const userIdOrPhone = req.query.userId || req.query.phone || req.query.mobile;
    const result = await getUnpaidOrders(userIdOrPhone);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get Restaurant / Hotel payment QR code (dynamic UPI payload)
router.get('/restaurant-qr', async (req, res) => {
  try {
    const amount = Number(req.query.amount) || 0;
    const orderIds = req.query.orderIds ? String(req.query.orderIds).split(',') : [];
    const qrData = await getRestaurantPaymentQr(amount, orderIds);
    res.status(200).json({
      success: true,
      ...qrData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get live active orders for public display
router.get('/live-status', async (req, res) => {
  try {
    const orders = await getLiveOrders();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const userAuth = require('../middleware/userAuthMiddleware');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'canteen_super_secret_jwt_key_2026_secure';

// Get current authenticated user's orders (Strict User Isolation - Requirement 16)
router.get('/my-orders', userAuth, async (req, res) => {
  try {
    const orders = await getUserOrders(req.user.id);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user order history with user isolation enforcement
router.get('/', async (req, res) => {
  try {
    let targetUserId = req.query.userId || req.query.phone || req.query.mobile;

    // If Authorization header is provided, strictly enforce authenticated user's identity
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          targetUserId = decoded.id;
        }
      } catch (tokenErr) {
        // Fall back to targetUserId only if token is absent
      }
    }

    const orders = await getUserOrders(targetUserId);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get all orders
router.get('/admin/all', async (req, res) => {
  try {
    const filter = {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus
    };
    const orders = await getAllOrdersForAdmin(filter);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Analytics & Stats
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update order status (Admin action: PREPARING, READY, DELIVERED, CANCELLED)
const handleStatusUpdate = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const order = await updateOrderStatus(req.params.id, status.toUpperCase());
    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

router.put('/admin/:id/status', handleStatusUpdate);
router.put('/:id/status', handleStatusUpdate);
router.patch('/admin/:id/status', handleStatusUpdate);
router.patch('/:id/status', handleStatusUpdate);

// Update payment status (Admin or settlement: PAYMENT_PENDING, PAID)
const handlePaymentStatusUpdate = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) {
      return res.status(400).json({ success: false, message: 'paymentStatus is required' });
    }
    const order = await updatePaymentStatus(req.params.id, paymentStatus.toUpperCase());
    if (order && paymentStatus.toUpperCase() === 'PAID') {
      handlePostPaymentActions([order], req.user || { id: order.userId });
    }
    res.status(200).json({
      success: true,
      message: `Order payment status updated to ${paymentStatus}`,
      order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

router.put('/admin/:id/payment-status', handlePaymentStatusUpdate);
router.put('/:id/payment-status', handlePaymentStatusUpdate);
router.patch('/admin/:id/payment-status', handlePaymentStatusUpdate);
router.patch('/:id/payment-status', handlePaymentStatusUpdate);

// Helper: Trigger User Paid Invoice Print & WhatsApp Message
async function handlePostPaymentActions(orders, user) {
  try {
    const printerService = require('../utils/printerService');
    const whatsappService = require('../services/whatsappService');
    const authService = require('../services/authService');
    const { getOrderById } = require('../services/orderService');

    let dbUser = user;
    if (user?.id) {
      try {
        const fetched = await authService.getUserById(user.id);
        if (fetched) dbUser = fetched;
      } catch (e) {}
    }

    // Ensure we have complete order objects with items populated
    const fullOrders = [];
    for (const ord of (orders || [])) {
      if (ord && typeof ord === 'object' && Array.isArray(ord.items) && ord.items.length > 0) {
        fullOrders.push(ord);
      } else {
        const orderId = typeof ord === 'string' ? ord : (ord?._id || ord?.id || ord?.orderNumber);
        if (orderId) {
          try {
            const fetchedOrd = await getOrderById(orderId);
            if (fetchedOrd) fullOrders.push(fetchedOrd);
          } catch (e) {
            if (typeof ord === 'object') fullOrders.push(ord);
          }
        }
      }
    }

    if (fullOrders.length === 0) {
      console.warn('[POST PAYMENT] No full orders resolved for receipt generation');
      return;
    }

    const firstOrder = fullOrders[0];
    let userPhone = (dbUser?.phone || dbUser?.mobile || user?.phone || user?.mobile || firstOrder.userPhone || firstOrder.phone || '').trim();
    if (!userPhone || userPhone.replace(/\D/g, '').length < 10) {
      for (const o of fullOrders) {
        const candidate = (o.userPhone || o.phone || o.mobile || '').trim();
        if (candidate && candidate.replace(/\D/g, '').length >= 10) {
          userPhone = candidate;
          break;
        }
      }
    }
    const userName = dbUser?.name || firstOrder.userName || user?.name || 'Officer';
    const orderNumbers = fullOrders.map(o => o.orderNumber || (o.id ? `#${o.id}` : '')).filter(Boolean).join(', ');
    const tokenNumbers = fullOrders.map(o => o.tokenNumber).filter(Boolean).join(', ');

    // Consolidate actual items from all paid orders
    const itemMap = new Map();
    let totalPaid = 0;

    fullOrders.forEach(ord => {
      totalPaid += Number(ord.totalAmount || ord.grandTotal || ord.subtotal || 0);
      (ord.items || []).forEach(item => {
        const name = (item.name || (item.item && item.item.name) || 'Food item').trim();
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(item.price !== undefined ? item.price : (item.item && item.item.price !== undefined ? item.item.price : (item.total && qty ? item.total / qty : 0)));
        const lineTotal = Number(item.total !== undefined ? item.total : (qty * price));

        if (itemMap.has(name)) {
          const existing = itemMap.get(name);
          existing.qty += qty;
          existing.total += lineTotal;
        } else {
          itemMap.set(name, {
            name,
            qty,
            price,
            total: lineTotal
          });
        }
      });
    });

    const consolidatedItems = Array.from(itemMap.values()).map((it, idx) => ({
      id: idx + 1,
      name: it.name,
      qty: it.qty,
      price: it.price,
      total: it.total
    }));

    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const finalAmount = totalPaid > 0 ? totalPaid : consolidatedItems.reduce((s, it) => s + it.total, 0);

    const userBillData = {
      invoiceNo,
      orderNumber: orderNumbers,
      tokenNumber: tokenNumbers || (firstOrder.tokenNumber ? String(firstOrder.tokenNumber) : null),
      userName,
      designation: dbUser?.designation || dbUser?.serviceCadre || '',
      department: dbUser?.department || dbUser?.location || dbUser?.roomNumber || 'Officers Mess & Canteen',
      userPhone,
      date: dateStr,
      time: timeStr,
      paymentStatus: 'PAID',
      paymentMethod: 'Online UPI',
      totalAmount: finalAmount,
      items: consolidatedItems
    };

    // 1. Print User Paid Invoice to Thermal Printer
    if (printerService.printUserPaidBill) {
      try {
        await printerService.printUserPaidBill(userBillData);
      } catch (prErr) {
        console.warn('[PRINTER PAID BILL WARNING]', prErr.message);
      }
    }

    // 2. Dispatch genuine bill saved as bill.pdf directly to user on WhatsApp
    if (userPhone && whatsappService) {
      try {
        if (whatsappService.sendPaidInvoicePdf) {
          await whatsappService.sendPaidInvoicePdf({
            to: userPhone,
            userName,
            billData: userBillData
          });
        } else if (whatsappService.sendMessage) {
          await whatsappService.sendMessage(userPhone, `Payment of Rs.${finalAmount} verified for ${userName}.`);
        }
      } catch (waErr) {
        console.warn('[WHATSAPP PAID BILL WARNING]', waErr.message);
      }
    }

    // 3. Broadcast to all connected KOT / POS displays (other laptops) to auto-print payment bill URL
    try {
      const serverModule = require('../../server');
      const io = serverModule.io || (serverModule.getIO && serverModule.getIO());
      if (io) {
        fullOrders.forEach(ord => {
          const ordId = String(ord._id || ord.id || ord.orderNumber);
          const payPayload = {
            orderId: ordId,
            id: ordId,
            _id: ord._id || ord.id,
            orderNumber: ord.orderNumber,
            tokenNumber: ord.tokenNumber,
            userName,
            userPhone,
            paymentStatus: 'PAID',
            isPaid: true,
            totalAmount: ord.totalAmount || finalAmount,
            items: ord.items || consolidatedItems,
            billUrl: `/api/orders/${ordId}/bill-html`,
            url: `/api/orders/${ordId}/bill-html`
          };
          // Emit single clean event for printing to avoid duplicate prints
          io.emit('printPaidBill', payPayload);
          io.emit('orderStatusUpdated', { ...ord, paymentStatus: 'PAID', status: 'COMPLETED' });

          io.of('/kitchen').emit('printPaidBill', payPayload);
          io.of('/kitchen').emit('orderStatusUpdated', { ...ord, paymentStatus: 'PAID', status: 'COMPLETED' });
        });
        console.log(`[Socket.IO] Broadcasted single printPaidBill for ${fullOrders.length} order(s)`);
      }
    } catch (sockErr) {
      console.warn('[POST PAYMENT] Socket emit error:', sockErr.message);
    }
  } catch (err) {
    console.error('[POST PAYMENT ERROR]', err);
  }
}

// Batch Pay Multiple Orders (Combined Daily Bills)
router.post('/pay-batch', userAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds array is required' });
    }
    const results = [];
    for (const id of orderIds) {
      try {
        const updated = await updatePaymentStatus(id, 'PAID');
        if (updated) results.push(updated);
      } catch (e) {}
    }
    if (results.length > 0) {
      handlePostPaymentActions(results, req.user);
    }
    res.status(200).json({
      success: true,
      message: `Combined payment completed for ${results.length} order(s). Thank you!`,
      orders: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch Send Combined Restaurant QR & Bill to WhatsApp
router.post('/send-batch-payment-qr', userAuth, async (req, res) => {
  try {
    const { orderIds, totalAmount } = req.body;
    const authService = require('../services/authService');
    const whatsappService = require('../services/whatsappService');

    const dbUser = await authService.getUserById(req.user.id);
    const registeredMobile = (dbUser?.phone || dbUser?.mobile || '').trim();
    if (!registeredMobile || registeredMobile.replace(/\D/g, '').length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Officer does not have a registered mobile number in the central database.'
      });
    }

    const qrData = await getRestaurantPaymentQr(Number(totalAmount) || 0, orderIds || []);

    try {
      if (whatsappService && whatsappService.sendQrCardImage) {
        await whatsappService.sendQrCardImage(
          registeredMobile,
          qrData.qrDataUrl,
          `Official Canteen Bill: Today's Combined Payment for ${(orderIds || []).length} Order(s). Total: Rs.${totalAmount}`
        );
      }
    } catch (e) {}

    res.status(200).json({
      success: true,
      registeredMobile,
      qrDataUrl: qrData.qrDataUrl,
      upiId: qrData.upiId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Customer Pay Order (Requirement 9 & 10: payment after COMPLETED)
router.post('/:id/pay', userAuth, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = String(order.userId || order.user || '');
    const reqUserId = String(req.user?.id || '');
    const orderPhone = (order.userPhone || '').replace(/\D/g, '').slice(-10);
    const reqPhone = (req.user?.phone || '').replace(/\D/g, '').slice(-10);

    const isOwner = orderUserId === reqUserId || (orderPhone && reqPhone && orderPhone === reqPhone);
    if (!isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only pay for your own orders' });
    }

    const updated = await updatePaymentStatus(req.params.id, 'PAID');
    if (updated) {
      handlePostPaymentActions([updated], req.user);
    }
    res.status(200).json({
      success: true,
      message: 'Payment completed successfully. Thank you!',
      order: updated
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Customer: Send Restaurant QR Code & Bill to Registered Mobile Number (Requirement 1, 7 & 16)
router.post('/:id/send-payment-qr', userAuth, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderUserId = String(order.userId || order.user || '');
    const reqUserId = String(req.user?.id || '');
    const orderPhone = (order.userPhone || '').replace(/\D/g, '').slice(-10);
    const reqPhone = (req.user?.phone || '').replace(/\D/g, '').slice(-10);

    const isOwner = orderUserId === reqUserId || (orderPhone && reqPhone && orderPhone === reqPhone);
    if (!isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only access bills for your own orders' });
    }

    const authService = require('../services/authService');
    const billService = require('../services/billService');
    const whatsappService = require('../services/whatsappService');

    // Requirement 16: Mobile number must come from authenticated User record in database
    const dbUser = await authService.getUserById(req.user.id);
    const registeredMobile = (dbUser?.phone || dbUser?.mobile || '').trim();
    if (!registeredMobile || registeredMobile.replace(/\D/g, '').length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Officer does not have a registered mobile number in the central database to receive the payment QR.'
      });
    }

    // Fetch Restaurant UPI QR Code
    const qrData = await getRestaurantPaymentQr(order.totalAmount, [order.id || order._id]);

    // Format proper bill receipt matching Requirement 4
    let bill = null;
    try {
      bill = await billService.generateBill(order.id || order._id);
    } catch (e) {
      bill = {
        orderNumber: order.orderNumber,
        billNumber: order.billNumber || null,
        items: order.items || [],
        subtotal: order.subtotal || order.totalAmount,
        grandTotal: order.totalAmount,
        pickupTime: order.pickupTime,
        generatedAt: order.createdAt || new Date()
      };
    }
    bill.customer = {
      name: dbUser.name || order.userName || 'IAS Officer',
      phone: registeredMobile,
      email: dbUser.email || ''
    };
    bill.paymentStatus = order.paymentStatus || 'UNPAID';

    const billText = billService.formatBillReceipt({
      bill,
      restaurantName: process.env.RESTAURANT_NAME || 'IAS OFFICERS CANTEEN'
    });

    // Dispatch bill + Restaurant QR image to officer's registered mobile via WhatsApp Web
    const sendResult = await whatsappService.sendBillMessage({
      to: registeredMobile,
      billText,
      qrDataUrl: qrData.qrDataUrl,
      billData: bill
    });

    if (sendResult.status === 'FAILED') {
      return res.status(502).json({
        success: false,
        message: sendResult.error || 'Failed to dispatch Restaurant QR & bill to registered mobile'
      });
    }

    res.status(200).json({
      success: true,
      message: `Restaurant QR code and bill sent to registered mobile (${registeredMobile}).`,
      registeredMobile,
      qrDataUrl: qrData.qrDataUrl,
      upiId: qrData.upiId,
      amount: order.totalAmount,
      deliveryStatus: sendResult.status
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single order details

// ==========================================
// 1. PIN-TO-PIN TAX INVOICE BILL HTML ROUTE
// URL: GET /api/orders/:id/bill-html
// ==========================================
router.get('/:id/bill-html', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id === 'test' || id === 'PASTE_REAL_ORDER_ID_HERE') {
      order = {
        invoiceNumber: 'INV-2026-15277',
        orderNumber: 'ORD-2026-15277',
        tokenNumber: '71',
        userName: 'Chandra Babu Naidu',
        department: 'Officers Mess & Canteen',
        userPhone: '6302837843',
        createdAt: new Date('2026-09-26T15:44:00'),
        totalAmount: 55,
        paymentStatus: 'PAID',
        paymentMethod: 'RESTAURANT_QR',
        items: [
          { name: 'Dal Khichdi & Papad', qty: 1, price: 55, total: 55 }
        ]
      };
    } else {
      try {
        order = await getOrderById(id);
      } catch (err) {
        order = null;
      }
    }

    if (!order) {
      return res.status(404).send('<!DOCTYPE html><html><body style="font-family:monospace;padding:20px;text-align:center;"><h2>Order Not Found</h2></body></html>');
    }

    const billImageService = require('../services/billImageService');
    const invoiceNo = order.invoiceNumber || order.invoiceNo || order.billNumber || (order.orderNumber ? order.orderNumber.replace('ORD-', 'INV-') : (order._id ? `INV-${String(order._id).slice(-6).toUpperCase()}` : 'INV-636114'));
    const userName = order.userName || order.officerName || order.customerName || (order.user && (order.user.name || order.user.fullName)) || 'IAS Officer';
    const userPhone = order.userPhone || order.customerPhone || (order.user && (order.user.phone || order.user.mobile)) || '';
    const department = order.department || order.location || 'Officers Mess & Canteen';
    const orderDate = new Date(order.createdAt || Date.now());
    const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const totalAmount = order.totalAmount || order.grandTotal || 0;
    const items = order.items || order.orderItems || [];
    const paymentMethod = order.paymentMethod || order.paymentMode || 'Online UPI';
    const isPaid = order.paymentStatus === 'PAID' || order.isPaid === true;

    const html = await billImageService.generateBillHtml({
      invoiceNo,
      orderNumber: order.orderNumber,
      tokenNumber: order.tokenNumber,
      userName,
      userPhone,
      department,
      date: dateStr,
      time: timeStr,
      totalAmount,
      items,
      paymentMethod,
      paymentStatus: isPaid ? 'PAID' : (order.paymentStatus || 'UNPAID'),
      isPaid
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[BILL-HTML] Error rendering bill:', error);
    res.status(500).send('Error rendering bill');
  }
});

router.get('/:id/bill-image', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id === 'test') {
      order = {
        invoiceNumber: 'INV-2026-15277',
        orderNumber: 'ORD-2026-15277',
        tokenNumber: '71',
        userName: 'Chandra Babu Naidu',
        department: 'Officers Mess & Canteen',
        userPhone: '6302837843',
        createdAt: new Date('2026-09-26T15:44:00'),
        totalAmount: 55,
        paymentStatus: 'PAID',
        paymentMethod: 'RESTAURANT_QR',
        items: [
          { name: 'Dal Khichdi & Papad', qty: 1, price: 55, total: 55 }
        ]
      };
    } else {
      order = await getOrderById(id);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const billImageService = require('../services/billImageService');
    const imageBuffer = await billImageService.generateBillImage({
      ...order,
      invoiceNo: order.invoiceNumber || order.invoiceNo || order.billNumber,
      userName: order.userName || (order.user && order.user.name),
      userPhone: order.userPhone || (order.user && order.user.phone),
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[BILL-IMAGE] Error generating bill image:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. PIN-TO-PIN KITCHEN ORDER (KOT) HTML ROUTE
// URL: GET /api/orders/:id/kot-html
// ==========================================
router.get('/:id/kot-html', async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id === 'test' || id === 'PASTE_REAL_ORDER_ID_HERE') {
      order = {
        orderNumber: 'ORD-2026-12779',
        tokenNumber: '44',
        table: 'T-44',
        orderType: 'INSTANT',
        createdAt: new Date(),
        notes: 'Standard preparation. Serve hot.',
        items: [
          { name: 'Food Item', qty: 1, remarks: '-' }
        ]
      };
    } else {
      try {
        order = await getOrderById(id);
      } catch (err) {
        order = null;
      }
    }

    if (!order) {
      return res.status(404).send('<!DOCTYPE html><html><body><h2>Order Not Found</h2></body></html>');
    }

    const rawOrderNo = order.orderNumber || (order._id ? String(order._id).slice(-6).toUpperCase() : 'ORD-2026-12779');
    const orderNo = rawOrderNo.startsWith('#') ? rawOrderNo.slice(1) : rawOrderNo;
    const tableNo = order.tableNumber || order.table || (order.tokenNumber ? `T-${order.tokenNumber}` : 'T-44');
    const isPreOrder = Boolean(order.isPreOrder || order.orderType === 'PRE_ORDER' || order.pickupTime);
    const orderType = isPreOrder ? 'PRE-ORDER' : (order.orderType ? String(order.orderType).toUpperCase() : 'INSTANT');
    
    const orderDate = new Date(order.createdAt || Date.now());
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${orderDate.getDate()} ${months[orderDate.getMonth()]} ${orderDate.getFullYear()}`;
    const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const items = order.items || order.orderItems || [];
    const instructions = order.orderNote || order.notes || order.instructions || order.specialInstructions || '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Kitchen Order #${orderNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff !important;
      color: #111111 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      width: 380px !important;
      max-width: 380px !important;
      margin: 0 auto !important;
      padding: 12px 10px !important;
    }
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 6px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-circle {
      width: 44px;
      height: 44px;
      border: 1.5px solid #111111;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .brand-title {
      font-size: 14.5px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #111111;
    }
    .brand-sub {
      font-size: 7px;
      font-weight: 500;
      letter-spacing: 0.6px;
      line-height: 1.3;
      margin-top: 2px;
      color: #333333;
      text-transform: uppercase;
    }
    .header-divider {
      width: 1px;
      height: 40px;
      background-color: #333333;
      margin: 0 8px 0 10px;
    }
    .header-right {
      display: flex;
      align-items: center;
    }
    .slogan-stack {
      font-size: 7.5px;
      font-weight: 500;
      line-height: 1.35;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      text-align: left;
      color: #333333;
    }
    .kot-badge-box {
      background-color: #111111;
      color: #ffffff;
      text-align: center;
      padding: 5.5px 4px;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-radius: 2px;
      margin: 6px 0 3px 0;
    }
    .kot-badge-sub {
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #444444;
      margin-bottom: 5px;
    }
    .dashed-line {
      border-top: 1px dashed #666666;
      margin: 6px 0;
      width: 100%;
    }
    .meta-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 3px 0;
    }
    .meta-table {
      font-size: 12.5px;
      border-collapse: collapse;
      flex: 1;
    }
    .meta-table td {
      padding: 2px 0;
      white-space: nowrap;
    }
    .meta-table td.label {
      width: 80px;
      font-weight: 500;
      color: #444444;
    }
    .meta-table td.colon {
      width: 12px;
      font-weight: 500;
      text-align: center;
      color: #666666;
    }
    .meta-table td.val {
      font-weight: 600;
      color: #111111;
    }
    .table-box {
      border: 1.5px solid #111111;
      border-radius: 6px;
      padding: 4px 8px;
      text-align: center;
      width: 86px;
      min-height: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 8px;
    }
    .table-box .tb-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.8px;
      line-height: 1;
      text-transform: uppercase;
      color: #555555;
    }
    .table-box .tb-val {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.1;
      margin-top: 2px;
      letter-spacing: -0.3px;
      color: #111111;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
      table-layout: fixed;
    }
    table.items-table th {
      font-size: 11px;
      font-weight: 700;
      padding: 3.5px 0;
      border-bottom: 1.5px solid #111111;
      text-transform: uppercase;
      color: #222222;
      letter-spacing: 0.3px;
    }
    table.items-table td {
      font-size: 12px;
      padding: 3.5px 0;
      vertical-align: top;
      word-wrap: break-word;
      color: #222222;
    }
    table.items-table td.col-idx {
      font-weight: 500;
      color: #444444;
    }
    table.items-table td.col-name {
      font-weight: 600;
      color: #111111;
    }
    table.items-table td.col-qty {
      font-weight: 700;
      color: #111111;
    }
    table.items-table td.col-rem {
      font-weight: 400;
      color: #666666;
    }
    .instructions-section {
      margin: 4px 0;
      font-size: 11px;
    }
    .instructions-title {
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #222222;
      text-transform: uppercase;
    }
    .instructions-text {
      font-weight: 500;
      margin-top: 2px;
      margin-left: 16px;
      color: #333333;
      line-height: 1.3;
    }
    .footer-callout {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-top: 5px;
      margin-bottom: 2px;
      color: #444444;
    }
  </style>
</head>
<body>
  <!-- 1. Top Header -->
  <div class="top-header">
    <div class="header-left">
      <div class="logo-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#111111">
          <path d="M7 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V2H1v6c0 2.21 1.79 4 4 4v10h2V12c2.21 0 4-1.79 4-4V2H7zm-4 1h1v4H3V3zm3 0h1v4H6V3z"/>
          <path d="M17 2c-2.21 0-4 1.79-4 4 0 1.86 1.28 3.41 3 3.86V22h2V9.86c1.72-.45 3-2 3-3.86 0-2.21-1.79-4-4-4z"/>
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-title">CANTEEN<br/>SERVICES</div>
        <div class="brand-sub">GOOD FOOD<br/>GREATER SERVICE</div>
      </div>
    </div>

    <div class="header-right">
      <div class="header-divider"></div>
      <div class="slogan-stack">
        <div>FRESH</div>
        <div>HYGIENIC</div>
        <div>NUTRITIOUS</div>
        <div>FOR A BETTER YOU</div>
      </div>
    </div>
  </div>

  <!-- 2. Banner Bar -->
  <div class="kot-badge-box">KITCHEN ORDER</div>
  <div class="kot-badge-sub">PREPARE WITH CARE</div>

  <!-- 3. Dashed line -->
  <div class="dashed-line"></div>

  <!-- 4. Metadata & Table Box -->
  <div class="meta-section">
    <table class="meta-table">
      <tr>
        <td class="label">Order No</td>
        <td class="colon">:</td>
        <td class="val">#${orderNo}</td>
      </tr>
      <tr>
        <td class="label">Date</td>
        <td class="colon">:</td>
        <td class="val">${dateStr}</td>
      </tr>
      <tr>
        <td class="label">Time</td>
        <td class="colon">:</td>
        <td class="val">${timeStr}</td>
      </tr>
      <tr>
        <td class="label">Table</td>
        <td class="colon">:</td>
        <td class="val">${tableNo}</td>
      </tr>
      <tr>
        <td class="label">Order Type</td>
        <td class="colon">:</td>
        <td class="val">${orderType}</td>
      </tr>
    </table>

    <div class="table-box">
      <div class="tb-label">TABLE</div>
      <div class="tb-val">${tableNo}</div>
    </div>
  </div>

  <!-- 5. Dashed line -->
  <div class="dashed-line"></div>

  <!-- 6. Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th align="left" style="width: 8%;">#</th>
        <th align="left" style="width: 54%;">ITEM</th>
        <th align="center" style="width: 14%;">QTY</th>
        <th align="left" style="width: 24%;">REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => {
        const qty = it.qty || it.quantity || 1;
        const remarks = it.remarks || it.note || it.customization || '-';
        return `
        <tr>
          <td class="col-idx" align="left">${idx + 1}</td>
          <td class="col-name" align="left">${it.name || it.title || (it.item && it.item.name) || 'Food Item'}</td>
          <td class="col-qty" align="center">${qty}</td>
          <td class="col-rem" align="left">${remarks}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- 7. Dashed line -->
  <div class="dashed-line"></div>

  <!-- 8. Special Instructions -->
  <div class="instructions-section">
    <div class="instructions-title">[*] SPECIAL INSTRUCTIONS :</div>
    <div class="instructions-text">${instructions || 'Standard preparation. Serve hot.'}</div>
  </div>

  <!-- 9. Dashed line -->
  <div class="dashed-line"></div>

  <!-- 10. Footer -->
  <div class="footer-callout">KINDLY PREPARE AND SERVE FRESH</div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === '1' || urlParams.get('print') === 'true') {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 350);
      }
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[KOT-HTML] Error rendering KOT:', error);
    res.status(500).send('Error rendering KOT');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;







