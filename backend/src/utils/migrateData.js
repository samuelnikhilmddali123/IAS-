const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Admin = require('../models/Admin');
const Food = require('../models/Food');
const Order = require('../models/Order');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const FOODS_FILE = path.join(DATA_DIR, 'foods.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function readJSONSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.warn(`[Migration] Error reading ${filePath}:`, err.message);
  }
  return [];
}

async function migrateData() {
  if (mongoose.connection.readyState !== 1) {
    console.log('[Migration] MongoDB not connected, skipping JSON migration.');
    return;
  }

  console.log('[Migration] Checking MongoDB and JSON store synchronization...');

  // 1. Migrate Users
  try {
    const jsonUsers = readJSONSafe(USERS_FILE);
    let usersMigrated = 0;
    for (const u of jsonUsers) {
      const cleanPhone = String(u.phone || '').trim();
      const cleanEmail = String(u.email || '').trim().toLowerCase();
      if (!cleanPhone && !cleanEmail) continue;

      const existing = await User.findOne({
        $or: [
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      });

      if (!existing) {
        const pin = u.pin || u.password || '123456';
        const hashedPassword = await bcrypt.hash(pin, 10);
        await User.create({
          name: u.name,
          email: cleanEmail || `${cleanPhone}@canteen.gov.in`,
          phone: cleanPhone,
          password: hashedPassword,
          pin: pin,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          designation: u.designation || 'IAS Officer • Special Duty',
          department: u.department || 'Cabinet Secretariat • Government of India',
          officerId: u.officerId || ('GOI-DL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)),
          role: u.role || 'user'
        });
        usersMigrated++;
      }
    }
    if (usersMigrated > 0) {
      console.log(`[Migration] Successfully migrated ${usersMigrated} officer user(s) to MongoDB`);
    }
  } catch (err) {
    console.error('[Migration] Error migrating users:', err.message);
  }

  // 2. Migrate Admins
  try {
    const jsonAdmins = readJSONSafe(ADMINS_FILE);
    let adminsMigrated = 0;
    for (const a of jsonAdmins) {
      const cleanEmail = String(a.email || '').trim().toLowerCase();
      if (!cleanEmail) continue;

      const existing = await Admin.findOne({ email: cleanEmail });
      if (!existing) {
        const pin = a.pin || a.password || '123456';
        const hashedPassword = await bcrypt.hash(pin, 10);
        await Admin.create({
          name: a.name || 'Canteen Admin',
          email: cleanEmail,
          phone: a.phone || '9876543210',
          password: hashedPassword,
          pin: pin,
          role: a.role || 'SUPER_ADMIN'
        });
        adminsMigrated++;
      }
    }
    if (adminsMigrated > 0) {
      console.log(`[Migration] Successfully migrated ${adminsMigrated} admin(s) to MongoDB`);
    }
  } catch (err) {
    console.error('[Migration] Error migrating admins:', err.message);
  }

  // 3. Migrate Foods
  try {
    const jsonFoods = readJSONSafe(FOODS_FILE);
    let foodsMigrated = 0;
    for (const f of jsonFoods) {
      const existing = await Food.findOne({
        $or: [
          ...(f.id ? [{ id: f.id }] : []),
          { name: f.name }
        ]
      });

      if (!existing) {
        await Food.create({
          id: f.id || ('food-' + Date.now()),
          name: f.name,
          description: f.description || '',
          portion: f.portion || 'Standard Serving',
          price: Number(f.price) || 0,
          isVeg: f.isVeg !== undefined ? Boolean(f.isVeg) : true,
          category: (f.category || 'lunch').toLowerCase(),
          subCategory: f.subCategory || 'General',
          availableQuantity: Number(f.availableQuantity) || 50,
          isAvailable: f.isAvailable !== undefined ? Boolean(f.isAvailable) : true,
          image: f.image || '',
          rating: Number(f.rating) || 4.8
        });
        foodsMigrated++;
      }
    }
    if (foodsMigrated > 0) {
      console.log(`[Migration] Successfully migrated ${foodsMigrated} menu food items to MongoDB`);
    }
  } catch (err) {
    console.error('[Migration] Error migrating foods:', err.message);
  }

  // 4. Migrate Orders
  try {
    const jsonOrders = readJSONSafe(ORDERS_FILE);
    let ordersMigrated = 0;
    for (const o of jsonOrders) {
      if (!o.orderNumber) continue;
      const existing = await Order.findOne({ orderNumber: o.orderNumber });
      if (!existing) {
        await Order.create({
          orderNumber: o.orderNumber,
          userId: o.userId || (o.user && o.user.id) || 'guest',
          userName: o.userName || (o.user && o.user.name) || 'IAS Officer',
          userPhone: o.userPhone || (o.user && o.user.phone) || '',
          userAvatar: o.userAvatar || (o.user && o.user.avatar) || '',
          items: Array.isArray(o.items) ? o.items.map(item => ({
            foodId: item.foodId || item.id || '',
            id: item.id || '',
            name: item.name || (item.item && item.item.name) || 'Food item',
            quantity: item.quantity || 1,
            price: item.price || (item.item && item.item.price) || 0,
            total: (item.quantity || 1) * (item.price || (item.item && item.item.price) || 0),
            image: item.image || (item.item && item.item.image) || ''
          })) : [],
          subtotal: Number(o.subtotal || o.totalAmount) || 0,
          totalAmount: Number(o.totalAmount || o.subtotal) || 0,
          grandTotal: Number(o.totalAmount || o.subtotal) || 0,
          paymentMethod: o.paymentMethod || 'online',
          orderNote: o.orderNote || '',
          mealSlot: o.mealSlot || 'General',
          status: o.status || 'PREPARING',
          tokenNumber: o.tokenNumber || Math.floor(10 + Math.random() * 90),
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date()
        });
        ordersMigrated++;
      }
    }
    if (ordersMigrated > 0) {
      console.log(`[Migration] Successfully migrated ${ordersMigrated} order(s) to MongoDB`);
    }
  } catch (err) {
    console.error('[Migration] Error migrating orders:', err.message);
  }

  console.log('[Migration] Migration check complete.');
}

module.exports = migrateData;
