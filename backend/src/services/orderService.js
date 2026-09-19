const dataStore = require('../storage/dataStore');
const Order = require('../models/Order');
const Food = require('../models/Food');
const User = require('../models/User');
const mongoose = require('mongoose');

function formatOrderDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: String(obj._id),
    _id: obj._id,
    orderNumber: obj.orderNumber,
    userId: obj.userId || (obj.user && String(obj.user._id || obj.user)) || 'guest',
    userName: obj.userName || 'IAS Officer',
    userPhone: obj.userPhone || '',
    userAvatar: obj.userAvatar || '',
    items: Array.isArray(obj.items) ? obj.items.map(item => ({
      foodId: item.foodId || item.id || '',
      id: item.id || item.foodId || '',
      name: item.name || (item.item && item.item.name) || 'Food item',
      quantity: item.quantity || 1,
      price: item.price || (item.item && item.item.price) || 0,
      total: (item.quantity || 1) * (item.price || (item.item && item.item.price) || 0),
      image: item.image || (item.item && item.item.image) || ''
    })) : [],
    subtotal: Number(obj.subtotal || obj.totalAmount) || 0,
    totalAmount: Number(obj.totalAmount || obj.subtotal) || 0,
    grandTotal: Number(obj.grandTotal || obj.totalAmount || obj.subtotal) || 0,
    paymentMethod: obj.paymentMethod || 'online',
    orderNote: obj.orderNote || '',
    mealSlot: obj.mealSlot || 'General',
    status: obj.status || 'PREPARING',
    tokenNumber: obj.tokenNumber || Math.floor(10 + Math.random() * 90),
    billNumber: obj.billNumber || null,
    createdAt: obj.createdAt
  };
}

const createOrder = async (orderData) => {
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    const error = new Error('Order must contain at least one item');
    error.statusCode = 400;
    throw error;
  }

  const orderNumber = orderData.orderNumber || ('ORD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000));
  const subtotal = Number(orderData.subtotal || orderData.totalAmount) || 0;
  const totalAmount = Number(orderData.totalAmount || orderData.subtotal) || 0;
  const tokenNumber = orderData.tokenNumber || Math.floor(10 + Math.random() * 90);

  const formattedItems = orderData.items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price || (item.item && item.item.price)) || 0;
    return {
      foodId: String(item.foodId || item.id || (item.item && (item.item.id || item.item._id)) || ''),
      id: String(item.id || item.foodId || ''),
      name: item.name || (item.item && item.item.name) || 'Food item',
      quantity: qty,
      price: price,
      total: qty * price,
      image: item.image || (item.item && item.item.image) || ''
    };
  });

  const orderPayload = {
    orderNumber,
    userId: orderData.userId || (orderData.user && (orderData.user.id || String(orderData.user._id))) || 'guest',
    userName: orderData.userName || (orderData.user && orderData.user.name) || 'IAS Officer',
    userPhone: orderData.userPhone || (orderData.user && orderData.user.phone) || '',
    userAvatar: orderData.userAvatar || (orderData.user && orderData.user.avatar) || '',
    items: formattedItems,
    subtotal,
    totalAmount,
    grandTotal: totalAmount,
    paymentMethod: orderData.paymentMethod || 'online',
    orderNote: orderData.orderNote || '',
    mealSlot: orderData.mealSlot || 'General',
    status: 'PREPARING',
    tokenNumber
  };

  let savedOrder = null;

  // Primary: Save in MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      const isUserObjectId = mongoose.Types.ObjectId.isValid(orderPayload.userId);
      const mongoOrder = await Order.create({
        ...orderPayload,
        ...(isUserObjectId ? { user: orderPayload.userId } : {})
      });
      savedOrder = formatOrderDoc(mongoOrder);
    } catch (e) {
      console.warn('[ORDER] MongoDB createOrder warning:', e.message);
    }
  }

  // Dual-store synchronization
  const jsonOrder = dataStore.saveOrder({
    ...orderPayload,
    id: 'ord-' + Date.now()
  });

  return savedOrder || jsonOrder;
};

const getUserOrders = async (userIdOrPhone) => {
  if (!userIdOrPhone) {
    return getAllOrdersForAdmin();
  }

  const str = String(userIdOrPhone).trim();
  const cleanPhone = str.replace(/\D/g, '').slice(-10);

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(str);
      const query = {
        $or: [
          { userId: str },
          ...(isObjectId ? [{ user: str }] : []),
          { userPhone: str },
          ...(cleanPhone ? [{ userPhone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      const orders = await Order.find(query).sort({ createdAt: -1 });
      if (orders && orders.length > 0) {
        return orders.map(formatOrderDoc);
      }
    } catch (e) {
      console.warn('[ORDER] MongoDB getUserOrders fallback:', e.message);
    }
  }

  const isPhone = /^\+?[0-9\s-]{7,}$/.test(str);
  if (isPhone) {
    return dataStore.getOrders({ phone: str });
  }
  return dataStore.getOrders({ userId: str });
};

const getOrderById = async (orderId) => {
  if (!orderId) {
    const error = new Error('Order ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
      const order = await Order.findOne({
        $or: [
          ...(isObjectId ? [{ _id: orderId }] : []),
          { orderNumber: orderId }
        ]
      });
      if (order) return formatOrderDoc(order);
    } catch (e) {
      console.warn('[ORDER] MongoDB getOrderById fallback:', e.message);
    }
  }

  const order = dataStore.getOrderById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const getAllOrdersForAdmin = async (filter = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const query = {};
      if (filter.status) {
        query.status = filter.status;
      }
      if (filter.userId) {
        query.userId = filter.userId;
      }
      if (filter.phone) {
        const clean = String(filter.phone).replace(/\D/g, '').slice(-10);
        query.userPhone = new RegExp(clean + '$');
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });
      if (orders && orders.length > 0) {
        return orders.map(formatOrderDoc);
      }
    } catch (e) {
      console.warn('[ORDER] MongoDB getAllOrdersForAdmin fallback:', e.message);
    }
  }

  return dataStore.getOrders(filter);
};

const updateOrderStatus = async (orderId, status) => {
  if (!orderId || !status) {
    const error = new Error('Order ID and status are required');
    error.statusCode = 400;
    throw error;
  }

  let updatedOrder = null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
      const mongoOrder = await Order.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: orderId }] : []),
            { orderNumber: orderId }
          ]
        },
        { $set: { status, updatedAt: new Date() } },
        { new: true }
      );
      if (mongoOrder) {
        updatedOrder = formatOrderDoc(mongoOrder);
      }
    } catch (e) {
      console.warn('[ORDER] MongoDB updateOrderStatus warning:', e.message);
    }
  }

  const jsonOrder = dataStore.updateOrderStatus(orderId, status);
  if (!updatedOrder && !jsonOrder) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return updatedOrder || jsonOrder;
};

const getAdminStats = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const orders = await Order.find();
      const foods = await Food.find();
      const users = await User.find();

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().startsWith(todayStr));

      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount || o.grandTotal) || 0), 0);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.grandTotal) || 0), 0);
      const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');

      const categoryCounts = {
        breakfast: foods.filter(f => (f.category || '').toLowerCase() === 'breakfast').length,
        lunch: foods.filter(f => (f.category || '').toLowerCase() === 'lunch').length,
        dinner: foods.filter(f => (f.category || '').toLowerCase() === 'dinner').length,
        snacks: foods.filter(f => (f.category || '').toLowerCase() === 'snacks').length,
      };

      return {
        totalRevenue,
        todayRevenue,
        totalOrdersCount: orders.length,
        todayOrdersCount: todayOrders.length,
        activeOrdersCount: activeOrders.length,
        totalFoodsCount: foods.length,
        totalOfficersCount: users.length,
        categoryCounts
      };
    } catch (e) {
      console.warn('[ORDER] MongoDB getAdminStats fallback:', e.message);
    }
  }

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
