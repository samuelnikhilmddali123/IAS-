const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ESC/POS Command Byte Sequences for 80mm Thermal Receipt Printers
const CMD = {
  INIT: [0x1B, 0x40],
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  INVERT_ON: [0x1D, 0x42, 0x01],
  INVERT_OFF: [0x1D, 0x42, 0x00],
  TEXT_NORMAL: [0x1D, 0x21, 0x00],
  TEXT_DOUBLE_H: [0x1D, 0x21, 0x01],
  TEXT_DOUBLE_W: [0x1D, 0x21, 0x10],
  TEXT_DOUBLE_HW: [0x1D, 0x21, 0x11],
  CUT: [0x1D, 0x56, 0x00],
  LINE_FEED: [0x0A]
};

class EscPosBuilder {
  constructor() {
    this.buffer = Buffer.from([]);
  }

  add(cmd) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(cmd)]);
    return this;
  }

  text(str) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(String(str || ''), 'utf8')]);
    return this;
  }

  textLine(str = '') {
    this.text(str).add(CMD.LINE_FEED);
    return this;
  }

  lineFeed(lines = 1) {
    for (let i = 0; i < lines; i++) this.add(CMD.LINE_FEED);
    return this;
  }

  getBuffer() {
    return this.buffer;
  }
}

// -------------------------------------------------------------
// Direct Hardware Thermal Printing via RawPrint.ps1
// -------------------------------------------------------------
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PS_SCRIPT = path.join(__dirname, 'RawPrint.ps1');

async function printBufferDirect(buffer, preferredPrinter = 'POS-80C') {
  return new Promise((resolve) => {
    if (process.platform !== 'win32' || !fs.existsSync(PS_SCRIPT)) {
      console.warn('[PRINTER] RawPrint.ps1 not supported on non-windows platform or missing.');
      return resolve({ success: false, error: 'Platform not supported' });
    }

    const tempFile = path.join(DATA_DIR, `print_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);
    try {
      fs.writeFileSync(tempFile, buffer);
    } catch (writeErr) {
      console.error('[PRINTER] Error creating temp binary file:', writeErr);
      return resolve({ success: false, error: writeErr.message });
    }

    const printerName = preferredPrinter || 'POS-80C';
    const cmd = `powershell -ExecutionPolicy Bypass -File "${PS_SCRIPT}" -printerName "${printerName}" -filePath "${tempFile}"`;

    exec(cmd, (err, stdout, stderr) => {
      // Clean up temporary bin file
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (cleanErr) {}

      const output = String(stdout || '').trim();
      if (!err && output.includes('SUCCESS')) {
        console.log(`[PRINTER] Successfully dispatched receipt to ${printerName}`);
        return resolve({ success: true, printer: printerName });
      } else {
        console.warn(`[PRINTER] Print to ${printerName} returned: ${output || stderr || (err ? err.message : 'FAILED')}`);
        return resolve({ success: false, error: output || stderr || (err ? err.message : 'Unknown error') });
      }
    });
  });
}

// -------------------------------------------------------------
// Kitchen Order Ticket (KOT) Builder
// -------------------------------------------------------------
function generateReceiptBuffer(order) {
  const builder = new EscPosBuilder();

  const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '#CS' + Date.now().toString().slice(-6));
  const now = order.createdAt ? new Date(order.createdAt) : new Date();

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const tableOrLocation = order.table || (order.mealSlot && order.mealSlot !== 'General' ? `${order.mealSlot}` : (order.roomNumber ? `Room ${order.roomNumber}` : 'Dining Hall'));
  const isPreOrder = Boolean(order.orderType === 'PRE_ORDER' || order.isPreOrder || order.pickupTime);
  const orderType = isPreOrder ? 'PRE-ORDER' : (order.orderType || 'Dine In');
  const slotTime = order.pickupTime || order.preOrderSlot || '';
  const pickupDateStr = order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const officerName = order.userName || order.customerName || 'IAS Officer';
  const items = order.items || [];
  const note = order.orderNote || order.note || order.instructions || '';

  builder.add(CMD.INIT)
         .add(CMD.ALIGN_CENTER)
         .add(CMD.TEXT_DOUBLE_HW).add(CMD.BOLD_ON).textLine("CANTEEN SERVICES").add(CMD.TEXT_NORMAL).add(CMD.BOLD_OFF)
         .textLine("GOOD FOOD | GREATER SERVICE")
         .textLine("FRESH | HYGIENIC | NUTRITIOUS")
         .lineFeed(1)
         .add(CMD.INVERT_ON).add(CMD.TEXT_DOUBLE_HW).textLine(isPreOrder ? " *** PRE-ORDER BOOKING *** " : " KITCHEN ORDER (KOT) ").add(CMD.INVERT_OFF).add(CMD.TEXT_NORMAL)
         .textLine(isPreOrder ? `SCHEDULED: ${slotTime || 'AS PER SLOT'}` : "PREPARE WITH CARE")
         .lineFeed(1)
         .add(CMD.ALIGN_LEFT)
         .textLine("------------------------------------------")
         .add(CMD.BOLD_ON)
         .textLine(`Order No   : ${displayId}`)
         .textLine(`Officer    : ${officerName}`)
         .textLine(`Order Type : ${orderType}`);

  if (isPreOrder && slotTime) {
    builder.textLine(`Slot Time  : ${slotTime}`);
  }
  if (isPreOrder && pickupDateStr) {
    builder.textLine(`Pickup Date: ${pickupDateStr}`);
  }

  builder.textLine(`Date & Time: ${dateStr}, ${timeStr}`)
         .textLine(`Location   : ${tableOrLocation}`)
         .add(CMD.BOLD_OFF)
         .lineFeed(1)
         .add(CMD.ALIGN_LEFT)
         .textLine("------------------------------------------")
         .add(CMD.BOLD_ON).textLine("#   ITEM                       QTY REMARKS").add(CMD.BOLD_OFF)
         .textLine("------------------------------------------");

  items.forEach((item, index) => {
    const iStr = String(index + 1).padEnd(4, ' ');
    const qty = String(item.qty || item.quantity || 1).padEnd(4, ' ');
    let name = (item.name || 'Item').substring(0, 26).padEnd(27, ' ');
    let remarks = (item.remarks || item.spicy || (item.name && item.name.toLowerCase().includes('spicy')) ? "Spicy" : "-");
    builder.textLine(`${iStr}${name}${qty}${remarks}`);
  });

  builder.textLine("------------------------------------------");

  if (note && note !== 'None') {
    builder.lineFeed(1)
           .add(CMD.BOLD_ON).textLine("SPECIAL INSTRUCTIONS:").add(CMD.BOLD_OFF)
           .textLine(note)
           .lineFeed(1)
           .textLine("------------------------------------------");
  }

  builder.lineFeed(1)
         .add(CMD.ALIGN_CENTER)
         .add(CMD.BOLD_ON).textLine("KINDLY PREPARE AND SERVE FRESH").add(CMD.BOLD_OFF)
         .lineFeed(1)
         .textLine("--- Thank You ---")
         .lineFeed(1)
         .add(CMD.BOLD_ON).textLine("CANTEEN SERVICES").add(CMD.BOLD_OFF)
         .textLine("GOOD FOOD. GREATER SERVICE.")
         .lineFeed(5)
         .add(CMD.CUT);

  return builder.getBuffer();
}

// -------------------------------------------------------------
// Official Customer Paid Tax Invoice & Settlement Receipt Builder
// -------------------------------------------------------------
function generateUserPaidBillReceiptBuffer(userBillData) {
  const builder = new EscPosBuilder();

  const invoiceNo = userBillData.invoiceNo || `INV-${Date.now().toString().slice(-6)}`;
  const orderNumber = userBillData.orderNumber || '';
  const tokenNumber = userBillData.tokenNumber ? `Token #${userBillData.tokenNumber}` : '';
  const officerName = userBillData.userName || userBillData.officerName || 'Officer';
  const designation = userBillData.designation || '';
  const department = userBillData.department || userBillData.location || 'Officers Mess & Canteen';
  const userPhone = userBillData.userPhone || userBillData.mobile || '';

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const defaultDate = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const defaultTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const dateStr = userBillData.date || defaultDate;
  const timeStr = userBillData.time || defaultTime;
  const paymentMethod = userBillData.paymentMethod || 'Online UPI';
  const items = Array.isArray(userBillData.items) && userBillData.items.length > 0
    ? userBillData.items
    : [{ name: 'Dining & Food Services', qty: 1, price: userBillData.totalAmount || 0, total: userBillData.totalAmount || 0 }];

  const isPreOrder = Boolean(userBillData.orderType === 'PRE_ORDER' || userBillData.isPreOrder || userBillData.pickupTime || userBillData.preOrderSlot);
  const slotTime = userBillData.pickupTime || userBillData.preOrderSlot || '';
  const pickupDateStr = userBillData.pickupDate ? new Date(userBillData.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  builder.add(CMD.INIT)
         .add(CMD.ALIGN_CENTER)
         .add(CMD.TEXT_DOUBLE_HW).add(CMD.BOLD_ON).textLine("CANTEEN SERVICES").add(CMD.TEXT_NORMAL).add(CMD.BOLD_OFF)
         .textLine("GOVERNMENT OF INDIA")
         .textLine("OFFICERS MESS & DINING")
         .add(CMD.BOLD_ON).textLine(isPreOrder ? "TAX INVOICE (PRE-ORDER)" : "TAX INVOICE & SETTLEMENT RECEIPT").add(CMD.BOLD_OFF)
         .lineFeed(1)
         .add(CMD.INVERT_ON).add(CMD.TEXT_DOUBLE_H).textLine(isPreOrder ? " *** PRE-ORDER BOOKING PAID *** " : " *** PAYMENT SETTLED & PAID *** ").add(CMD.INVERT_OFF).add(CMD.TEXT_NORMAL)
         .lineFeed(1)
         .add(CMD.ALIGN_LEFT)
         .textLine("------------------------------------------")
         .textLine(`Invoice No  : ${invoiceNo}`)
         .textLine(`Order Type  : ${isPreOrder ? 'PRE-ORDER' : 'INSTANT'}`);

  if (isPreOrder && pickupDateStr) {
    builder.textLine(`Pickup Date : ${pickupDateStr}`);
  }
  if (isPreOrder && slotTime) {
    builder.textLine(`Pickup Slot : ${slotTime}`);
  }

  builder.textLine(`Date & Time : ${dateStr}, ${timeStr}`);

  if (orderNumber) {
    builder.textLine(`Order Ref   : ${orderNumber}`);
  }
  if (tokenNumber) {
    builder.textLine(`Token Ref   : ${tokenNumber}`);
  }

  builder.textLine(`Customer    : ${officerName}`);
  if (designation) {
    builder.textLine(`Designation : ${designation}`);
  }
  if (department && department !== 'Officers Mess & Canteen') {
    builder.textLine(`Dept / Room : ${department}`);
  }
  if (userPhone) {
    builder.textLine(`Mobile      : ${userPhone}`);
  }

  builder.textLine(`Payment Mode: ${paymentMethod}`)
         .add(CMD.BOLD_ON).textLine("Payment Stat: PAID (Verified Online)").add(CMD.BOLD_OFF)
         .textLine("------------------------------------------")
         .add(CMD.BOLD_ON).textLine("#  ITEM                  QTY   PRICE  AMOUNT").add(CMD.BOLD_OFF)
         .textLine("------------------------------------------");

  let calculatedSubtotal = 0;
  items.forEach((item, index) => {
    const idxStr = String(index + 1).padEnd(3, ' ');
    const rawName = String(item.name || item.title || 'Food Item');
    const itemName = rawName.substring(0, 18).padEnd(19, ' ');
    const qty = Number(item.qty || item.quantity || 1);
    const qtyStr = String(qty).padStart(3, ' ');
    const price = Number(item.price !== undefined ? item.price : (item.rate || (item.total && qty ? item.total / qty : 0)));
    const priceStr = price.toFixed(2).padStart(7, ' ');
    const lineTotal = Number(item.total !== undefined ? item.total : (qty * price));
    const totalStr = lineTotal.toFixed(2).padStart(8, ' ');

    calculatedSubtotal += lineTotal;
    builder.textLine(`${idxStr}${itemName}${qtyStr} ${priceStr} ${totalStr}`);
  });

  const grandTotal = Number(userBillData.totalAmount !== undefined && userBillData.totalAmount > 0 ? userBillData.totalAmount : calculatedSubtotal);

  builder.textLine("------------------------------------------")
         .textLine(`Subtotal:                     Rs. ${grandTotal.toFixed(2).padStart(8, ' ')}`)
         .textLine(`Taxes & GST (0%):             Rs.     0.00`)
         .textLine("==========================================")
         .add(CMD.TEXT_DOUBLE_H).add(CMD.BOLD_ON)
         .textLine(`TOTAL PAID:                   Rs. ${grandTotal.toFixed(2).padStart(8, ' ')}`)
         .add(CMD.TEXT_NORMAL).add(CMD.BOLD_OFF)
         .textLine("==========================================")
         .lineFeed(1)
         .add(CMD.ALIGN_CENTER)
         .textLine("*** PAYMENT VERIFIED & SETTLED ***")
         .textLine("Thank You For Dining With Us!")
         .lineFeed(1)
         .add(CMD.BOLD_ON).textLine("CANTEEN SERVICES").add(CMD.BOLD_OFF)
         .textLine("GOVERNMENT OF INDIA")
         .lineFeed(5)
         .add(CMD.CUT);

  return builder.getBuffer();
}

// -------------------------------------------------------------
// Public Printer Service Export Handlers
// -------------------------------------------------------------
async function printOrderBackend(order) {
  // Printing is dispatched cleanly via the official HTML thermal template (/api/orders/:id/kot-html)
  // to avoid binary ESC/POS control code artifacts on Windows printer spoolers.
  console.log(`[PRINTER] KOT Order #${order.orderNumber || order._id || 'N/A'} dispatched via URL thermal route.`);
  return { success: true, mode: 'html_url' };
}

async function printUserPaidBill(userBillData) {
  // Printing is dispatched cleanly via the official HTML thermal template (/api/orders/:id/bill-html)
  // to avoid binary ESC/POS control code artifacts on Windows printer spoolers.
  console.log(`[PRINTER] Paid Tax Invoice #${userBillData.invoiceNo || 'N/A'} dispatched via URL thermal route.`);
  return { success: true, mode: 'html_url' };
}

module.exports = {
  printOrderBackend,
  printUserPaidBill,
  generateReceiptBuffer,
  generateUserPaidBillReceiptBuffer,
  printBufferDirect
};
