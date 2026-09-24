const fs = require('fs');
const path = require('path');

// Read the blank template and convert to Base64 so it can be safely embedded in HTML
const bgPath = path.join(__dirname, '../../public/QR share IAS.png');
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
  const name = officer.name || 'Officer';
  const designation = officer.designation || 'IAS OFFICER';
  const location = officer.location || '';
  const phone = officer.phone ? `+91 ${officer.phone.replace(/^91/, '')}` : '';
  const email = officer.email || '';
  const qrDataUrl = officer.qrDataUrl || '';
  const photoUrl = officer.photoUrl || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1024px;
      height: 1536px;
      font-family: 'Inter', sans-serif;
      position: relative;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 1024px;
      height: 1536px;
      z-index: -1;
      background-image: url('${bgBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    /* Profile Photo Circle */
    .profile-photo {
      position: absolute;
      top: 265px;
      left: 75px;
      width: 240px;
      height: 240px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 80px;
      font-weight: bold;
      color: #94a3b8;
    }
    .profile-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* Name & Details */
    .profile-info {
      position: absolute;
      top: 285px;
      left: 360px;
      width: 600px;
    }
    .profile-name {
      font-size: 44px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .profile-designation {
      font-size: 26px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 8px 0;
    }
    .profile-location {
      font-size: 22px;
      color: #64748b;
      margin: 0;
    }
    
    /* Contact Details */
    .contact-phone {
      position: absolute;
      top: 475px;
      left: 405px;
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
    }
    .contact-email {
      position: absolute;
      top: 475px;
      left: 712px;
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }
    
    /* QR Code Box */
    .qr-container {
      position: absolute;
      top: 573px;
      left: 242px;
      width: 540px;
      height: 540px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 30px;
      overflow: hidden;
    }
    .qr-container img {
      width: 95%;
      height: 95%;
      object-fit: contain;
    }

  </style>
</head>
<body>
  ${bgBase64 ? '<div class="background"></div>' : ''}
  
  <div class="profile-photo">
    ${photoUrl ? `<img src="${photoUrl}">` : name.charAt(0)}
  </div>
  
  <div class="profile-info">
    <h2 class="profile-name">${name}</h2>
    <p class="profile-designation">${designation}</p>
    ${location ? `<p class="profile-location">${location}</p>` : ''}
  </div>
  
  <div class="contact-phone">${phone}</div>
  <div class="contact-email">${email}</div>
  
  <div class="qr-container">
    <img src="${qrDataUrl}" alt="QR">
  </div>
  
</body>
</html>
`;
};
