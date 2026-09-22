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
  const { name, email, phone, mobile, pin, password, avatar, designation, department, officerId } = userData;

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

  // Generate secure deterministic fingerprint for global password uniqueness (Requirement 9, 10, 11, 12)
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
      const cleanPhone = officerPhone.replace(/\D/g, '').slice(-10);
      const isSameUser = existingWithFp.phone === officerPhone || (cleanPhone && existingWithFp.phone && existingWithFp.phone.endsWith(cleanPhone));
      if (!isSameUser) {
        const error = new Error('This password is already used. Please choose another password.');
        error.statusCode = 400;
        throw error;
      }
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
  const cleanPhone = officerPhone.replace(/\D/g, '').slice(-10);
  const generatedOfficerId = officerId || ('GOI-DL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
  const resolvedAvatar = await resolveOfficerAvatar(officerName, avatar);
  const defaultDesignation = designation || 'IAS Officer • Special Duty';
  const defaultDepartment = department || 'Cabinet Secretariat • Government of India';

  let savedUser = null;

  // 1. Primary: Save to MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      // Find existing by phone or email
      let mongoUser = await User.findOne({
        $or: [
          { phone: officerPhone },
          { phone: new RegExp(cleanPhone + '$') },
          { email: officerEmail }
        ]
      });

      if (mongoUser) {
        // Update existing user
        mongoUser.name = officerName;
        mongoUser.phone = officerPhone;
        mongoUser.email = officerEmail;
        mongoUser.password = hashedPassword;
        mongoUser.passwordUniquenessFingerprint = passwordFingerprint;
        mongoUser.pin = officerPin;
        mongoUser.avatar = resolvedAvatar;
        if (designation) mongoUser.designation = designation;
        if (department) mongoUser.department = department;
        await mongoUser.save();
      } else {
        // Create new user in MongoDB
        mongoUser = await User.create({
          name: officerName,
          email: officerEmail,
          phone: officerPhone,
          password: hashedPassword,
          passwordUniquenessFingerprint: passwordFingerprint,
          pin: officerPin,
          avatar: resolvedAvatar,
          designation: defaultDesignation,
          department: defaultDepartment,
          officerId: generatedOfficerId,
          role: 'user'
        });
      }

      savedUser = {
        id: String(mongoUser._id),
        name: mongoUser.name,
        email: mongoUser.email,
        phone: mongoUser.phone,
        pin: mongoUser.pin,
        avatar: mongoUser.avatar,
        designation: mongoUser.designation,
        department: mongoUser.department,
        officerId: mongoUser.officerId || generatedOfficerId
      };
    } catch (e) {
      if (e.code === 11000 || (e.message && e.message.includes('passwordUniquenessFingerprint'))) {
        const error = new Error('This password is already used. Please choose another password.');
        error.statusCode = 400;
        throw error;
      }
      console.warn('[AUTH] MongoDB user registration warning:', e.message);
    }
  }

  // 2. Synchronize to dataStore for seamless fallback
  const fallbackUser = dataStore.saveUser({
    name: officerName,
    email: officerEmail,
    phone: officerPhone,
    pin: officerPin,
    passwordUniquenessFingerprint: passwordFingerprint,
    avatar: resolvedAvatar,
    designation: defaultDesignation,
    department: defaultDepartment,
    officerId: generatedOfficerId
  });

  if (!savedUser) {
    savedUser = fallbackUser;
  }

  // 3. Generate permanent, cryptographically secure Lifetime QR login credential
  let qrInfo = null;
  try {
    qrInfo = await qrService.createQrLoginToken(savedUser);
    if (qrInfo && mongoose.connection.readyState === 1 && savedUser._id) {
      await User.findByIdAndUpdate(savedUser._id, {
        $set: {
          lifetimeQrId: qrInfo.qrId,
          lifetimeQrPayload: qrInfo.qrPayload,
          lifetimeQrDataUrl: qrInfo.qrDataUrl,
          lifetimeQrImage: qrInfo.qrImage,
          lifetimeQrTokenHash: qrInfo.tokenHash,
          qrRevoked: false,
          qrRevokedAt: null
        }
      });
    }
  } catch (err) {
    console.error('Error generating Lifetime QR login token:', err);
  }

  // 4. Dispatch Lifetime QR message via WhatsApp
  let whatsappInfo = null;
  if (qrInfo) {
    try {
      whatsappInfo = await whatsappService.sendQrMessage({
        to: savedUser.phone,
        userName: savedUser.name,
        qrImage: qrInfo.qrImage,
        qrDataUrl: qrInfo.qrDataUrl,
        qrPayload: qrInfo.qrPayload,
        expiresAt: null,
        qrId: qrInfo.qrId,
      });
    } catch (err) {
      console.error('Error sending Lifetime QR via admin WhatsApp:', err);
    }
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
      department: savedUser.department,
      officerId: savedUser.officerId
    },
    qr: qrInfo ? {
      qrId: qrInfo.qrId,
      qrPayload: qrInfo.qrPayload,
      qrImage: qrInfo.qrImage,
      qrDataUrl: qrInfo.qrDataUrl,
      expiresAt: qrInfo.expiresAt,
    } : null,
    whatsapp: whatsappInfo
  };
};

const loginUser = async (arg1, arg2) => {
  // Password-Only Login (Requirement 13 & 14)
  let candidatePassword = '';
  let candidateIdent = '';

  if (typeof arg1 === 'object' && arg1 !== null) {
    candidatePassword = String(arg1.password || arg1.pin || '').trim();
    candidateIdent = String(arg1.phone || arg1.mobile || arg1.email || '').trim();
  } else if (arg2 !== undefined && arg2 !== null && String(arg2).trim() !== '') {
    const str1 = String(arg1 || '').trim();
    const str2 = String(arg2 || '').trim();
    // If str1 looks like phone/email and str2 is password
    if (str1.includes('@') || /^\+?\d{8,14}$/.test(str1.replace(/[\s-]/g, ''))) {
      candidateIdent = str1;
      candidatePassword = str2;
    } else {
      candidatePassword = str1;
      candidateIdent = str2;
    }
  } else {
    candidatePassword = String(arg1 || '').trim();
  }

  if (!candidatePassword) {
    const error = new Error('Password is required');
    error.statusCode = 400;
    throw error;
  }

  const fingerprint = generatePasswordFingerprint(candidatePassword);
  let user = null;

  // 1. Primary: Lookup directly by unique password fingerprint
  if (fingerprint) {
    if (mongoose.connection.readyState === 1) {
      try {
        const mongoUser = await User.findOne({ passwordUniquenessFingerprint: fingerprint });
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
            department: mongoUser.department || 'Cabinet Secretariat • Government of India',
            officerId: mongoUser.officerId || ('GOI-DL-2026-' + String(mongoUser._id).slice(-4))
          };
        }
      } catch (e) {
        console.warn('[AUTH] MongoDB fingerprint lookup warning:', e.message);
      }
    }

    if (!user && dataStore.getUserByFingerprint) {
      user = dataStore.getUserByFingerprint(fingerprint);
    }
  }

  // 2. Legacy fallback for phone/email + pin lookup if not found by fingerprint alone
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
            department: mongoUser.department || 'Cabinet Secretariat • Government of India',
            officerId: mongoUser.officerId || ('GOI-DL-2026-' + String(mongoUser._id).slice(-4))
          };
        }
      } catch (e) {
        console.warn('[AUTH] MongoDB user lookup fallback warning:', e.message);
      }
    }

    if (!user) {
      user = dataStore.getUserByPhone(ident) || dataStore.getUserByEmail(ident);
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
      department: user.department,
      officerId: user.officerId || ('GOI-DL-2026-' + String(user.id).slice(-4))
    }
  };
};

const qrLogin = async (qrPayload) => {
  if (!qrPayload) {
    const error = new Error('QR payload is required');
    error.statusCode = 400;
    throw error;
  }

  const validation = qrService.validateAndConsumeQr(qrPayload);
  if (!validation.valid) {
    const error = new Error(validation.reason || 'Invalid QR code');
    error.statusCode = 400;
    throw error;
  }

  let user = null;

  // 1. Primary: Search in MongoDB
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

  // 2. Fallback: Search in dataStore
  if (!user) {
    user = dataStore.getUserById(validation.userId) || dataStore.getUserByPhone(validation.userPhone);
  }

  if (!user) {
    user = {
      id: validation.userId || 'usr-' + Date.now(),
      name: validation.userName || 'IAS Officer',
      phone: validation.userPhone,
      email: (validation.userName || 'officer').toLowerCase().replace(/\s+/g, '.') + '@gov.in',
      avatar: generateOfficialInitialsAvatar(validation.userName || 'IAS Officer'),
      designation: 'IAS Officer • Special Duty',
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
          department: u.department,
          officerId: u.officerId || ('GOI-DL-2026-' + String(u._id).slice(-4)),
          role: u.role || 'user',
          createdAt: u.createdAt
        }));
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB getAllUsers warning:', e.message);
    }
  }

  return dataStore.getUsers();
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
          department: user.department,
          officerId: user.officerId || ('GOI-DL-2026-' + String(user._id).slice(-4)),
          role: user.role || 'user',
          lifetimeQrPayload: user.lifetimeQrPayload || '',
          lifetimeQrDataUrl: user.lifetimeQrDataUrl || '',
          lifetimeQrImage: user.lifetimeQrImage || '',
          qrRevoked: user.qrRevoked || false,
          createdAt: user.createdAt
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB getUserById warning:', e.message);
    }
  }

  return dataStore.getUserById(id);
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

  if (updates.phone) {
    dataStore.updateUserPhone(id, updates.phone);
  }
  return dataStore.getUserById(id);
};

const deleteUser = async (id) => {
  if (!id) return false;

  let deleted = false;
  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const res = await User.findOneAndDelete({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { officerId: id }
        ]
      });
      if (res) deleted = true;
    } catch (e) {
      console.warn('[AUTH] MongoDB deleteUser warning:', e.message);
    }
  }

  const jsonDeleted = dataStore.deleteUser(id);
  return deleted || jsonDeleted;
};

const revokeUserQr = async (userId) => {
  if (!userId) return false;
  qrService.revokeQr(userId);

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(userId);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: userId }] : []),
            { officerId: userId },
            { phone: userId }
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
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const qrInfo = await qrService.regenerateQr(user);

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

  // Dispatch new QR to officer's registered mobile via WhatsApp if phone exists
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

module.exports = {
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
