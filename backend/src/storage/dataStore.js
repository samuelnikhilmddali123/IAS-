const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FOODS_FILE = path.join(DATA_DIR, 'foods.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading JSON from ' + filePath + ':', err.message);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON to ' + filePath + ':', err.message);
  }
}

const INITIAL_FOODS = [
  // Breakfast Items
  {
    id: 'food-b1',
    name: 'Idli (2 pcs)',
    description: 'Soft steamed rice cakes served with hot sambar and coconut chutney',
    portion: '2 pcs with Sambar & Chutney',
    price: 25,
    isVeg: true,
    category: 'breakfast',
    subCategory: 'South Indian',
    availableQuantity: 50,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-b2',
    name: 'Masala Dosa',
    description: 'Crisp golden crepe stuffed with mildly spiced potato masala',
    portion: 'Crispy with potato masala',
    price: 50,
    isVeg: true,
    category: 'breakfast',
    subCategory: 'South Indian',
    availableQuantity: 40,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=80',
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-b3',
    name: 'Upma',
    description: 'Wholesome roasted semolina cooked with vegetables and mild spices',
    portion: 'Served with Coconut Chutney',
    price: 30,
    isVeg: true,
    category: 'breakfast',
    subCategory: 'Healthy',
    availableQuantity: 30,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80',
    rating: 4.5,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-b4',
    name: 'Pongal',
    description: 'Rich ghee ven pongal infused with cumin, black pepper, and cashews',
    portion: 'Ghee Pongal with Medu Vada',
    price: 35,
    isVeg: true,
    category: 'breakfast',
    subCategory: 'South Indian',
    availableQuantity: 35,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
    rating: 4.7,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-b5',
    name: 'Poha',
    description: 'Light and fluffy flattened rice tempered with mustard, curry leaves and roasted peanuts',
    portion: 'Indori flattened rice with peanuts',
    price: 25,
    isVeg: true,
    category: 'breakfast',
    subCategory: 'Healthy',
    availableQuantity: 30,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
    rating: 4.6,
    createdAt: new Date().toISOString()
  },

  // Lunch Items
  {
    id: 'food-l1',
    name: 'South Indian Thali',
    description: 'Traditional wholesome spread of steamed rice, sambar, rasam, kootu, curd, and appalam',
    portion: 'Rice, Sambar, Rasam, Poriyal, Curd, Appalam',
    price: 80,
    isVeg: true,
    category: 'lunch',
    subCategory: 'South Indian',
    availableQuantity: 60,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=500&q=80',
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-l2',
    name: 'North Indian Thali',
    description: 'Hearty meal with 3 butter rotis, aromatic paneer sabzi, yellow dal tadka, jeera rice and dessert',
    portion: '3 Rotis, Paneer Curry, Dal, Rice, Sweet',
    price: 90,
    isVeg: true,
    category: 'lunch',
    subCategory: 'North Indian',
    availableQuantity: 60,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=500&q=80',
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-l3',
    name: 'Veg Dum Biryani',
    description: 'Fragrant basmati rice layered with garden vegetables, saffron and mint, served with raita',
    portion: 'Full Portion with Onion Raita & Salan',
    price: 90,
    isVeg: true,
    category: 'lunch',
    subCategory: 'North Indian',
    availableQuantity: 40,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
    rating: 4.7,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-l4',
    name: 'Curd Rice',
    description: 'Creamy tempered yogurt rice topped with pomegranate and ginger',
    portion: 'Served with Pickle & Mor Milagai',
    price: 40,
    isVeg: true,
    category: 'lunch',
    subCategory: 'South Indian',
    availableQuantity: 30,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
    rating: 4.6,
    createdAt: new Date().toISOString()
  },

  // Snacks & Beverages Items
  {
    id: 'food-s1',
    name: 'Medu Vada (2 pcs)',
    description: 'Crisp golden lentil doughnuts with ginger and peppercorns',
    portion: '2 pcs with Sambar & Chutney',
    price: 30,
    isVeg: true,
    category: 'snacks',
    subCategory: 'South Indian',
    availableQuantity: 40,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
    rating: 4.7,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-s2',
    name: 'Samosa (2 pcs)',
    description: 'Crisp pastry stuffed with spiced potatoes and green peas, served with mint chutney',
    portion: '2 pcs with Chutney',
    price: 25,
    isVeg: true,
    category: 'snacks',
    subCategory: 'North Indian',
    availableQuantity: 50,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
    rating: 4.6,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-s3',
    name: 'South Indian Filter Coffee',
    description: 'Freshly brewed aromatic chicory-coffee decoction blended with hot frothy milk',
    portion: '1 Cup in Brass Davarah',
    price: 20,
    isVeg: true,
    category: 'snacks',
    subCategory: 'Beverages',
    availableQuantity: 100,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-s4',
    name: 'Masala Chai',
    description: 'Strong Assam tea infused with cardamom, ginger and cloves',
    portion: '1 Cup',
    price: 15,
    isVeg: true,
    category: 'snacks',
    subCategory: 'Beverages',
    availableQuantity: 100,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
    rating: 4.8,
    createdAt: new Date().toISOString()
  },

  // Dinner Items
  {
    id: 'food-d1',
    name: 'Phulka & Paneer Butter Masala',
    description: '4 soft phulkas served with creamy paneer butter masala and onion salad',
    portion: '4 Phulkas + Paneer Sabzi + Salad',
    price: 85,
    isVeg: true,
    category: 'dinner',
    subCategory: 'North Indian',
    availableQuantity: 45,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-d2',
    name: 'Dal Khichdi & Papad',
    description: 'Comforting Moong dal and rice cooked with cumin, ghee and hing, served with roasted papad',
    portion: 'Full Bowl with Desi Ghee & Papad',
    price: 55,
    isVeg: true,
    category: 'dinner',
    subCategory: 'Healthy',
    availableQuantity: 35,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
    rating: 4.7,
    createdAt: new Date().toISOString()
  },
  {
    id: 'food-d3',
    name: 'Chapati with Mixed Veg Curry',
    description: '3 whole wheat chapatis with fresh seasonal vegetable kurma and pickle',
    portion: '3 Chapatis + Mixed Veg Kurma',
    price: 60,
    isVeg: true,
    category: 'dinner',
    subCategory: 'South Indian',
    availableQuantity: 40,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
    rating: 4.6,
    createdAt: new Date().toISOString()
  }
];

// Initialize seed data if files are empty
function initStorage() {
  const existingFoods = readJSON(FOODS_FILE);
  if (!existingFoods || existingFoods.length === 0) {
    writeJSON(FOODS_FILE, INITIAL_FOODS);
    console.log('[Storage] Initialized ' + INITIAL_FOODS.length + ' food items');
  }

  const existingAdmins = readJSON(ADMINS_FILE);
  if (!existingAdmins || existingAdmins.length === 0) {
    writeJSON(ADMINS_FILE, [
      {
        id: 'admin-1',
        name: 'Canteen Administrator',
        email: 'admin@canteen.gov.in',
        phone: '9876543210',
        pin: '123456',
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString()
      }
    ]);
    console.log('[Storage] Initialized default admin account (admin@canteen.gov.in / 123456)');
  }
}

initStorage();

// Data Store APIs
const dataStore = {
  // Foods
  getFoods(filter = {}) {
    let foods = readJSON(FOODS_FILE);
    if (filter.category && filter.category !== 'all') {
      const cat = filter.category.toLowerCase();
      foods = foods.filter(f => f.category && f.category.toLowerCase() === cat);
    }
    if (filter.subCategory) {
      foods = foods.filter(f => f.subCategory && f.subCategory.toLowerCase() === filter.subCategory.toLowerCase());
    }
    if (filter.isVeg !== undefined) {
      const isVeg = String(filter.isVeg) === 'true';
      foods = foods.filter(f => f.isVeg === isVeg);
    }
    if (filter.isAvailable !== undefined) {
      const avail = String(filter.isAvailable) === 'true';
      foods = foods.filter(f => f.isAvailable === avail);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      foods = foods.filter(f => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }
    return foods;
  },

  getFoodById(id) {
    const foods = readJSON(FOODS_FILE);
    return foods.find(f => f.id === id || String(f._id) === id);
  },

  saveFood(foodData) {
    const foods = readJSON(FOODS_FILE);
    const newFood = {
      id: foodData.id || ('food-' + Date.now()),
      name: foodData.name,
      description: foodData.description || '',
      portion: foodData.portion || 'Standard Serving',
      price: Number(foodData.price) || 0,
      isVeg: foodData.isVeg !== undefined ? Boolean(foodData.isVeg) : true,
      category: (foodData.category || 'lunch').toLowerCase(),
      subCategory: foodData.subCategory || 'General',
      availableQuantity: Number(foodData.availableQuantity) || 50,
      isAvailable: foodData.isAvailable !== undefined ? Boolean(foodData.isAvailable) : true,
      image: foodData.image || 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
      rating: Number(foodData.rating) || 4.8,
      createdAt: new Date().toISOString()
    };
    foods.unshift(newFood);
    writeJSON(FOODS_FILE, foods);
    return newFood;
  },

  updateFood(id, updates) {
    const foods = readJSON(FOODS_FILE);
    const idx = foods.findIndex(f => f.id === id || String(f._id) === id);
    if (idx === -1) return null;
    foods[idx] = {
      ...foods[idx],
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : foods[idx].price,
      availableQuantity: updates.availableQuantity !== undefined ? Number(updates.availableQuantity) : foods[idx].availableQuantity,
      updatedAt: new Date().toISOString()
    };
    writeJSON(FOODS_FILE, foods);
    return foods[idx];
  },

  deleteFood(id) {
    let foods = readJSON(FOODS_FILE);
    const before = foods.length;
    foods = foods.filter(f => f.id !== id && String(f._id) !== id);
    writeJSON(FOODS_FILE, foods);
    return foods.length < before;
  },

  // Users / Officers
  getUsers() {
    return readJSON(USERS_FILE);
  },

  getUserById(id) {
    const users = readJSON(USERS_FILE);
    return users.find(u => u.id === id || String(u._id) === id);
  },

  getUserByPhone(phone) {
    const clean = String(phone).replace(/\D/g, '');
    const users = readJSON(USERS_FILE);
    return users.find(u => {
      const uClean = String(u.phone).replace(/\D/g, '');
      return uClean.endsWith(clean.slice(-10)) || clean.endsWith(uClean.slice(-10));
    });
  },

  getUserByEmail(email) {
    if (!email) return null;
    const users = readJSON(USERS_FILE);
    return users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  },

  getUserByFingerprint(fingerprint) {
    if (!fingerprint) return null;
    const users = readJSON(USERS_FILE);
    return users.find(u => u.passwordUniquenessFingerprint === fingerprint);
  },

  saveUser(userData) {
    const users = readJSON(USERS_FILE);
    const cleanPhone = String(userData.phone).trim();
    
    // Check if user exists by phone or email
    const existingIdx = users.findIndex(u => {
      const phoneMatch = String(u.phone).replace(/\D/g, '').endsWith(cleanPhone.replace(/\D/g, '').slice(-10));
      const emailMatch = userData.email && u.email && u.email.toLowerCase() === userData.email.toLowerCase();
      return phoneMatch || emailMatch;
    });

    const officerId = userData.officerId || ('GOI-DL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));

    const userObj = {
      id: userData.id || ('usr-' + Date.now()),
      name: userData.name,
      email: userData.email || '',
      phone: cleanPhone,
      pin: userData.pin || userData.password || '123456',
      passwordUniquenessFingerprint: userData.passwordUniquenessFingerprint || null,
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      designation: userData.designation || 'IAS Officer • Special Duty',
      department: userData.department || 'Cabinet Secretariat • Government of India',
      officerId: officerId,
      createdAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      users[existingIdx] = { ...users[existingIdx], ...userObj, updatedAt: new Date().toISOString() };
      writeJSON(USERS_FILE, users);
      return users[existingIdx];
    } else {
      users.unshift(userObj);
      writeJSON(USERS_FILE, users);
      return userObj;
    }
  },

  updateUserPhone(userId, newPhone) {
    const users = readJSON(USERS_FILE);
    const idx = users.findIndex(u => u.id === userId || u.officerId === userId || String(u._id) === userId);
    if (idx === -1) return null;
    const cleanPhone = String(newPhone).trim();
    users[idx].phone = cleanPhone;
    users[idx].updatedAt = new Date().toISOString();
    writeJSON(USERS_FILE, users);
    return users[idx];
  },

  deleteUser(userId) {
    let users = readJSON(USERS_FILE);
    const initialLen = users.length;
    users = users.filter(u => u.id !== userId && u.officerId !== userId && String(u._id) !== userId);
    writeJSON(USERS_FILE, users);
    return users.length < initialLen;
  },

  // Orders
  getOrders(filter = {}) {
    let orders = readJSON(ORDERS_FILE);
    if (filter.userId) {
      orders = orders.filter(o => o.userId === filter.userId || (o.user && o.user.id === filter.userId));
    }
    if (filter.phone) {
      const clean = String(filter.phone).replace(/\D/g, '');
      orders = orders.filter(o => {
        const uPhone = String(o.userPhone || (o.user && o.user.phone) || '').replace(/\D/g, '');
        return uPhone.endsWith(clean.slice(-10));
      });
    }
    if (filter.status) {
      orders = orders.filter(o => o.status === filter.status);
    }
    if (filter.paymentStatus) {
      orders = orders.filter(o => (o.paymentStatus || 'PAYMENT_PENDING') === filter.paymentStatus);
    }
    return orders;
  },

  getOrderById(id) {
    const orders = readJSON(ORDERS_FILE);
    return orders.find(o => o.id === id || o.orderNumber === id || String(o._id) === id);
  },

  saveOrder(orderData) {
    const orders = readJSON(ORDERS_FILE);
    const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    
    const newOrder = {
      id: 'ord-' + Date.now(),
      orderNumber: orderNumber,
      userId: orderData.userId || (orderData.user && orderData.user.id) || 'guest',
      userName: orderData.userName || (orderData.user && orderData.user.name) || 'IAS Officer',
      userPhone: orderData.userPhone || (orderData.user && orderData.user.phone) || '',
      userAvatar: orderData.userAvatar || (orderData.user && orderData.user.avatar) || '',
      items: Array.isArray(orderData.items) ? orderData.items : [],
      subtotal: Number(orderData.subtotal || orderData.totalAmount) || 0,
      totalAmount: Number(orderData.totalAmount || orderData.subtotal) || 0,
      paymentMethod: orderData.paymentMethod || 'online',
      paymentStatus: orderData.paymentStatus || 'PAYMENT_PENDING',
      orderNote: orderData.orderNote || '',
      mealSlot: orderData.mealSlot || 'General',
      status: 'PREPARING', // Default to PREPARING for direct kitchen flow
      kitchenStatus: 'PREPARING',
      tokenNumber: Math.floor(10 + Math.random() * 90),
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    writeJSON(ORDERS_FILE, orders);
    return newOrder;
  },

  updateOrderStatus(orderId, status) {
    const orders = readJSON(ORDERS_FILE);
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId || String(o._id) === orderId);
    if (idx === -1) return null;
    orders[idx].status = status;
    orders[idx].kitchenStatus = status;
    if (status === 'COMPLETED') {
      orders[idx].paymentStatus = 'UNPAID';
    }
    orders[idx].updatedAt = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
    return orders[idx];
  },

  updatePaymentStatus(orderId, paymentStatus) {
    const orders = readJSON(ORDERS_FILE);
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId || String(o._id) === orderId);
    if (idx === -1) return null;
    orders[idx].paymentStatus = paymentStatus;
    orders[idx].paymentUpdatedAt = new Date().toISOString();
    orders[idx].updatedAt = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
    return orders[idx];
  },

  getUnpaidOrders(filter = {}) {
    const orders = this.getOrders(filter);
    return orders.filter(o => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PAYMENT_PENDING');
  },

  // Admin Stats
  getAdminStats() {
    const orders = readJSON(ORDERS_FILE);
    const foods = readJSON(FOODS_FILE);
    const users = readJSON(USERS_FILE);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
    
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');

    const categoryCounts = {
      breakfast: foods.filter(f => f.category === 'breakfast').length,
      lunch: foods.filter(f => f.category === 'lunch').length,
      dinner: foods.filter(f => f.category === 'dinner').length,
      snacks: foods.filter(f => f.category === 'snacks').length,
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
  }
};

module.exports = dataStore;
