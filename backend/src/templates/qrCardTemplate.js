const fs = require('fs');
const path = require('path');

// Read the blank template and convert to Base64 so it can be safely embedded in HTML
let bgPath = path.join(__dirname, '../../public/QR Share  (1).png');
if (!fs.existsSync(bgPath)) {
  bgPath = path.join(__dirname, '../../public/QR share IAS.png');
}

let bgBase64 = '';
try {
  if (fs.existsSync(bgPath)) {
    const bgData = fs.readFileSync(bgPath);
    bgBase64 = `data:image/png;base64,${bgData.toString('base64')}`;
  }
} catch (e) {
  console.error('Could not load background template:', e);
}

module.exports = function generateQrCardHtml(officer) {
  const name = (officer.name || officer.userName || 'Officer').trim();
  const designation = (officer.designation || 'Special Duty Officer').trim();
  const location = (officer.location || officer.department || '').trim();
  const qrDataUrl = officer.qrDataUrl || '';
  const photoUrl = officer.photoUrl || '';
  const roleBadge = officer.category || officer.roleBadge || 'IAS OFFICER';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      width: 1024px;
      height: 1536px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
      background-color: #f8fafc;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 1024px;
      height: 1536px;
      z-index: 1;
      background-image: url('${bgBase64}');
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    /* Profile Photo Circle */
    .profile-photo {
      position: absolute;
      top: 275px;
      left: 78px;
      width: 238px;
      height: 238px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #e2e8f0;
      font-size: 88px;
      font-weight: 700;
      color: #064e3b;
      z-index: 10;
    }
    .profile-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* Name & Details (Clean Layout matching provided image) */
    .profile-info {
      position: absolute;
      top: 282px;
      left: 355px;
      width: 575px;
      z-index: 10;
    }
    .profile-badge {
      font-size: 19px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .profile-name {
      font-size: 42px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.18;
      word-break: break-word;
    }
    .profile-designation {
      font-size: 26px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }
    .profile-location {
      font-size: 24px;
      font-weight: 500;
      color: #64748b;
      margin: 0;
      line-height: 1.25;
    }
    
    /* QR Code Container (Forest Green QR Code) */
    .qr-container {
      position: absolute;
      top: 575px;
      left: 245px;
      width: 535px;
      height: 535px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 28px;
      overflow: hidden;
      z-index: 10;
    }
    .qr-container img {
      width: 98%;
      height: 98%;
      object-fit: contain;
    }

  </style>
</head>
<body>
  ${bgBase64 ? '<div class="background"></div>' : ''}
  
  <div class="profile-photo">
    ${photoUrl ? `<img src="${photoUrl}">` : name.charAt(0).toUpperCase()}
  </div>
  
  <div class="profile-info">
    <div class="profile-badge">${roleBadge}</div>
    <h2 class="profile-name">${name}</h2>
    <div class="profile-designation">${designation}</div>
    ${location ? `<div class="profile-location">${location}</div>` : ''}
  </div>
  
  <div class="qr-container">
    <img src="${qrDataUrl}" alt="QR">
  </div>
  
</body>
</html>
`;
};
