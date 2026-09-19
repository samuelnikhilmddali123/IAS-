const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const qrService = require('../services/qrService');

// Get live WhatsApp Web pairing status & pairing QR
router.get('/status', (req, res) => {
  try {
    const status = whatsappService.getWhatsAppWebStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Request / Refresh WhatsApp Web Pairing QR
router.post('/pair', async (req, res) => {
  try {
    await whatsappService.initWhatsAppWebClient();
    const status = whatsappService.getWhatsAppWebStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Disconnect / Unlink WhatsApp Web Device
router.post('/disconnect', async (req, res) => {
  try {
    const result = await whatsappService.disconnectWhatsAppWebClient();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get WhatsApp configuration (secrets masked)
router.get('/config', (req, res) => {
  try {
    const config = whatsappService.getConfig(true);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update WhatsApp configuration
router.post('/config', (req, res) => {
  try {
    const updated = whatsappService.saveConfig(req.body);
    res.json({ success: true, message: 'WhatsApp configuration updated', config: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send test message
router.post('/test', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient mobile number is required' });
    }
    const result = await whatsappService.sendTestMessage({ to, message });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get recent WhatsApp message outbox (audit log)
router.get('/outbox', (req, res) => {
  try {
    const outbox = whatsappService.getOutbox(parseInt(req.query.limit) || 50);
    res.json({ success: true, count: outbox.length, outbox });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get active / historical QR tokens (admin inspection)
router.get('/tokens', (req, res) => {
  try {
    const tokens = qrService.getTokens(parseInt(req.query.limit) || 50);
    res.json({ success: true, count: tokens.length, tokens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
