const dataStore = require('../storage/dataStore');
const Order = require('../models/Order');
const Food = require('../models/Food');
const User = require('../models/User');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const RESTAURANT_UPI_ID = process.env.RESTAURANT_UPI_ID || 'canteen.services@gov';
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Canteen Services GOI';

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
    orderType: obj.orderType || 'INSTANT',
    pickupDate: obj.pickupDate ? new Date(obj.pickupDate) : null,
    pickupTime: obj.pickupTime || null,
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
    paymentStatus: obj.paymentStatus || 'UNPAID',
    orderNote: obj.orderNote || '',
    mealSlot: obj.mealSlot || 'General',
    status: obj.status || 'PREPARING',
    kitchenStatus: obj.kitchenStatus || 'NEW',
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
  const tokenNumber = orderData.tokenNumber || Math.floor(10 + Math.random() * 90);

  // Security Rule #14: Never trust total amount sent from frontend.
  // Validate and compute order total on backend using actual food prices.
  let foodsCatalog = [];
  if (mongoose.connection.readyState === 1) {
    try {
      foodsCatalog = await Food.find();
    } catch (e) {
      console.warn('[ORDER] Food price lookup warning:', e.message);
    }
  }
  if (!foodsCatalog || foodsCatalog.length === 0) {
    foodsCatalog = dataStore.getFoods ? dataStore.getFoods() : [];
  }

  const foodPriceMap = new Map();
  foodsCatalog.forEach(f => {
    const p = Number(f.price) || 0;
    if (f.id) foodPriceMap.set(String(f.id), p);
    if (f._id) foodPriceMap.set(String(f._id), p);
    if (f.name) foodPriceMap.set(f.name.toLowerCase().trim(), p);
  });

  let calculatedSubtotal = 0;
  const formattedItems = orderData.items.map(item => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const idKey = String(item.foodId || item.id || (item.item && (item.item.id || item.item._id)) || '');
    const nameKey = String(item.name || (item.item && item.item.name) || '').toLowerCase().trim();

    let unitPrice = 0;
    if (idKey && foodPriceMap.has(idKey)) {
      unitPrice = foodPriceMap.get(idKey);
    } else if (nameKey && foodPriceMap.has(nameKey)) {
      unitPrice = foodPriceMap.get(nameKey);
    } else {
      unitPrice = Number(item.price || (item.item && item.item.price)) || 0;
    }

    const itemTotal = qty * unitPrice;
    calculatedSubtotal += itemTotal;

    return {
      foodId: idKey,
      id: idKey,
      name: item.name || (item.item && item.item.name) || 'Food item',
      quantity: qty,
      price: unitPrice,
      total: itemTotal,
      image: item.image || (item.item && item.item.image) || ''
    };
  });

  const subtotal = calculatedSubtotal;
  const totalAmount = calculatedSubtotal;

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
    paymentStatus: orderData.paymentStatus || 'UNPAID',
    orderType: orderData.orderType || 'INSTANT',
    ...(orderData.orderType === 'PRE_ORDER' ? {
      pickupDate: orderData.pickupDate,
      pickupTime: orderData.pickupTime
    } : {}),
    orderNote: orderData.orderNote || '',
    mealSlot: orderData.mealSlot || 'General',
    status: orderData.orderType === 'PRE_ORDER' ? 'PRE_ORDERED' : 'PREPARING',
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

  const finalOrder = savedOrder || jsonOrder;

  // Emit KOT event to kitchen via Socket.io in real-time
  try {
    const serverModule = require('../../server');
    const io = serverModule.io || (serverModule.getIO && serverModule.getIO());
    if (io) {
      const kotPayload = {
        orderNumber: finalOrder.orderNumber,
        tokenNumber: finalOrder.tokenNumber,
        customerName: finalOrder.userName || 'IAS Officer',
        userName: finalOrder.userName || 'IAS Officer',
        userPhone: finalOrder.userPhone || '',
        foodItemNames: (finalOrder.items || []).map(i => i.name),
        items: finalOrder.items,
        orderNote: finalOrder.orderNote || '',
        orderCreationTime: finalOrder.createdAt,
        orderTime: finalOrder.createdAt,
        pickupTime: finalOrder.pickupTime || null,
        pickupDate: finalOrder.pickupDate || null,
        orderType: finalOrder.orderType || 'INSTANT',
        kitchenStatus: finalOrder.kitchenStatus || 'NEW'
      };

      io.emit('newKOT', kotPayload);
      io.of('/kitchen').emit('newKOT', kotPayload);
      io.emit('newOrder', finalOrder);
      console.log(`[KOT] Dispatched live ticket for Order #${finalOrder.orderNumber} (Status: NEW)`);
    }
  } catch (e) {
    console.warn('[KOT] Failed to emit newKOT event:', e.message);
  }

  return finalOrder;
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
      const userPhones = [str];
      if (cleanPhone) userPhones.push(cleanPhone);

      // If str is a valid user ObjectId, also retrieve the user document to grab associated phone numbers
      if (isObjectId) {
        try {
          const userDoc = await User.findById(str);
          if (userDoc && userDoc.phone) {
            userPhones.push(userDoc.phone);
            const pClean = userDoc.phone.replace(/\D/g, '').slice(-10);
            if (pClean) userPhones.push(pClean);
          }
        } catch {}
      }

      const query = {
        $or: [
          { userId: str },
          ...(isObjectId ? [{ user: str }] : []),
          ...userPhones.map(p => ({ userPhone: p })),
          ...(cleanPhone ? [{ userPhone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      const orders = await Order.find(query).sort({ createdAt: -1 });
      return orders.map(formatOrderDoc);
    } catch (e) {
      console.warn('[ORDER] MongoDB getUserOrders error:', e.message);
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

const VALID_TRANSITIONS = {
  'NEW': ['ACCEPTED', 'CANCELLED'],
  'PENDING': ['ACCEPTED', 'CANCELLED'],
  'PRE_ORDERED': ['ACCEPTED', 'CANCELLED'],
  'ACCEPTED': ['PREPARING', 'CANCELLED'],
  'PREPARING': ['READY', 'CANCELLED'],
  'READY': ['COMPLETED'],
  'COMPLETED': [],
  'CANCELLED': []
};

const updateOrderStatus = async (orderId, status) => {
  if (!orderId || !status) {
    const error = new Error('Order ID and status are required');
    error.statusCode = 400;
    throw error;
  }

  const targetStatus = status.toUpperCase().trim();
  const existingOrder = await getOrderById(orderId);
  const currentStatus = (existingOrder.kitchenStatus || existingOrder.status || 'NEW').toUpperCase().trim();

  // Validate state transitions (Requirement 4 & 18: NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED)
  if (currentStatus !== targetStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (allowed && !allowed.includes(targetStatus)) {
      const error = new Error(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Expected next status: ${allowed.join(' or ') || 'None (order finalized)'}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  let updatedOrder = null;
  const updateFields = {
    status: targetStatus,
    kitchenStatus: targetStatus,
    updatedAt: new Date()
  };

  // Requirement 5: When admin changes READY -> COMPLETED, backend must automatically make order paymentStatus: UNPAID
  if (targetStatus === 'COMPLETED') {
    updateFields.paymentStatus = 'UNPAID';
  }

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
        { $set: updateFields },
        { returnDocument: 'after' }
      );
      if (mongoOrder) {
        updatedOrder = formatOrderDoc(mongoOrder);
      }
    } catch (e) {
      console.warn('[ORDER] MongoDB updateOrderStatus warning:', e.message);
    }
  }

  const jsonOrder = dataStore.updateOrderStatus(orderId, targetStatus);
  if (jsonOrder && targetStatus === 'COMPLETED') {
    jsonOrder.paymentStatus = 'UNPAID';
  }
  if (!updatedOrder && !jsonOrder) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const finalOrder = updatedOrder || jsonOrder;

  // Real-time broadcast to all connected clients and kitchen displays (Requirement 5 & 6)
  try {
    const serverModule = require('../../server');
    const io = serverModule.io || (serverModule.getIO && serverModule.getIO());
    if (io) {
      io.emit('orderStatusUpdated', finalOrder);
      io.emit('orderUpdated', finalOrder);
      io.of('/kitchen').emit('orderStatusUpdated', finalOrder);
      console.log(`[Socket.IO] Broadcasted orderStatusUpdated for #${finalOrder.orderNumber}: ${currentStatus} -> ${targetStatus}`);
    }
  } catch (sockErr) {
    console.warn('[ORDER] Socket.IO broadcast warning:', sockErr.message);
  }

  return finalOrder;
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

const updatePaymentStatus = async (orderId, paymentStatus) => {
  if (!orderId || !paymentStatus) {
    const error = new Error('Order ID and paymentStatus are required');
    error.statusCode = 400;
    throw error;
  }

  const validStatuses = ['UNPAID', 'PAYMENT_PENDING', 'PAID'];
  if (!validStatuses.includes(paymentStatus)) {
    const error = new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
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
        { $set: { paymentStatus, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (mongoOrder) {
        updatedOrder = formatOrderDoc(mongoOrder);
      }
    } catch (e) {
      console.warn('[ORDER] MongoDB updatePaymentStatus warning:', e.message);
    }
  }

  const jsonOrder = dataStore.updatePaymentStatus ? dataStore.updatePaymentStatus(orderId, paymentStatus) : null;
  if (!updatedOrder && !jsonOrder) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const finalOrder = updatedOrder || jsonOrder;

  // Real-time broadcast to all connected clients and kitchen displays
  try {
    const serverModule = require('../../server');
    const io = serverModule.io || (serverModule.getIO && serverModule.getIO());
    if (io) {
      io.emit('orderStatusUpdated', finalOrder);
      io.emit('orderUpdated', finalOrder);
      io.of('/kitchen').emit('orderStatusUpdated', finalOrder);
      console.log(`[Socket.IO] Broadcasted paymentStatus for #${finalOrder.orderNumber}: ${finalOrder.paymentStatus}`);
    }
  } catch (sockErr) {
    console.warn('[ORDER] Socket.IO payment broadcast warning:', sockErr.message);
  }

  return finalOrder;
};

const getUnpaidOrders = async (userIdOrPhone) => {
  const allUserOrders = await getUserOrders(userIdOrPhone);
  const unpaid = (allUserOrders || []).filter(o => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PAYMENT_PENDING');
  const totalOutstanding = unpaid.reduce((sum, o) => sum + (Number(o.totalAmount || o.grandTotal) || 0), 0);
  return {
    orders: unpaid,
    totalOutstanding,
    count: unpaid.length
  };
};

const getRestaurantPaymentQr = async (amount = 0, orderIds = []) => {
  const numAmount = Number(amount) || 0;
  const upiId = RESTAURANT_UPI_ID;
  const payeeName = RESTAURANT_NAME;

  // Standard UPI payment URI format
  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}${numAmount > 0 ? `&am=${numAmount.toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent('Canteen Food Orders Settlement')}`;

  const qrDataUrl = await QRCode.toDataURL(upiPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0a3d31', // Government Forest Green
      light: '#ffffff'
    }
  });

  return {
    qrDataUrl,
    upiPayload,
    upiId,
    payeeName,
    amount: numAmount,
    orderIds,
    paymentInstructions: 'Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI app to pay the canteen counter.'
  };
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  getAllOrdersForAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  getUnpaidOrders,
  getRestaurantPaymentQr,
  getAdminStats
};
