const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const OUTBOX_DIR = path.join(__dirname, '..', '..', 'data');
const OUTBOX_FILE = path.join(OUTBOX_DIR, 'email_outbox.json');

// Ensure data directory exists
if (!fs.existsSync(OUTBOX_DIR)) {
  try {
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  } catch (e) {
    // Ignore error if exists
  }
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log(`[EMAIL] Configured Custom SMTP transporter (${smtpHost}:${smtpPort})`);
  } else if (smtpUser && smtpPass) {
    // Fallback default to Gmail service if user & pass provided
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log(`[EMAIL] Configured Gmail SMTP transporter for ${smtpUser}`);
  } else {
    // Development / fallback direct transport (or stream)
    transporter = nodemailer.createTransport({
      sendmail: false,
      jsonTransport: true
    });
    console.log('[EMAIL] No SMTP credentials configured in .env. Initialized JSON/Simulation email transport (Outbox logging enabled).');
  }

  return transporter;
}

function saveToOutbox(record) {
  try {
    let outbox = [];
    if (fs.existsSync(OUTBOX_FILE)) {
      try {
        const raw = fs.readFileSync(OUTBOX_FILE, 'utf8');
        outbox = JSON.parse(raw);
        if (!Array.isArray(outbox)) outbox = [];
      } catch (e) {
        outbox = [];
      }
    }
    outbox.unshift({
      id: `email_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      ...record
    });
    if (outbox.length > 200) outbox = outbox.slice(0, 200);
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(outbox, null, 2), 'utf8');
  } catch (err) {
    console.warn('[EMAIL] Failed to write to email outbox:', err.message);
  }
}

/**
 * Send official lifetime login QR card email to an officer
 */
async function sendQrEmail({ to, userName, officerId, designation, department, phone, qrImage, qrDataUrl, qrPayload, qrId }) {
  if (!to || !to.includes('@')) {
    console.warn(`[EMAIL] Invalid or empty email recipient: "${to}". Skipping email dispatch.`);
    return { success: false, message: 'Invalid email address' };
  }

  const cleanEmail = to.trim().toLowerCase();
  const activeTransporter = getTransporter();

  const senderFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || '"Amrut Canteen Services" <canteen@gov.in>';
  const subject = `🇮🇳 Your Official Amrut Canteen Lifetime Login QR Card - ${userName || 'Officer'}`;

  // Prepare QR card image buffer
  let imageBuffer = null;
  if (qrImage && qrImage.startsWith('data:image')) {
    const base64Data = qrImage.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (qrDataUrl && qrDataUrl.startsWith('data:image')) {
    const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (qrImage && typeof qrImage === 'string' && fs.existsSync(qrImage)) {
    try {
      imageBuffer = fs.readFileSync(qrImage);
    } catch (e) {
      // fallback
    }
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amrut Canteen - Official Lifetime Login QR Card</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #1e293b;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #065f46 0%, #047857 100%);
      padding: 24px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #a7f3d0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .intro {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .card-wrapper {
      text-align: center;
      background: #0f172a;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #334155;
    }
    .qr-img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      display: inline-block;
    }
    .officer-details {
      background: #0f172a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      border: 1px solid #334155;
    }
    .instructions {
      background: rgba(16, 185, 129, 0.1);
      border-left: 4px solid #10b981;
      padding: 14px 16px;
      border-radius: 4px;
      margin-bottom: 24px;
    }
    .instructions h4 {
      margin: 0 0 6px 0;
      color: #34d399;
      font-size: 14px;
    }
    .instructions p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #cbd5e1;
    }
    .footer {
      background: #0f172a;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #1e293b;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🇮🇳 AMRUT CANTEEN SERVICES</h1>
      <p>Government of India • Lifetime Officer Access Card</p>
    </div>
    <div class="content">
      <div class="greeting">Jai Hind, ${userName || 'Officer'}!</div>
      <div class="intro">
        Your registration is complete. Below is your <strong>Official Lifetime Login QR Code Card</strong>. 
        You can use this QR card at any canteen kiosk or checkout counter to instantly authenticate and order meals.
      </div>

      <div class="card-wrapper">
        ${imageBuffer ? '<img class="qr-img" src="cid:officer_qr_card" alt="Official Lifetime QR Card" />' : (qrImage ? `<img class="qr-img" src="${qrImage}" alt="QR Card" />` : '<p style="color:#ef4444;">QR Code attached to this email</p>')}
      </div>

      <div class="officer-details">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td style="color: #64748b; font-weight: 600;">Officer Name:</td>
            <td style="color: #f1f5f9; font-weight: 700; text-align: right;">${userName || 'N/A'}</td>
          </tr>
          ${officerId ? `<tr>
            <td style="color: #64748b; font-weight: 600;">Officer ID:</td>
            <td style="color: #34d399; font-weight: 700; text-align: right;">${officerId}</td>
          </tr>` : ''}
          ${designation ? `<tr>
            <td style="color: #64748b; font-weight: 600;">Designation:</td>
            <td style="color: #f1f5f9; font-weight: 700; text-align: right;">${designation}</td>
          </tr>` : ''}
          ${department ? `<tr>
            <td style="color: #64748b; font-weight: 600;">Department:</td>
            <td style="color: #f1f5f9; font-weight: 700; text-align: right;">${department}</td>
          </tr>` : ''}
          ${phone ? `<tr>
            <td style="color: #64748b; font-weight: 600;">Registered Mobile:</td>
            <td style="color: #f1f5f9; font-weight: 700; text-align: right;">+91 ${phone.replace(/\D/g, '').slice(-10)}</td>
          </tr>` : ''}
          <tr>
            <td style="color: #64748b; font-weight: 600;">QR Validity:</td>
            <td style="color: #10b981; font-weight: 700; text-align: right;">Lifetime Active</td>
          </tr>
        </table>
      </div>

      <div class="instructions">
        <h4>⚡ How to Use Your QR Code:</h4>
        <p>1. Save the attached QR Card image to your mobile photo gallery.<br>
           2. Show the QR code at the scanner during login or meal checkout.<br>
           3. No need to type PIN numbers or passwords!</p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated official transmission from Amrut Canteen Services.</p>
      <p>Government of India • All Rights Reserved</p>
    </div>
  </div>
</body>
</html>
`;

  const attachments = [];
  if (imageBuffer) {
    attachments.push({
      filename: `Amrut_Lifetime_QR_${officerId || 'Card'}.png`,
      content: imageBuffer,
      contentType: 'image/png',
      cid: 'officer_qr_card'
    });
  }

  const mailOptions = {
    from: senderFrom,
    to: cleanEmail,
    subject: subject,
    text: `Jai Hind ${userName || 'Officer'}, Your Amrut Canteen Lifetime Login QR Card is ready. Officer ID: ${officerId || 'N/A'}. Please view this email in an HTML-compatible email reader or download the attached QR image.`,
    html: htmlContent,
    attachments: attachments
  };

  try {
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] Official QR Card email successfully sent to ${cleanEmail}. MessageId: ${info.messageId || 'simulated'}`);

    saveToOutbox({
      recipient: cleanEmail,
      subject: subject,
      officerName: userName,
      officerId: officerId,
      phone: phone,
      qrId: qrId,
      status: 'SENT',
      messageId: info.messageId || `msg_${Date.now()}`
    });

    return { success: true, messageId: info.messageId, recipient: cleanEmail };
  } catch (error) {
    console.error(`[EMAIL] Failed to send QR email to ${cleanEmail}:`, error.message);

    saveToOutbox({
      recipient: cleanEmail,
      subject: subject,
      officerName: userName,
      officerId: officerId,
      phone: phone,
      qrId: qrId,
      status: 'FAILED',
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

module.exports = {
  sendQrEmail,
  getTransporter
};
