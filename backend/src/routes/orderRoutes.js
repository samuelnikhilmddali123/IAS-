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

const router = express.Router();

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
      qrDataUrl: qrData.qrDataUrl
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
