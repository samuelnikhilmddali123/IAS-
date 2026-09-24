const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ESC/POS Commands
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
        this.buffer = Buffer.concat([this.buffer, Buffer.from(str, 'utf8')]);
        return this;
    }
    
    textLine(str) {
        this.text(str).add(CMD.LINE_FEED);
        return this;
    }
    
    lineFeed(lines = 1) {
        for(let i=0; i<lines; i++) this.add(CMD.LINE_FEED);
        return this;
    }
    
    getBuffer() {
        return this.buffer;
    }
}

function generateReceiptBuffer(order) {
    const builder = new EscPosBuilder();
    
    const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '#CS' + Date.now().toString().slice(-6));
    const now = order.createdAt ? new Date(order.createdAt) : new Date();
    
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    const tableOrLocation = order.table || (order.mealSlot && order.mealSlot !== 'General' ? `${order.mealSlot}` : 'T-08');
    const orderType = order.orderType === 'PRE_ORDER' ? 'Pre-Order' : (order.orderType || 'Dine In');
    const items = order.items || [];
    const note = order.orderNote || order.note || order.instructions || '';

    // Chef Bill Exact Header Layout
    builder.add(CMD.INIT)
           .add(CMD.ALIGN_CENTER)
           .add(CMD.TEXT_DOUBLE_HW).add(CMD.BOLD_ON).textLine("CANTEEN SERVICES").add(CMD.TEXT_NORMAL).add(CMD.BOLD_OFF)
           .textLine("GOOD FOOD | GREATER SERVICE")
           .textLine("FRESH | HYGIENIC | NUTRITIOUS | FOR A BETTER YOU")
           .lineFeed(1)
           .add(CMD.INVERT_ON).add(CMD.TEXT_DOUBLE_HW).textLine(" KITCHEN ORDER ").add(CMD.INVERT_OFF).add(CMD.TEXT_NORMAL)
           .textLine("PREPARE WITH CARE")
           .lineFeed(1)
           .add(CMD.ALIGN_LEFT)
           .textLine("------------------------------------------")
           .add(CMD.BOLD_ON)
           .textLine(`Order No   : ${displayId}`)
           .textLine(`Date       : ${dateStr}`)
           .textLine(`Time       : ${timeStr}`)
           .textLine(`Table      : ${tableOrLocation}`)
           .textLine(`Order Type : ${orderType}`)
           .add(CMD.BOLD_OFF)
           .lineFeed(1)
           .add(CMD.ALIGN_CENTER)
           .textLine("+----------------------------------------+")
           .textLine(`|              TABLE: ${tableOrLocation.padEnd(19, ' ')}|`)
           .textLine("+----------------------------------------+")
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
               .add(CMD.BOLD_ON).textLine("SPECIAL INSTRUCTIONS :").add(CMD.BOLD_OFF)
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

function printOrderBackend(order) {
  try {
    const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '#CS' + Date.now().toString().slice(-6));
    const now = order.createdAt ? new Date(order.createdAt) : new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const tableOrLocation = order.table || (order.mealSlot && order.mealSlot !== 'General' ? `${order.mealSlot}` : 'T-08');
    const orderType = order.orderType === 'PRE_ORDER' ? 'Pre-Order' : (order.orderType || 'Dine In');

    // Resolve real Officer / User Name
    let resolvedUserName = order.userName || order.officerName || (order.user && (order.user.name || order.user.userName)) || '';
    if (!resolvedUserName || resolvedUserName === 'IAS Officer' || resolvedUserName === 'Officer' || resolvedUserName === 'guest') {
      try {
        const dataStore = require('../storage/dataStore');
        if (order.userId) {
          const u = dataStore.getUserById(order.userId);
          if (u && u.name) resolvedUserName = u.name;
        }
        if ((!resolvedUserName || resolvedUserName === 'IAS Officer' || resolvedUserName === 'guest') && (order.userPhone || order.phone)) {
          const u = dataStore.getUserByPhone(order.userPhone || order.phone);
          if (u && u.name) resolvedUserName = u.name;
        }
      } catch (e) {}
    }
    if (!resolvedUserName) resolvedUserName = 'Officer';

    const chefBillPayload = {
      orderNo: displayId,
      userName: resolvedUserName,
      officerName: resolvedUserName,
      date: dateStr,
      time: timeStr,
      table: tableOrLocation,
      orderType: orderType,
      instructions: order.orderNote || order.note || 'None',
      footerNote: 'KINDLY PREPARE AND SERVE FRESH',
      items: (order.items || []).map((it, idx) => ({
        id: idx + 1,
        name: it.name || 'Item',
        qty: it.qty || it.quantity || 1,
        remarks: it.remarks || '-'
      }))
    };

    // 1. Update Printer-Test chef bill directory with latest placed order
    const chefBillDir = path.join('C:', 'Users', 'Nikhil', 'Downloads', 'Printer-Test', 'chef bill');
    if (fs.existsSync(chefBillDir)) {
      try {
        fs.writeFileSync(path.join(chefBillDir, 'last_order.json'), JSON.stringify(chefBillPayload, null, 2), 'utf8');
        console.log(`[CHEF BILL] Updated last_order.json in ${chefBillDir}`);
      } catch (e) {
        console.warn('[CHEF BILL] Warning updating last_order.json:', e.message);
      }
    }

    // 2. Also try POST to Chef Bill print server (if running on port 3000)
    try {
      const postData = JSON.stringify({ type: 'chef', order: chefBillPayload });
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/print',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 1500
      }, (res) => {
        // success
      });
      req.on('error', () => { /* ignored if port 3000 is not running */ });
      req.write(postData);
      req.end();
    } catch {}

    // 3. Exact Graphic Chef Bill Print (Same fonts, logo, note icon, cursive Thank You, Table box)
    const renderPsScript = path.join(__dirname, 'RenderAndPrintChefBill.ps1');
    const tempOrderJson = path.join(__dirname, '..', '..', 'temp_order_print.json');
    fs.writeFileSync(tempOrderJson, JSON.stringify(chefBillPayload, null, 2), 'utf8');

    const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${renderPsScript}" -PrinterName "POS-80C" -OrderJsonPath "${tempOrderJson}"`;
    
    console.log('[PRINTER] Rendering and sending Exact Graphic Chef Bill to POS-80C...');
    
    exec(psCommand, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[PRINTER GRAPHIC WARNING]: ${error.message}. Trying direct ESC/POS fallback...`);
        // Fallback to direct raw ESC/POS text buffer
        const finalBuffer = generateReceiptBuffer(order);
        const tempBin = path.join(__dirname, '..', '..', 'temp_receipt.bin');
        fs.writeFileSync(tempBin, finalBuffer);
        const fallbackScript = path.join(__dirname, 'RawPrint.ps1');
        exec(`powershell.exe -ExecutionPolicy Bypass -File "${fallbackScript}" -printerName "POS-80C" -filePath "${tempBin}"`, (fbErr, fbOut) => {
          if (fbErr) console.error('[PRINTER FALLBACK ERROR]', fbErr.message);
          else console.log('[PRINTER FALLBACK SUCCESS]', fbOut ? fbOut.trim() : '');
          if (fs.existsSync(tempBin)) fs.unlinkSync(tempBin);
        });
      } else {
        console.log(`[PRINTER SUCCESS] Exact Chef Bill output: ${stdout ? stdout.trim() : 'SUCCESS'}`);
      }
      
      setTimeout(() => {
        if (fs.existsSync(tempOrderJson)) fs.unlinkSync(tempOrderJson);
      }, 5000);
    });
  } catch (err) {
    console.error('[PRINTER CATCH ERROR]', err);
  }
}

function printUserPaidBill(userBillData) {
  try {
    const renderPsScript = path.join(__dirname, 'RenderAndPrintUserBill.ps1');
    const tempBillJson = path.join(__dirname, '..', '..', 'temp_user_bill_print.json');
    fs.writeFileSync(tempBillJson, JSON.stringify(userBillData, null, 2), 'utf8');

    const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${renderPsScript}" -PrinterName "POS-80C" -BillJsonPath "${tempBillJson}"`;
    
    console.log('[PRINTER] Rendering and sending Exact User Paid Invoice to POS-80C...');
    
    exec(psCommand, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[PRINTER USER INVOICE WARNING]: ${error.message}`);
      } else {
        console.log(`[PRINTER USER INVOICE SUCCESS]: ${stdout ? stdout.trim() : 'SUCCESS'}`);
      }
      
      setTimeout(() => {
        if (fs.existsSync(tempBillJson)) fs.unlinkSync(tempBillJson);
      }, 5000);
    });
  } catch (err) {
    console.error('[PRINTER USER INVOICE CATCH ERROR]', err);
  }
}

module.exports = {
  printOrderBackend,
  printUserPaidBill,
  generateReceiptBuffer
};
