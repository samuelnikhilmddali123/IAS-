const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const dataStore = require('../storage/dataStore');
const qrService = require('./qrService');
const whatsappService = require('./whatsappService');
const { generatePasswordFingerprint } = require('../utils/cryptoUtils');
const { resolveOfficerAvatar, generateOfficialInitialsAvatar } = require('./officerImageService');

const JWT_SECRET = process.env.JWT_SECRET || 'canteen_super_secret_jwt_key_2026_secure';

const registerAdmin = async (adminData) => {
  const { name, email, phone, password } = adminData;

  if (!name || !email || !phone || !password) {
    const error = new Error('All fields are required');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  if (mongoose.connection.readyState === 1) {
    const existing = await Admin.findOne({ email: cleanEmail });
    if (existing) {
      const error = new Error('Admin already exists with this email');
      error.statusCode = 409;
      throw error;
    }

    const admin = await Admin.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: hashedPassword,
      pin: password,
      role: 'SUPER_ADMIN'
    });

    return {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role
    };
  }

  // Fallback to dataStore if MongoDB is offline
  const existingByEmail = dataStore.getUserByEmail(cleanEmail);
  if (existingByEmail && existingByEmail.role === 'admin') {
    const error = new Error('Admin already exists');
    error.statusCode = 409;
    throw error;
  }

  const adminObj = {
    id: 'admin-' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    pin: password,
    password: hashedPassword,
    role: 'admin'
  };
  return adminObj;
};

const loginAdmin = async (email, password) => {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Check MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      const admin = await Admin.findOne({ email: cleanEmail });
      if (admin) {
        let match = false;
        if (admin.password) {
          match = await bcrypt.compare(password, admin.password);
        }
        if (!match && admin.pin) {
          match = admin.pin === password;
        }

        if (match) {
          const token = jwt.sign({ id: String(admin._id), role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
          return {
            token,
            admin: {
              id: String(admin._id),
              name: admin.name,
              email: admin.email,
              phone: admin.phone,
              role: admin.role || 'admin'
            }
          };
        }
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB admin login check error:', e.message);
    }
  }

  // 2. Default credentials check or dataStore fallback
  const isDefaultAdmin = (cleanEmail === 'admin@canteen.gov.in' || cleanEmail === 'admin@canteen.com' || cleanEmail === 'admin') &&
    (password === '123456' || password === 'admin123');

  if (!isDefaultAdmin) {
    const error = new Error('Invalid admin email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ id: 'admin-1', role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  return {
    token,
    admin: {
      id: 'admin-1',
      name: 'Canteen Administrator',
      email: 'admin@canteen.gov.in',
      phone: '9876543210',
      role: 'SUPER_ADMIN'
    }
  };
};

const registerUser = async (userData) => {
  const { name, email, phone, mobile, pin, password, avatar, designation, department, officerId, location } = userData;

  const officerName = (name || '').trim();
  const officerPhone = (phone || mobile || '').trim();
  const officerPin = (pin || password || '').trim();
  const officerEmail = (email || '').trim().toLowerCase() || (officerName.toLowerCase().replace(/\s+/g, '.') + '@gov.in');

  if (!officerName) {
    const error = new Error('Full Name is required');
    error.statusCode = 400;
    throw error;
  }
  if (!officerPhone) {
    const error = new Error('Phone Number is required');
    error.statusCode = 400;
    throw error;
  }
  if (!officerPin || officerPin.length < 4) {
    const error = new Error('A 6-digit PIN / password is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = officerPhone.replace(/\D/g, '').slice(-10);

  // 1. Pre-check for duplicate phone number across all registered users
  if (mongoose.connection.readyState === 1) {
    const existingWithPhone = await User.findOne({
      $or: [
        { phone: officerPhone },
        ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
      ]
    });

    if (existingWithPhone) {
      const error = new Error('This phone number is already registered. Please login or use a different phone number.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (dataStore.getUserByPhone) {
    const existingInStore = dataStore.getUserByPhone(officerPhone);
    if (existingInStore) {
      const error = new Error('This phone number is already registered. Please login or use a different phone number.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 2. Generate secure deterministic fingerprint for global password uniqueness
  const passwordFingerprint = generatePasswordFingerprint(officerPin);
  if (!passwordFingerprint) {
    const error = new Error('A valid password is required');
    error.statusCode = 400;
    throw error;
  }

  // Pre-check for duplicate password across all users
  if (mongoose.connection.readyState === 1) {
    const existingWithFp = await User.findOne({ passwordUniquenessFingerprint: passwordFingerprint });
    if (existingWithFp) {
      const error = new Error('This password is already used. Please choose another password.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (dataStore.getUserByFingerprint) {
    const existingInStore = dataStore.getUserByFingerprint(passwordFingerprint);
    if (existingInStore && existingInStore.phone !== officerPhone) {
      const error = new Error('This password is already used. Please choose another password.');
      error.statusCode = 400;
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(officerPin, 10);
  const generatedOfficerId = officerId || ('GOI-DL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
  const resolvedAvatar = await resolveOfficerAvatar(officerName, avatar);
  const userDesignation = (designation && designation.trim()) ? designation.trim() : 'IAS Officer • Special Duty';
  const userLocation = (location && location.trim()) ? location.trim() : (department && department.trim() ? department.trim() : '');
  const userDepartment = (department && department.trim()) ? department.trim() : (userLocation || 'Cabinet Secretariat • Government of India');

  let savedUser = null;

  // Save to MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      const mongoUser = await User.create({
        name: officerName,
        email: officerEmail,
        phone: officerPhone,
        password: hashedPassword,
        passwordUniquenessFingerprint: passwordFingerprint,
        pin: officerPin,
        avatar: resolvedAvatar,
        designation: userDesignation,
        location: userLocation,
        department: userDepartment,
        officerId: generatedOfficerId,
        role: 'user',
        pinLoggedInAt: new Date(),
        pinExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      savedUser = {
        id: String(mongoUser._id),
        name: mongoUser.name,
        email: mongoUser.email,
        phone: mongoUser.phone,
        pin: mongoUser.pin,
        avatar: mongoUser.avatar,
        designation: mongoUser.designation,
        location: mongoUser.location || '',
        department: mongoUser.department,
        officerId: mongoUser.officerId || generatedOfficerId
      };
    } catch (e) {
      if (e.code === 11000) {
        if (e.message && e.message.includes('phone')) {
          const error = new Error('This phone number is already registered. Please login or use a different phone number.');
          error.statusCode = 400;
          throw error;
        }
        if (e.message && e.message.includes('passwordUniquenessFingerprint')) {
          const error = new Error('This password is already used. Please choose another password.');
          error.statusCode = 400;
          throw error;
        }
      }
      console.warn('[AUTH] MongoDB user registration warning:', e.message);
    }
  }

  if (!savedUser) {
    savedUser = {
      id: 'usr-' + Date.now(),
      name: officerName,
      email: officerEmail,
      phone: officerPhone,
      pin: officerPin,
      avatar: resolvedAvatar,
      designation: userDesignation,
      location: userLocation,
      department: userDepartment,
      officerId: generatedOfficerId
    };
  }

  // Generate Lifetime QR Credential
  const qrInfo = await qrService.generateLifetimeQr({
    userId: savedUser.id,
    userName: savedUser.name,
    userPhone: savedUser.phone,
    officerId: savedUser.officerId,
    designation: savedUser.designation,
    department: savedUser.department,
    avatar: savedUser.avatar
  });

  // Attach Lifetime QR to User in MongoDB
  if (mongoose.connection.readyState === 1 && savedUser.id) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(savedUser.id);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: savedUser.id }] : []),
            { officerId: savedUser.id }
          ]
        },
        {
          $set: {
            lifetimeQrId: qrInfo.qrId,
            lifetimeQrPayload: qrInfo.qrPayload,
            lifetimeQrDataUrl: qrInfo.qrDataUrl,
            lifetimeQrImage: qrInfo.qrImage,
            lifetimeQrTokenHash: qrInfo.tokenHash,
            qrRevoked: false
          }
        }
      );
    } catch (e) {
      console.warn('[AUTH] MongoDB QR attachment warning:', e.message);
    }
  }

  // Dispatch Lifetime QR to Officer via WhatsApp
  let whatsappResult = null;
  try {
    whatsappResult = await whatsappService.sendQrMessage({
      to: savedUser.phone,
      userName: savedUser.name,
      qrImage: qrInfo.qrImage,
      qrDataUrl: qrInfo.qrDataUrl,
      qrPayload: qrInfo.qrPayload,
      expiresAt: null,
      qrId: qrInfo.qrId
    });
  } catch (err) {
    console.error('[AUTH] WhatsApp QR dispatch error:', err.message);
  }

  const token = jwt.sign({ id: savedUser.id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

  return {
    token,
    user: {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      phone: savedUser.phone,
      mobile: savedUser.phone,
      avatar: savedUser.avatar,
      designation: savedUser.designation,
      location: savedUser.location || '',
      department: savedUser.department,
      officerId: savedUser.officerId
    },
    qr: qrInfo,
    whatsapp: whatsappResult
  };
};

const loginUser = async ({ password, phone, email }) => {
  const candidatePassword = (password || '').trim();
  const candidateIdent = (phone || email || '').trim();

  if (!candidatePassword) {
    const error = new Error('Password or PIN is required');
    error.statusCode = 400;
    throw error;
  }

  const passwordFingerprint = generatePasswordFingerprint(candidatePassword);
  let user = null;

  // 1. Primary: Match by secure password fingerprint
  if (passwordFingerprint && mongoose.connection.readyState === 1) {
    try {
      const mongoUser = await User.findOne({ passwordUniquenessFingerprint: passwordFingerprint });
      if (mongoUser) {
        user = {
          id: String(mongoUser._id),
          name: mongoUser.name,
          email: mongoUser.email,
          phone: mongoUser.phone,
          pin: mongoUser.pin,
          password: mongoUser.password,
          avatar: mongoUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          designation: mongoUser.designation || 'IAS Officer • Special Duty',
          location: mongoUser.location || '',
          department: mongoUser.department || 'Cabinet Secretariat • Government of India',
          officerId: mongoUser.officerId || ('GOI-DL-2026-' + String(mongoUser._id).slice(-4))
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB fingerprint login check warning:', e.message);
    }
  }

  // 2. Match by phone/email fallback
  if (!user && candidateIdent) {
    const ident = candidateIdent;
    const cleanPhone = ident.replace(/\D/g, '').slice(-10);
    if (mongoose.connection.readyState === 1) {
      try {
        const mongoUser = await User.findOne({
          $or: [
            { phone: ident },
            ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : []),
            { email: ident.toLowerCase() }
          ]
        });

        if (mongoUser) {
          user = {
            id: String(mongoUser._id),
            name: mongoUser.name,
            email: mongoUser.email,
            phone: mongoUser.phone,
            pin: mongoUser.pin,
            password: mongoUser.password,
            avatar: mongoUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            designation: mongoUser.designation || 'IAS Officer • Special Duty',
            location: mongoUser.location || '',
            department: mongoUser.department || 'Cabinet Secretariat • Government of India',
            officerId: mongoUser.officerId || ('GOI-DL-2026-' + String(mongoUser._id).slice(-4))
          };
        }
      } catch (e) {
        console.warn('[AUTH] MongoDB user lookup fallback warning:', e.message);
      }
    }
  }

  if (!user) {
    const error = new Error('Invalid password.');
    error.statusCode = 401;
    throw error;
  }

  // Verify PIN / Password
  let isMatch = false;
  if (user.pin && user.pin === candidatePassword) {
    isMatch = true;
  } else if (user.password) {
    isMatch = await bcrypt.compare(candidatePassword, user.password);
  }

  if (!isMatch) {
    const error = new Error('Invalid password.');
    error.statusCode = 401;
    throw error;
  }

  const now = Date.now();
  const pinLoggedInAt = new Date(now);
  const pinExpiresAt = new Date(now + 60 * 60 * 1000); // 1-hour active window

  if (mongoose.connection.readyState === 1 && user.id) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(user.id);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: user.id }] : []),
            { officerId: user.id }
          ]
        },
        {
          $set: {
            pinLoggedInAt: pinLoggedInAt,
            pinExpiresAt: pinExpiresAt
          }
        }
      );
    } catch (e) {
      console.warn('[AUTH] Error setting pinExpiresAt on login:', e.message);
    }
  }

  const token = jwt.sign({ id: user.id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      mobile: user.phone,
      avatar: user.avatar,
      designation: user.designation,
      location: user.location || '',
      department: user.department,
      officerId: user.officerId || ('GOI-DL-2026-' + String(user.id).slice(-4)),
      pinLoggedInAt: pinLoggedInAt,
      pinExpiresAt: pinExpiresAt
    }
  };
};

const qrLogin = async (qrPayload) => {
  if (!qrPayload) {
    const error = new Error('QR payload is required');
    error.statusCode = 400;
    throw error;
  }

  const validation = qrService.verifyLifetimeQr(qrPayload);
  if (!validation.valid) {
    const error = new Error(validation.reason || 'Invalid or revoked QR code');
    error.statusCode = 401;
    throw error;
  }

  let user = null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(validation.userId);
      const cleanPhone = (validation.userPhone || '').replace(/\D/g, '').slice(-10);

      const mongoUser = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: validation.userId }] : []),
          { officerId: validation.userId },
          { phone: validation.userPhone },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      });

      if (mongoUser) {
        if (mongoUser.qrRevoked) {
          const error = new Error('This QR code has been revoked. Please request a new QR from the admin desk.');
          error.statusCode = 401;
          throw error;
        }

        user = {
          id: String(mongoUser._id),
          name: mongoUser.name,
          email: mongoUser.email,
          phone: mongoUser.phone,
          avatar: mongoUser.avatar,
          designation: mongoUser.designation,
          location: mongoUser.location || '',
          department: mongoUser.department,
          officerId: mongoUser.officerId,
          lifetimeQrPayload: mongoUser.lifetimeQrPayload,
          lifetimeQrDataUrl: mongoUser.lifetimeQrDataUrl,
          lifetimeQrImage: mongoUser.lifetimeQrImage,
          qrRevoked: mongoUser.qrRevoked || false
        };
      }
    } catch (e) {
      if (e.statusCode) throw e;
      console.warn('[AUTH] MongoDB QR lookup warning:', e.message);
    }
  }

  if (!user) {
    user = {
      id: validation.userId || 'usr-' + Date.now(),
      name: validation.userName || 'IAS Officer',
      phone: validation.userPhone,
      email: (validation.userName || 'officer').toLowerCase().replace(/\s+/g, '.') + '@gov.in',
      avatar: generateOfficialInitialsAvatar(validation.userName || 'IAS Officer'),
      designation: 'IAS Officer • Special Duty',
      location: '',
      department: 'Cabinet Secretariat • Government of India',
      officerId: 'GOI-DL-2026-8941'
    };
  }

  const token = jwt.sign({ id: user.id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      mobile: user.phone,
      avatar: user.avatar,
      designation: user.designation,
      location: user.location || '',
      department: user.department,
      officerId: user.officerId || ('GOI-DL-2026-' + String(user.id).slice(-4))
    }
  };
};

const getAllUsers = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      if (users && users.length > 0) {
        return users.map(u => ({
          id: String(u._id),
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          mobile: u.phone,
          avatar: u.avatar,
          designation: u.designation,
          location: u.location || '',
          department: u.department,
          officerId: u.officerId || ('GOI-DL-2026-' + String(u._id).slice(-4)),
          role: u.role || 'user',
          pinLoggedInAt: u.pinLoggedInAt || null,
          pinExpiresAt: u.pinExpiresAt || null,
          createdAt: u.createdAt
        }));
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB getAllUsers warning:', e.message);
    }
  }

  return [];
};

const getUserById = async (id) => {
  if (!id) return null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const user = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { officerId: id }
        ]
      });

      if (user) {
        return {
          id: String(user._id),
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          mobile: user.phone,
          avatar: user.avatar,
          designation: user.designation,
          location: user.location || '',
          department: user.department,
          officerId: user.officerId || ('GOI-DL-2026-' + String(user._id).slice(-4)),
          role: user.role || 'user',
          lifetimeQrPayload: user.lifetimeQrPayload || '',
          lifetimeQrDataUrl: user.lifetimeQrDataUrl || '',
          lifetimeQrImage: user.lifetimeQrImage || '',
          qrRevoked: user.qrRevoked || false,
          pinLoggedInAt: user.pinLoggedInAt || null,
          pinExpiresAt: user.pinExpiresAt || null,
          createdAt: user.createdAt
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB getUserById warning:', e.message);
    }
  }

  return null;
};

const updateUser = async (id, updates) => {
  if (!id) return null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const user = await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: id }] : []),
            { officerId: id }
          ]
        },
        { $set: updates },
        { new: true }
      );

      if (user) {
        return {
          id: String(user._id),
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          mobile: user.phone,
          avatar: user.avatar,
          designation: user.designation,
          location: user.location || '',
          department: user.department,
          officerId: user.officerId,
          role: user.role || 'user',
          updatedAt: user.updatedAt
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB updateUser warning:', e.message);
    }
  }

  return null;
};

const deleteUser = async (id) => {
  if (!id) return false;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const res = await User.findOneAndDelete({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { officerId: id }
        ]
      });
      return !!res;
    } catch (e) {
      console.warn('[AUTH] MongoDB deleteUser warning:', e.message);
    }
  }

  return false;
};

const revokeUserQr = async (userId) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(userId);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: userId }] : []),
            { officerId: userId }
          ]
        },
        {
          $set: {
            qrRevoked: true,
            qrRevokedAt: new Date()
          }
        }
      );
    } catch (e) {
      console.warn('[AUTH] MongoDB revokeUserQr warning:', e.message);
    }
  }

  return true;
};

const regenerateUserQr = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error('Officer not found');
    err.statusCode = 404;
    throw err;
  }

  const qrInfo = await qrService.generateLifetimeQr({
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    officerId: user.officerId,
    designation: user.designation,
    department: user.department,
    avatar: user.avatar
  });

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(userId);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: userId }] : []),
            { officerId: userId }
          ]
        },
        {
          $set: {
            lifetimeQrId: qrInfo.qrId,
            lifetimeQrPayload: qrInfo.qrPayload,
            lifetimeQrDataUrl: qrInfo.qrDataUrl,
            lifetimeQrImage: qrInfo.qrImage,
            lifetimeQrTokenHash: qrInfo.tokenHash,
            qrRevoked: false,
            qrRevokedAt: null
          }
        }
      );
    } catch (e) {
      console.warn('[AUTH] MongoDB regenerateUserQr warning:', e.message);
    }
  }

  if (user.phone) {
    try {
      await whatsappService.sendQrMessage({
        to: user.phone,
        userName: user.name,
        qrImage: qrInfo.qrImage,
        qrDataUrl: qrInfo.qrDataUrl,
        qrPayload: qrInfo.qrPayload,
        expiresAt: null,
        qrId: qrInfo.qrId
      });
    } catch (err) {
      console.error('[AUTH] WhatsApp dispatch warning for regenerated QR:', err.message);
    }
  }

  return qrInfo;
};

const updateUserProfile = async (userId, updates) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(userId);
      const user = await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: userId }] : []),
            { officerId: userId }
          ]
        },
        { $set: updates },
        { new: true }
      );
      if (user) {
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
          designation: user.designation,
          location: user.location || '',
          department: user.department,
          officerId: user.officerId,
          avatar: user.avatar
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB updateUserProfile warning:', e.message);
    }
  }

  const e = new Error('Database Error: Unable to update user');
  e.statusCode = 500;
  throw e;
};

module.exports = {
  updateUserProfile,
  registerAdmin,
  loginAdmin,
  registerUser,
  loginUser,
  qrLogin,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  revokeUserQr,
  regenerateUserQr
};
