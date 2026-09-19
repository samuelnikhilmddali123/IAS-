const dataStore = require('../storage/dataStore');
const Order = require('../models/Order');
const mongoose = require('mongoose');

const createOrder = async (orderData) => {
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    const error = new Error('Order must contain at least one item');
    error.statusCode = 400;
    throw error;
  }

  // If MongoDB connected, try Mongoose
  if (mongoose.connection.readyState === 1) {
    try {
      const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
      await Order.create({
        orderNumber,
        items: orderData.items.map(item => ({
          name: item.name || (item.item && item.item.name),
          quantity: item.quantity || 1,
          price: item.price || (item.item && item.item.price) || 0,
          total: (item.quantity || 1) * (item.price || (item.item && item.item.price) || 0)
        })),
        subtotal: orderData.totalAmount || orderData.subtotal || 0,
        grandTotal: orderData.totalAmount || orderData.subtotal || 0,
        status: 'PENDING'
      });
    } catch (e) {
      console.warn('MongoDB order create fallback:', e.message);
    }
  }

  return dataStore.saveOrder(orderData);
};

const getUserOrders = async (userIdOrPhone) => {
  if (!userIdOrPhone) {
    return dataStore.getOrders();
  }
  const str = String(userIdOrPhone).trim();
  const isPhone = /^\+?[0-9\s-]{7,}$/.test(str);
  if (isPhone) {
    return dataStore.getOrders({ phone: str });
  }
  return dataStore.getOrders({ userId: str });
};

const getOrderById = async (orderId) => {
  const order = dataStore.getOrderById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const getAllOrdersForAdmin = async (filter = {}) => {
  return dataStore.getOrders(filter);
};

const updateOrderStatus = async (orderId, status) => {
  const updated = dataStore.updateOrderStatus(orderId, status);
  if (!updated) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return updated;
};

const getAdminStats = async () => {
  return dataStore.getAdminStats();
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrdersForAdmin,
  updateOrderStatus,
  getAdminStats
};
