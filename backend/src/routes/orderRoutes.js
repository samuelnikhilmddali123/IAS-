const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrdersForAdmin,
  updateOrderStatus,
  getAdminStats
} = require('../services/orderService');

const router = express.Router();

// Place new order (Cart checkout from frontend)
router.post('/', async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user order history (supports query ?userId=... or ?phone=...)
router.get('/', async (req, res) => {
  try {
    const userIdOrPhone = req.query.userId || req.query.phone || req.query.mobile;
    const orders = await getUserOrders(userIdOrPhone);
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
      status: req.query.status
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
