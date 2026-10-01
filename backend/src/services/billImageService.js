const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');
const QRCode = require('qrcode');

/**
 * Generates the EXACT HTML matching the user's authentic Canteen Services "FOOD INVOICE (PAID)" receipt design.
 */
async function generateBillHtml(billData) {
  const invoiceNo = billData?.invoiceNo || billData?.invoiceNumber || billData?.billNo || billData?.billNumber || (billData?.orderNumber ? billData.orderNumber.replace('ORD-', 'INV-') : 'INV-2026-15277');
  const officerName = billData?.userName || billData?.officerName || billData?.customerName || 'Chandra Babu Naidu';

  const isPreOrder = Boolean(
    billData?.isPreOrder ||
    (billData?.orderType && String(billData.orderType).toUpperCase() === 'PRE_ORDER') ||
    billData?.pickupTime ||
    billData?.preOrderSlot ||
    billData?.slotId
  );
  const pickupTime = billData?.pickupTime || billData?.preOrderSlot || (billData?.slot && billData.slot.label) || '';
  const pickupDateStr = billData?.pickupDate
    ? new Date(billData.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const orderType = isPreOrder ? 'PRE-ORDER' : (billData?.orderType || 'INSTANT');

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const defaultDate = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const defaultTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const dateStr = billData?.date || defaultDate;
  const timeStr = billData?.time || defaultTime;

  const paymentMethod = billData?.paymentMethod ? billData.paymentMethod.toUpperCase().replace(/\s+/g, '_') : 'RESTAURANT_QR';
  const isPaid = billData?.isPaid !== undefined ? billData.isPaid : (billData?.paymentStatus === 'PAID' || true);
  const statusStr = isPaid ? `PAID (${paymentMethod})` : (billData?.paymentStatus || 'UNPAID');

  const rawItems = billData?.items || billData?.orderItems || [];
  const sampleItems = [
    { name: 'Dal Khichdi & Papad', qty: 1, price: 55, total: 55 }
  ];

  const itemsList = (rawItems.length > 0 ? rawItems : sampleItems).map((item, idx) => {
    const qty = Number(item.qty || item.quantity || 1);
    const rate = Number(item.price !== undefined ? item.price : (item.rate || (item.total && qty ? item.total / qty : 0)));
    const total = Number(item.total !== undefined ? item.total : (qty * rate));
    return {
      index: idx + 1,
      name: item.name || item.title || 'Food Item',
      qty,
      rate: rate.toFixed(0),
      total: total.toFixed(0)
    };
  });

  const calculatedTotal = itemsList.reduce((s, i) => s + Number(i.total), 0);
  const totalAmount = Number(billData?.totalAmount !== undefined && billData?.totalAmount > 0 ? billData.totalAmount : calculatedTotal);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Food Invoice - ${invoiceNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,600;1,700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    body {
      background-color: #f3f4f6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      min-height: 100vh;
      color: #111111;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .print-btn-bar {
      width: 380px;
      max-width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      gap: 10px;
    }
    .print-btn {
      background: #111111;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    }
    .print-btn:hover {
      background: #27272a;
    }
    .receipt-wrapper {
      position: relative;
      width: 380px;
      max-width: 100%;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      margin: 0 auto;
      padding: 20px 18px 18px 18px;
    }

    /* Brand Header */
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .brand-logo-svg {
      flex-shrink: 0;
      width: 46px;
      height: 46px;
    }
    .brand-title-group {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .brand-main-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: 0.3px;
      color: #111111;
    }
    .brand-sub-gov {
      font-size: 7px;
      font-weight: 500;
      letter-spacing: 0.6px;
      color: #333333;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .brand-sub-motto {
      font-size: 6.8px;
      font-weight: 500;
      letter-spacing: 0.5px;
      color: #444444;
      margin-top: 1px;
      text-transform: uppercase;
    }
    .brand-v-divider {
      width: 1px;
      height: 44px;
      background-color: #333333;
      flex-shrink: 0;
      margin: 0 6px;
    }
    .brand-right {
      font-size: 7.5px;
      font-weight: 500;
      line-height: 1.35;
      letter-spacing: 0.4px;
      color: #333333;
      text-align: left;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    /* Solid Black Banner */
    .paid-banner {
      background-color: #111111;
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      padding: 5.5px 8px;
      letter-spacing: 1.5px;
      margin-top: 4px;
      margin-bottom: 3px;
      border-radius: 2px;
      width: 100%;
      text-transform: uppercase;
    }
    .paid-verified-sub {
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.2px;
      color: #444444;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    /* Dashed Divider */
    .dashed-divider {
      border-top: 1px dashed #666666;
      margin: 6px 0;
      width: 100%;
    }

    /* Metadata Section */
    .meta-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 2px 0;
    }
    .meta-row {
      display: flex;
      align-items: center;
      font-size: 12.5px;
      line-height: 1.35;
      color: #111111;
    }
    .meta-key {
      width: 80px;
      font-weight: 500;
      color: #444444;
      flex-shrink: 0;
    }
    .meta-colon {
      width: 14px;
      font-weight: 500;
      color: #666666;
      text-align: center;
      flex-shrink: 0;
    }
    .meta-val {
      font-weight: 600;
      color: #111111;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
    }
    .items-table th {
      font-size: 11px;
      font-weight: 700;
      color: #222222;
      padding: 4px 0 5px 0;
      border-bottom: 1.5px solid #111111;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .items-table td {
      font-size: 12px;
      color: #222222;
      padding: 4px 0;
      vertical-align: top;
    }
    .th-hash, .td-hash {
      width: 18px;
      text-align: left;
      font-weight: 500;
      color: #444444;
    }
    .th-item, .td-item {
      text-align: left;
      padding-right: 4px;
      font-weight: 600;
      color: #111111;
    }
    .th-qty, .td-qty {
      width: 36px;
      text-align: center;
      font-weight: 600;
      color: #111111;
    }
    .th-rate, .td-rate {
      width: 60px;
      text-align: right;
      font-weight: 500;
      color: #333333;
    }
    .th-amt, .td-amt {
      width: 60px;
      text-align: right;
      font-weight: 600;
      color: #111111;
    }

    /* Total Paid Row */
    .total-paid-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    .total-paid-label {
      font-size: 17px;
      font-weight: 700;
      color: #111111;
      letter-spacing: 0.5px;
    }
    .total-paid-val {
      font-size: 20px;
      font-weight: 700;
      color: #111111;
    }

    /* Footer Section */
    .footer-section {
      text-align: center;
      padding: 4px 0 2px 0;
    }
    .footer-service-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #444444;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .thank-you-script-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 4px 0 6px 0;
    }
    .script-line {
      flex: 1;
      height: 1px;
      background-color: #555555;
    }
    .script-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 21px;
      font-weight: 600;
      color: #111111;
      padding: 0 4px;
    }
    .footer-canteen-title {
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #222222;
      text-transform: uppercase;
    }
    .footer-canteen-motto {
      font-size: 7.5px;
      font-weight: 500;
      letter-spacing: 0.8px;
      color: #444444;
      text-transform: uppercase;
      margin-top: 2px;
    }

    @media print {
      @page {
        margin: 0;
        size: 80mm auto;
      }
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        width: 100% !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        background: #ffffff !important;
        color: #111111 !important;
        display: block !important;
        overflow: visible !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: geometricPrecision;
      }
      .print-btn-bar {
        display: none !important;
      }
      .receipt-wrapper {
        filter: none !important;
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 3mm 2.5mm 3mm 2.5mm !important;
        background: #ffffff !important;
        border-radius: 0 !important;
      }
      .paid-banner {
        background-color: #111111 !important;
        color: #ffffff !important;
      }
      .brand-v-divider, .script-line {
        background-color: #333333 !important;
      }
      .dashed-divider {
        border-top: 1px dashed #666666 !important;
      }
      .items-table th {
        border-bottom: 1.5px solid #111111 !important;
      }
    }
  </style>
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      var urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === '1' || urlParams.get('print') === 'true' || urlParams.get('autoprint') === 'true' || urlParams.get('autoprint') === '1' || urlParams.get('thermal') === '1') {
        setTimeout(function() {
          window.print();
        }, 400);
      }
    });
  </script>
</head>
<body>
  <div class="print-btn-bar">
    <div style="font-size:12px;font-weight:600;color:#52525b;">Food Invoice (Paid) Preview</div>
    <button class="print-btn" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print Bill
    </button>
  </div>
  <div class="receipt-wrapper">
    
    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-left">
        <svg class="brand-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#111111" stroke-width="3" fill="none"/>
          <!-- Fork (3 prongs) -->
          <path d="M37 26 V39 C37 43 39 45 42 45 V74 H45 V45 C48 45 50 43 50 39 V26 H47.5 V35 H45.5 V26 H41.5 V35 H39.5 V26 Z" fill="#111111"/>
          <!-- Spoon -->
          <path d="M60 26 C54 26 54 41 58 44 V74 H62 V44 C66 41 66 26 60 26 Z" fill="#111111"/>
        </svg>
        <div class="brand-title-group">
          <div class="brand-main-title">CANTEEN<br>SERVICES</div>
          <div class="brand-sub-gov">GOVERNMENT OF INDIA</div>
          <div class="brand-sub-motto">GOOD FOOD &nbsp;GREATER SERVICE</div>
        </div>
      </div>
      <div class="brand-v-divider"></div>
      <div class="brand-right">
        <div>OFFICIAL</div>
        <div>TAX INVOICE</div>
        <div>PAID RECEIPT</div>
        <div>DIGITAL COPY</div>
      </div>
    </div>

    <!-- Solid Black Banner -->
    <div class="paid-banner">${isPreOrder ? 'PRE-ORDER INVOICE (PAID)' : 'FOOD INVOICE (PAID)'}</div>
    <div class="paid-verified-sub">${isPreOrder ? (pickupTime ? `SCHEDULED PICKUP: ${pickupTime}` : 'PRE-ORDER BOOKING CONFIRMED') : 'ONLINE PAYMENT VERIFIED'}</div>

    <!-- Dashed Divider -->
    <div class="dashed-divider"></div>

    <!-- Metadata Section -->
    <div class="meta-section">
      <div class="meta-row">
        <span class="meta-key">Invoice No</span>
        <span class="meta-colon">:</span>
        <span class="meta-val">${invoiceNo}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Officer</span>
        <span class="meta-colon">:</span>
        <span class="meta-val">${officerName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Order Type</span>
        <span class="meta-colon">:</span>
        <span class="meta-val" style="font-weight: 700; color: ${isPreOrder ? '#b45309' : '#111111'};">${orderType}</span>
      </div>
      ${isPreOrder && pickupDateStr ? `
      <div class="meta-row">
        <span class="meta-key">Pickup Date</span>
        <span class="meta-colon">:</span>
        <span class="meta-val" style="font-weight: 700; color: #166534;">${pickupDateStr}</span>
      </div>` : ''}
      ${isPreOrder && pickupTime ? `
      <div class="meta-row">
        <span class="meta-key">Pickup Slot</span>
        <span class="meta-colon">:</span>
        <span class="meta-val" style="font-weight: 700; color: #166534;">${pickupTime}</span>
      </div>` : ''}
      <div class="meta-row">
        <span class="meta-key">Date</span>
        <span class="meta-colon">:</span>
        <span class="meta-val">${dateStr}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Time</span>
        <span class="meta-colon">:</span>
        <span class="meta-val">${timeStr}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Status</span>
        <span class="meta-colon">:</span>
        <span class="meta-val">${statusStr}</span>
      </div>
    </div>

    <!-- Dashed Divider -->
    <div class="dashed-divider"></div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="th-hash">#</th>
          <th class="th-item">ITEM</th>
          <th class="th-qty">QTY</th>
          <th class="th-rate">RATE (Rs)</th>
          <th class="th-amt">AMT (Rs)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList.map(item => `
          <tr>
            <td class="td-hash">${item.index}</td>
            <td class="td-item">${item.name}</td>
            <td class="td-qty">${item.qty}</td>
            <td class="td-rate">${item.rate}</td>
            <td class="td-amt">${item.total}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Dashed Divider -->
    <div class="dashed-divider"></div>

    <!-- Total Paid Row -->
    <div class="total-paid-row">
      <div class="total-paid-label">TOTAL PAID :</div>
      <div class="total-paid-val">Rs. ${totalAmount.toFixed(0)}</div>
    </div>

    <!-- Dashed Divider -->
    <div class="dashed-divider"></div>

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-service-title">THANK YOU FOR YOUR SERVICE</div>
      <div class="thank-you-script-row">
        <span class="script-line"></span>
        <span class="script-text">Thank You</span>
        <span class="script-line"></span>
      </div>
      <div class="footer-canteen-title">CANTEEN SERVICES</div>
      <div class="footer-canteen-motto">GOOD FOOD. GREATER SERVICE.</div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generates a PNG Buffer of the bill image using nodeHtmlToImage.
 */
async function generateBillImage(billData) {
  const html = await generateBillHtml(billData);
  try {
    const image = await nodeHtmlToImage({
      html,
      type: 'png',
      quality: 100,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    });
    return image;
  } catch (err) {
    console.error('[BILL_IMAGE] Error generating bill image with node-html-to-image:', err);
    throw err;
  }
}

module.exports = {
  generateBillHtml,
  generateBillImage
};
