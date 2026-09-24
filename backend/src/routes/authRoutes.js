const express = require('express');
const {
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
  updateUserProfile
} = require('../services/authService');
const userAuth = require('../middleware/userAuthMiddleware');

const router = express.Router();

// Admin Auth
router.post('/admin/register', async (req, res) => {
  try {
    const admin = await registerAdmin(req.body);
    res.status(201).json({ success: true, message: 'Admin registered successfully', admin });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);
    res.status(200).json({ success: true, message: 'Admin login successful', ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// Officer / User Auth
const handleUserRegister = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Account created successfully. One-time QR login code dispatched via Admin WhatsApp.',
      ...result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

const handleUserLogin = async (req, res) => {
  try {
    const password = req.body.password || req.body.pin || '';
    const phone = req.body.phone || req.body.mobile || '';
    const email = req.body.email || '';
    const result = await loginUser({ password, phone, email });
    res.status(200).json({
      success: true,
      message: 'Officer authenticated successfully',
      ...result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

const handleQrLogin = async (req, res) => {
  try {
    const qrPayload = req.body.qrPayload || req.body.payload || req.body.token;
    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        message: 'Scanned QR payload is required'
      });
    }

    const result = await qrLogin(qrPayload);
    res.status(200).json({
      success: true,
      message: 'QR login authenticated successfully',
      ...result
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};

router.post('/user/register', handleUserRegister);
router.post('/register', handleUserRegister);

router.post('/user/login', handleUserLogin);
router.post('/login', handleUserLogin);

// QR Login Endpoints
router.post('/qr-login', handleQrLogin);
router.post('/user/qr-login', handleQrLogin);

// 1-Tap Quick Login by User ID or Phone
// 1-Tap Quick Login by User ID or Phone (Honors 1-hour PIN timer without restarting it)
router.post('/quick-login', async (req, res) => {
  try {
    const { userId, phone } = req.body;
    const users = await getAllUsers();
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
    const user = users.find(u => {
      if (userId && (String(u.id) === String(userId) || String(u._id) === String(userId))) return true;
      if (cleanPhone) {
        const uPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
        return uPhone === cleanPhone;
      }
      return false;
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Officer account not found in database.' });
    }

    const now = Date.now();
    const pinExpTime = user.pinExpiresAt ? new Date(user.pinExpiresAt).getTime() : 0;

    // Check if 1-hour active window has expired
    if (!pinExpTime || now >= pinExpTime) {
      return res.status(401).json({
        success: false,
        code: 'PIN_REQUIRED',
        message: '1-hour PIN session has expired. Please enter your PIN to login.'
      });
    }

    // IMPORTANT: DO NOT restart or extend the 1-hour timer when logging in without PIN!
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, role: 'user' },
      process.env.JWT_SECRET || 'canteen_super_secret_jwt_key_2026_secure',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
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
        pinExpiresAt: user.pinExpiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Current Authenticated Officer Profile Endpoint
const handleMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Officer profile not found' });
    }
    res.status(200).json({
      success: true,
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
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.get('/me', userAuth, handleMe);
router.get('/user/me', userAuth, handleMe);

// List all registered officers (for Admin Dashboard)
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update Officer Phone Number / Profile (Admin Dashboard)
router.put('/users/:id', async (req, res) => {
  try {
    const { phone, name, email, designation, department } = req.body;
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    const updates = {};
    if (phone) updates.phone = phone;
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (designation) updates.designation = designation;
    if (department) updates.department = department;

    const updated = await updateUser(user.id, updates);
    res.status(200).json({
      success: true,
      message: 'Officer profile updated successfully',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Officer (Admin Dashboard)
router.delete('/users/:id', async (req, res) => {
  try {
    const success = await deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    res.status(200).json({ success: true, message: 'Officer removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Regenerate Lifetime Login QR for Officer (Admin / System)
router.post('/users/:id/regenerate-qr', async (req, res) => {
  try {
    const qrInfo = await regenerateUserQr(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lifetime QR code regenerated successfully',
      qrInfo
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Revoke Lifetime Login QR for Officer (Admin / Security)
router.post('/users/:id/revoke-qr', async (req, res) => {
  try {
    await revokeUserQr(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Officer lifetime QR code has been revoked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Authenticated Officer: Retrieve own Lifetime Login QR
router.get('/my-qr', userAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Officer profile not found' });
    }
    res.status(200).json({
      success: true,
      lifetimeQrPayload: user.lifetimeQrPayload,
      lifetimeQrDataUrl: user.lifetimeQrDataUrl,
      lifetimeQrImage: user.lifetimeQrImage,
      qrRevoked: user.qrRevoked || false
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Edit Profile Route
router.put('/profile', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = {
      name: req.body.name,
      designation: req.body.designation,
      location: req.body.location,
      avatar: req.body.avatar
    };
    
    const updatedUser = await updateUserProfile(userId, updates);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('[AUTH] Profile Update Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'An unexpected error occurred during profile update',
    });
  }
});

module.exports = router;

