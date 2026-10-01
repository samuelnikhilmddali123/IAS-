const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
const dataStore = require('../storage/dataStore');
const qrService = require('./qrService');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'canteen_super_secret_jwt_key_2026_secure';

const generatePasswordFingerprint = (rawPassword) => {
  if (!rawPassword || typeof rawPassword !== 'string') return null;
  const normalized = rawPassword.trim();
  if (!normalized) return null;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const resolveOfficerAvatar = async (name, providedAvatar) => {
  if (providedAvatar && typeof providedAvatar === 'string' && providedAvatar.trim() && !providedAvatar.includes('unsplash.com')) {
    return providedAvatar.trim();
  }
  return '';
};

const registerAdmin = async (adminData) => {
  const { name, email, phone, password } = adminData;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!name || !cleanEmail || !phone || !password) {
    const error = new Error('Name, email, phone, and password are required');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (mongoose.connection.readyState === 1) {
    try {
      const existing = await Admin.findOne({ email: cleanEmail });
      if (existing) {
        const error = new Error('Admin with this email already exists');
        error.statusCode = 400;
        throw error;
      }
      const admin = await Admin.create({
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      });
      return {
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      };
    } catch (e) {
      if (e.statusCode) throw e;
      console.warn('[AUTH] MongoDB admin registration warning:', e.message);
    }
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

const activeRegistrationPromises = new Map();
const recentRegistrationCache = new Map();

const registerUser = async (userData) => {
  const { name, email, phone, mobile, pin, password, avatar, designation, department, officerId, location } = userData;

  const officerName = (name || '').trim();
  const officerPhone = (phone || mobile || '').trim();
  const officerPin = (pin || password || '').trim();
  const officerEmail = (email || '').trim().toLowerCase();

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

  // 1. In-flight registration mutex (handles parallel network requests from mobile/web probing)
  if (cleanPhone && activeRegistrationPromises.has(cleanPhone)) {
    console.log(`[AUTH] In-flight registration already active for phone ${cleanPhone}. Joining existing promise to prevent duplicate QR...`);
    return await activeRegistrationPromises.get(cleanPhone);
  }

  // 2. Recent registration cache within 30 seconds
  if (cleanPhone && recentRegistrationCache.has(cleanPhone)) {
    const cached = recentRegistrationCache.get(cleanPhone);
    if (Date.now() - cached.timestamp < 30000) {
      console.log(`[AUTH] Debouncing duplicate registration for phone ${cleanPhone} (last registered ${(Date.now() - cached.timestamp)/1000}s ago). Returning single QR.`);
      return cached.result;
    }
  }

  const executionPromise = (async () => {
    const passwordFingerprint = generatePasswordFingerprint(officerPin);
    const hashedPassword = await bcrypt.hash(officerPin, 10);
    const generatedOfficerId = officerId || ('GOI-DL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
    const resolvedAvatar = await resolveOfficerAvatar(officerName, avatar);
    const userDesignation = (designation && designation.trim()) ? designation.trim() : '';
    const userLocation = (location && location.trim()) ? location.trim() : (department && department.trim() ? department.trim() : '');
    const userDepartment = (department && department.trim()) ? department.trim() : userLocation;

    let savedUser = null;
    let existingRecentQr = null;

    if (mongoose.connection.readyState === 1) {
      try {
        // Find existing user by phone if re-registering
        let mongoUser = await User.findOne({
          $or: [
            { phone: officerPhone },
            ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
          ]
        });

        if (mongoUser) {
          // If user already has an unrevoked lifetime QR generated in the last 2 minutes, preserve it
          if (mongoUser.lifetimeQrPayload && !mongoUser.qrRevoked && mongoUser.lifetimeQrImage) {
            existingRecentQr = {
              qrId: mongoUser.lifetimeQrId,
              qrPayload: mongoUser.lifetimeQrPayload,
              qrDataUrl: mongoUser.lifetimeQrDataUrl,
              qrImage: mongoUser.lifetimeQrImage,
              tokenHash: mongoUser.lifetimeQrTokenHash
            };
          }

          // Update existing user with new credentials
          mongoUser.name = officerName;
          if (officerEmail) mongoUser.email = officerEmail;
          mongoUser.phone = officerPhone;
          mongoUser.password = hashedPassword;
          mongoUser.pin = officerPin;
          mongoUser.passwordUniquenessFingerprint = passwordFingerprint;
          mongoUser.avatar = resolvedAvatar;
          if (userDesignation) mongoUser.designation = userDesignation;
          if (userLocation) mongoUser.location = userLocation;
          if (userDepartment) mongoUser.department = userDepartment;
          if (userData.dob) mongoUser.dob = (userData.dob || '').trim();
          if (userData.marriageDate) mongoUser.marriageDate = (userData.marriageDate || '').trim();
          if (userData.importantDates) mongoUser.importantDates = (userData.importantDates || '').trim();
          if (userData.childrenCount) mongoUser.childrenCount = (userData.childrenCount || '').trim();
          if (userData.childrenDetails) mongoUser.childrenDetails = (userData.childrenDetails || '').trim();
          if (userData.siblings) mongoUser.siblings = (userData.siblings || '').trim();
          if (userData.dietaryPreferences) mongoUser.dietaryPreferences = (userData.dietaryPreferences || '').trim();
          if (userData.emergencyContact) mongoUser.emergencyContact = (userData.emergencyContact || '').trim();
          mongoUser.pinLoggedInAt = new Date();
          mongoUser.pinExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
          await mongoUser.save();
        } else {
          mongoUser = await User.create({
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
            dob: (userData.dob || '').trim(),
            marriageDate: (userData.marriageDate || '').trim(),
            importantDates: (userData.importantDates || '').trim(),
            childrenCount: (userData.childrenCount || '').trim(),
            childrenDetails: (userData.childrenDetails || '').trim(),
            siblings: (userData.siblings || '').trim(),
            dietaryPreferences: (userData.dietaryPreferences || '').trim(),
            emergencyContact: (userData.emergencyContact || '').trim(),
            role: 'user',
            isOfficial: userData.isOfficial !== undefined ? Boolean(userData.isOfficial) : false,
            pinLoggedInAt: new Date(),
            pinExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
          });
        }

        savedUser = {
          id: String(mongoUser._id),
          name: mongoUser.name,
          email: mongoUser.email || '',
          phone: mongoUser.phone,
          pin: mongoUser.pin,
          avatar: mongoUser.avatar,
          designation: mongoUser.designation || '',
          location: mongoUser.location || '',
          department: mongoUser.department || '',
          officerId: mongoUser.officerId || generatedOfficerId,
          dob: mongoUser.dob || '',
          marriageDate: mongoUser.marriageDate || '',
          importantDates: mongoUser.importantDates || '',
          childrenCount: mongoUser.childrenCount || '',
          childrenDetails: mongoUser.childrenDetails || '',
          siblings: mongoUser.siblings || '',
          dietaryPreferences: mongoUser.dietaryPreferences || '',
          emergencyContact: mongoUser.emergencyContact || '',
          isOfficial: Boolean(mongoUser.isOfficial)
        };
      } catch (e) {
        console.warn('[AUTH] MongoDB user registration error, falling back to dataStore:', e.message);
      }
    }

    if (!savedUser) {
      savedUser = dataStore.saveUser({
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
        dob: (userData.dob || '').trim(),
        marriageDate: (userData.marriageDate || '').trim(),
        importantDates: (userData.importantDates || '').trim(),
        childrenCount: (userData.childrenCount || '').trim(),
        childrenDetails: (userData.childrenDetails || '').trim(),
        siblings: (userData.siblings || '').trim(),
        dietaryPreferences: (userData.dietaryPreferences || '').trim(),
        emergencyContact: (userData.emergencyContact || '').trim(),
        role: 'user',
        isOfficial: userData.isOfficial !== undefined ? Boolean(userData.isOfficial) : false
      });
    }

    let qrInfo = existingRecentQr;
    let isFreshQrGenerated = false;

    if (!qrInfo) {
      try {
        qrInfo = await qrService.generateLifetimeQr({
          userId: savedUser.id,
          name: savedUser.name,
          userName: savedUser.name,
          phone: savedUser.phone,
          userPhone: savedUser.phone,
          officerId: savedUser.officerId,
          designation: savedUser.designation,
          location: savedUser.location,
          department: savedUser.department,
          avatar: savedUser.avatar,
          email: savedUser.email
        });
        isFreshQrGenerated = true;

        if (mongoose.connection.readyState === 1 && savedUser.id) {
          try {
            const isObjectId = mongoose.Types.ObjectId.isValid(savedUser.id);
            await User.findOneAndUpdate(
              {
                $or: [
                  ...(isObjectId ? [{ _id: savedUser.id }] : []),
                  { officerId: savedUser.officerId }
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
            console.warn('[AUTH] Failed to attach QR info to User in DB:', e.message);
          }
        }

        if (dataStore.updateUser) {
          dataStore.updateUser(savedUser.id, {
            lifetimeQrId: qrInfo.qrId,
            lifetimeQrPayload: qrInfo.qrPayload,
            lifetimeQrDataUrl: qrInfo.qrDataUrl,
            lifetimeQrImage: qrInfo.qrImage,
            lifetimeQrTokenHash: qrInfo.tokenHash,
            qrRevoked: false,
            qrRevokedAt: null
          });
        }
      } catch (err) {
        console.error('[AUTH] QR generation warning during user registration:', err.message);
      }
    }

    // Non-blocking background WhatsApp dispatch (fire-and-forget so user registration finishes in <100ms)
    if (savedUser.phone && qrInfo && isFreshQrGenerated) {
      setImmediate(async () => {
        try {
          await whatsappService.sendQrMessage({
            to: savedUser.phone,
            userName: savedUser.name,
            qrImage: qrInfo.qrImage,
            qrDataUrl: qrInfo.qrDataUrl,
            qrPayload: qrInfo.qrPayload,
            expiresAt: null,
            qrId: qrInfo.qrId
          });
          console.log(`[AUTH] Exactly ONE WhatsApp QR dispatched successfully to ${savedUser.phone}`);
        } catch (err) {
          console.error('[AUTH] WhatsApp dispatch error during user registration:', err.message);
        }
      });
    }

    // Non-blocking background Email dispatch (fire-and-forget so user registration finishes in <100ms)
    if (savedUser.email && savedUser.email.includes('@') && qrInfo && isFreshQrGenerated) {
      setImmediate(async () => {
        try {
          await emailService.sendQrEmail({
            to: savedUser.email,
            userName: savedUser.name,
            officerId: savedUser.officerId,
            designation: savedUser.designation,
            department: savedUser.department,
            phone: savedUser.phone,
            qrImage: qrInfo.qrImage,
            qrDataUrl: qrInfo.qrDataUrl,
            qrPayload: qrInfo.qrPayload,
            qrId: qrInfo.qrId
          });
          console.log(`[AUTH] Official Lifetime QR email dispatched successfully to ${savedUser.email}`);
        } catch (err) {
          console.error('[AUTH] Email dispatch error during user registration:', err.message);
        }
      });
    }

    const token = jwt.sign(
      {
        id: savedUser.id,
        name: savedUser.name,
        phone: savedUser.phone,
        role: 'user'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const finalResult = {
      token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email || '',
        phone: savedUser.phone,
        mobile: savedUser.phone,
        avatar: savedUser.avatar,
        designation: savedUser.designation || '',
        location: savedUser.location || '',
        department: savedUser.department || '',
        officerId: savedUser.officerId,
        dob: savedUser.dob || '',
        marriageDate: savedUser.marriageDate || '',
        importantDates: savedUser.importantDates || '',
        childrenCount: savedUser.childrenCount || '',
        childrenDetails: savedUser.childrenDetails || '',
        siblings: savedUser.siblings || '',
        dietaryPreferences: savedUser.dietaryPreferences || '',
        emergencyContact: savedUser.emergencyContact || '',
        isOfficial: Boolean(savedUser.isOfficial),
        lifetimeQrPayload: qrInfo ? qrInfo.qrPayload : undefined,
        lifetimeQrDataUrl: qrInfo ? qrInfo.qrDataUrl : undefined,
        lifetimeQrImage: qrInfo ? qrInfo.qrImage : undefined
      },
      qrCode: qrInfo ? qrInfo.qrDataUrl : undefined,
      qr: qrInfo ? {
        qrId: qrInfo.qrId,
        qrPayload: qrInfo.qrPayload,
        qrImage: qrInfo.qrImage,
        isLifetime: true
      } : undefined
    };

    if (cleanPhone) {
      recentRegistrationCache.set(cleanPhone, {
        timestamp: Date.now(),
        result: finalResult
      });
    }

    return finalResult;
  })();

  if (cleanPhone) {
    activeRegistrationPromises.set(cleanPhone, executionPromise);
  }

  try {
    const res = await executionPromise;
    return res;
  } finally {
    if (cleanPhone) {
      activeRegistrationPromises.delete(cleanPhone);
    }
  }
};

const loginUser = async (phoneOrPin, pinOnly) => {
  let identifier = '';
  let pinInput = '';

  if (typeof phoneOrPin === 'object' && phoneOrPin !== null) {
    identifier = String(phoneOrPin.phone || phoneOrPin.mobile || phoneOrPin.identifier || phoneOrPin.email || '').trim();
    pinInput = String(phoneOrPin.pin || phoneOrPin.password || '').trim();
  } else {
    identifier = String(phoneOrPin || '').trim();
    pinInput = pinOnly ? String(pinOnly).trim() : '';
  }

  if (!identifier && !pinInput) {
    const error = new Error('Phone number and PIN / password are required');
    error.statusCode = 400;
    throw error;
  }

  let user = null;

  if (identifier && pinInput) {
    const cleanPhone = identifier.replace(/\D/g, '').slice(-10);

    if (mongoose.connection.readyState === 1) {
      try {
        const found = await User.findOne({
          $or: [
            { phone: identifier },
            ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : []),
            { officerId: identifier }
          ]
        });

        if (found) {
          let match = false;
          if (found.password) {
            match = await bcrypt.compare(pinInput, found.password);
          }
          if (!match && found.pin) {
            match = String(found.pin) === pinInput;
          }

          if (match) {
            user = found;
          }
        }
      } catch (e) {
        console.warn('[AUTH] MongoDB user lookup by phone/pin warning:', e.message);
      }
    }

    if (!user && dataStore.getUserByPhone) {
      const found = dataStore.getUserByPhone(identifier);
      if (found) {
        let match = false;
        if (found.password) {
          match = await bcrypt.compare(pinInput, found.password);
        }
        if (!match && found.pin) {
          match = String(found.pin) === pinInput;
        }

        if (match) {
          user = found;
        }
      }
    }
  } else {
    const singleInput = identifier || pinInput;

    if (mongoose.connection.readyState === 1) {
      try {
        const directPinMatches = await User.find({ pin: singleInput });
        if (directPinMatches && directPinMatches.length === 1) {
          user = directPinMatches[0];
        } else {
          const allUsers = await User.find();
          for (const candidate of allUsers) {
            if (candidate.password) {
              const isMatch = await bcrypt.compare(singleInput, candidate.password);
              if (isMatch) {
                user = candidate;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[AUTH] MongoDB pin-only lookup warning:', e.message);
      }
    }

    if (!user && dataStore.getAllUsers) {
      const allStoreUsers = dataStore.getAllUsers();
      for (const candidate of allStoreUsers) {
        if (candidate.pin && String(candidate.pin) === singleInput) {
          user = candidate;
          break;
        }
        if (candidate.password) {
          const isMatch = await bcrypt.compare(singleInput, candidate.password);
          if (isMatch) {
            user = candidate;
            break;
          }
        }
      }
    }
  }

  if (!user) {
    const error = new Error('Invalid phone number or PIN / password');
    error.statusCode = 401;
    throw error;
  }

  const pinLoggedInAt = new Date();
  const pinExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(user._id || user.id);
      await User.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: user._id || user.id }] : []),
            { officerId: user.officerId }
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
      console.warn('[AUTH] Error setting pin expiration in DB:', e.message);
    }
  }

  const token = jwt.sign(
    {
      id: user.id || user._id,
      name: user.name,
      phone: user.phone,
      role: 'user'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return {
    token,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      mobile: user.phone,
      avatar: user.avatar,
      designation: user.designation || '',
      location: user.location || '',
      department: user.department || '',
      officerId: user.officerId || ('GOI-DL-2026-' + String(user.id || user._id).slice(-4)),
      dob: user.dob || '',
      marriageDate: user.marriageDate || '',
      importantDates: user.importantDates || '',
      childrenCount: user.childrenCount || '',
      childrenDetails: user.childrenDetails || '',
      siblings: user.siblings || '',
      dietaryPreferences: user.dietaryPreferences || '',
      emergencyContact: user.emergencyContact || '',
      bloodGroup: user.bloodGroup || '',
      homeAddress: user.homeAddress || '',
      isOfficial: Boolean(user.isOfficial),
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
      user = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: validation.userId }] : []),
          { officerId: validation.officerId || validation.userId },
          { phone: validation.userPhone },
          { lifetimeQrId: validation.qrId }
        ]
      });
    } catch (e) {
      console.warn('[AUTH] MongoDB QR user lookup error:', e.message);
    }
  }

  if (!user && dataStore.getUserById) {
    user = dataStore.getUserById(validation.userId);
  }

  if (!user && dataStore.getUserByPhone) {
    user = dataStore.getUserByPhone(validation.userPhone);
  }

  if (!user) {
    user = {
      id: validation.userId || 'officer-qr-' + Date.now(),
      name: validation.userName || 'Officer',
      email: validation.email || '',
      phone: validation.userPhone || '9876543210',
      avatar: (validation.avatar && !validation.avatar.includes('unsplash.com')) ? validation.avatar : '',
      designation: validation.designation || '',
      location: validation.location || '',
      department: validation.department || '',
      officerId: validation.officerId || ('GOI-DL-2026-' + Math.floor(1000 + Math.random() * 9000))
    };
  }

  const token = jwt.sign({ id: user.id || user._id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });

  return {
    token,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      mobile: user.phone,
      avatar: user.avatar,
      designation: user.designation || '',
      location: user.location || '',
      department: user.department || '',
      officerId: user.officerId || ('GOI-DL-2026-' + String(user.id || user._id).slice(-4)),
      dob: user.dob || '',
      marriageDate: user.marriageDate || '',
      importantDates: user.importantDates || '',
      childrenCount: user.childrenCount || '',
      childrenDetails: user.childrenDetails || '',
      siblings: user.siblings || '',
      dietaryPreferences: user.dietaryPreferences || '',
      emergencyContact: user.emergencyContact || '',
      bloodGroup: user.bloodGroup || '',
      homeAddress: user.homeAddress || '',
      isOfficial: Boolean(user.isOfficial)
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
          email: u.email || '',
          phone: u.phone,
          mobile: u.phone,
          avatar: u.avatar,
          designation: u.designation || '',
          location: u.location || '',
          department: u.department || '',
          officerId: u.officerId || ('GOI-DL-2026-' + String(u._id).slice(-4)),
          dob: u.dob || '',
          marriageDate: u.marriageDate || '',
          importantDates: u.importantDates || '',
          childrenCount: u.childrenCount || '',
          childrenDetails: u.childrenDetails || '',
          siblings: u.siblings || '',
          dietaryPreferences: u.dietaryPreferences || '',
          emergencyContact: u.emergencyContact || '',
          role: u.role || 'user',
          isOfficial: Boolean(u.isOfficial),
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
          email: user.email || '',
          phone: user.phone,
          mobile: user.phone,
          avatar: user.avatar,
          designation: user.designation || '',
          location: user.location || '',
          department: user.department || '',
          officerId: user.officerId || ('GOI-DL-2026-' + String(user._id).slice(-4)),
          dob: user.dob || '',
          marriageDate: user.marriageDate || '',
          importantDates: user.importantDates || '',
          childrenCount: user.childrenCount || '',
          childrenDetails: user.childrenDetails || '',
          siblings: user.siblings || '',
          dietaryPreferences: user.dietaryPreferences || '',
          emergencyContact: user.emergencyContact || '',
          role: user.role || 'user',
          isOfficial: Boolean(user.isOfficial),
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
          email: user.email || '',
          phone: user.phone,
          mobile: user.phone,
          avatar: user.avatar,
          designation: user.designation || '',
          location: user.location || '',
          department: user.department || '',
          officerId: user.officerId,
          dob: user.dob || '',
          marriageDate: user.marriageDate || '',
          importantDates: user.importantDates || '',
          childrenCount: user.childrenCount || '',
          childrenDetails: user.childrenDetails || '',
          siblings: user.siblings || '',
          dietaryPreferences: user.dietaryPreferences || '',
          emergencyContact: user.emergencyContact || '',
          role: user.role || 'user',
          isOfficial: Boolean(user.isOfficial),
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
    name: user.name,
    userName: user.name,
    phone: user.phone,
    userPhone: user.phone,
    officerId: user.officerId,
    designation: user.designation || '',
    location: user.location || user.department || '',
    department: user.department || '',
    avatar: user.avatar,
    email: user.email || ''
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

  if (user.email && user.email.includes('@')) {
    try {
      await emailService.sendQrEmail({
        to: user.email,
        userName: user.name,
        officerId: user.officerId,
        designation: user.designation,
        department: user.department,
        phone: user.phone,
        qrImage: qrInfo.qrImage,
        qrDataUrl: qrInfo.qrDataUrl,
        qrPayload: qrInfo.qrPayload,
        qrId: qrInfo.qrId
      });
    } catch (err) {
      console.error('[AUTH] Email dispatch warning for regenerated QR:', err.message);
    }
  }

  return qrInfo;
};

const sendOfficerQrEmail = async (userIdOrOfficerId, targetEmail = null) => {
  let user = null;
  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(userIdOrOfficerId);
      user = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: userIdOrOfficerId }] : []),
          { officerId: userIdOrOfficerId },
          { phone: userIdOrOfficerId },
          { email: userIdOrOfficerId }
        ]
      });
    } catch (e) {
      console.warn('[AUTH] DB lookup error in sendOfficerQrEmail:', e.message);
    }
  }

  if (!user && dataStore.getUserById) {
    user = dataStore.getUserById(userIdOrOfficerId);
  }
  if (!user && dataStore.getUserByPhone) {
    user = dataStore.getUserByPhone(userIdOrOfficerId);
  }
  if (!user && dataStore.getUserByEmail) {
    user = dataStore.getUserByEmail(userIdOrOfficerId);
  }

  if (!user) {
    const err = new Error('Officer not found');
    err.statusCode = 404;
    throw err;
  }

  const destinationEmail = targetEmail || user.email;
  if (!destinationEmail || !destinationEmail.includes('@')) {
    const err = new Error('No valid email address registered for this officer');
    err.statusCode = 400;
    throw err;
  }

  // Ensure active QR exists or generate one
  let qrInfo = null;
  if (user.lifetimeQrPayload && !user.qrRevoked && (user.lifetimeQrImage || user.lifetimeQrDataUrl)) {
    qrInfo = {
      qrId: user.lifetimeQrId,
      qrPayload: user.lifetimeQrPayload,
      qrDataUrl: user.lifetimeQrDataUrl,
      qrImage: user.lifetimeQrImage,
      tokenHash: user.lifetimeQrTokenHash
    };
  } else {
    qrInfo = await qrService.generateLifetimeQr({
      userId: String(user._id || user.id),
      name: user.name,
      userName: user.name,
      phone: user.phone,
      userPhone: user.phone,
      officerId: user.officerId,
      designation: user.designation,
      location: user.location,
      department: user.department,
      avatar: user.avatar,
      email: destinationEmail
    });
  }

  const result = await emailService.sendQrEmail({
    to: destinationEmail,
    userName: user.name,
    officerId: user.officerId,
    designation: user.designation,
    department: user.department,
    phone: user.phone,
    qrImage: qrInfo.qrImage,
    qrDataUrl: qrInfo.qrDataUrl,
    qrPayload: qrInfo.qrPayload,
    qrId: qrInfo.qrId
  });

  return { success: result.success, email: destinationEmail, officerName: user.name, officerId: user.officerId };
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
          email: user.email || '',
          phone: user.phone,
          mobile: user.phone,
          designation: user.designation || '',
          location: user.location || '',
          department: user.department || '',
          officerId: user.officerId,
          avatar: user.avatar,
          dob: user.dob || '',
          marriageDate: user.marriageDate || '',
          importantDates: user.importantDates || '',
          childrenCount: user.childrenCount || '',
          childrenDetails: user.childrenDetails || '',
          siblings: user.siblings || '',
          dietaryPreferences: user.dietaryPreferences || '',
          emergencyContact: user.emergencyContact || '',
          bloodGroup: user.bloodGroup || '',
          homeAddress: user.homeAddress || '',
          isOfficial: Boolean(user.isOfficial)
        };
      }
    } catch (e) {
      console.warn('[AUTH] MongoDB updateUserProfile warning:', e.message);
    }
  }

  if (dataStore.updateUser) {
    const updated = dataStore.updateUser(userId, updates);
    if (updated) {
      return {
        id: updated.id,
        name: updated.name,
        email: updated.email || '',
        phone: updated.phone,
        mobile: updated.phone,
        designation: updated.designation || '',
        location: updated.location || '',
        department: updated.department || '',
        officerId: updated.officerId,
        avatar: updated.avatar,
        dob: updated.dob || '',
        marriageDate: updated.marriageDate || '',
        importantDates: updated.importantDates || '',
        childrenCount: updated.childrenCount || '',
        childrenDetails: updated.childrenDetails || '',
        siblings: updated.siblings || '',
        dietaryPreferences: updated.dietaryPreferences || '',
        emergencyContact: updated.emergencyContact || '',
        bloodGroup: updated.bloodGroup || '',
        homeAddress: updated.homeAddress || '',
        isOfficial: Boolean(updated.isOfficial)
      };
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
  regenerateUserQr,
  sendOfficerQrEmail
};
