const { exec } = require('child_process');

function generateReceiptText(order) {
  const displayToken = order.tokenNumber ? `TOKEN #${order.tokenNumber}` : (order.orderNumber || `#${order.id}`);
  const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const customer = order.userName || order.customerName || 'Officer';
  const tableOrLocation = order.table || (order.mealSlot && order.mealSlot !== 'General' ? `${order.mealSlot} Slot` : 'Counter');
  const orderType = order.orderType || order.type || 'Dine In';
  const items = order.items || [];
  const note = order.orderNote || order.note || '';
  const totalAmount = order.totalAmount || order.grandTotal || 0;

  // Format Receipt
  let text = '';
  text += '       MAIN KITCHEN       \n';
  text += ' MILITARY CANTEEN & MESS  \n';
  text += '--------------------------\n';
  text += `      ${displayToken}       \n`;
  text += '--------------------------\n';
  text += `Order ID : ${displayId}\n`;
  text += `Type     : ${orderType}\n`;
  text += `Customer : ${customer}\n`;
  text += `Table    : ${tableOrLocation}\n`;
  text += `Date     : ${dateStr} ${timeStr}\n`;
  text += '--------------------------\n';
  text += 'QTY   ITEM DESCRIPTION    \n';
  text += '--------------------------\n';
  
  items.forEach(item => {
    const qty = String(item.qty || item.quantity || 1).padEnd(4, ' ');
    const name = item.name.substring(0, 22);
    text += `${qty}x ${name}\n`;
    if (item.spicy || item.name.toLowerCase().includes('spicy')) {
      text += '      ** Spicy Prep **\n';
    }
  });

  if (note) {
    text += '--------------------------\n';
    text += `NOTE: ${note}\n`;
  }

  if (totalAmount > 0) {
    text += '--------------------------\n';
    text += `TOTAL: Rs.${totalAmount}\n`;
  }

  text += '--------------------------\n';
  text += ' *** PRODUCTION COPY ***\n';
  text += ' Station: Main Kitchen\n';
  text += '\n\n\n\n\n\n\n\n\n'; // Feed paper for cutting

  return text;
}

function printOrderBackend(order) {
  try {
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    
    const receiptText = generateReceiptText(order);
    
    // Create ESC/POS buffer
    const textBuffer = Buffer.from(receiptText, 'utf8');
    // ESC/POS Full Cut Command (GS V 0)
    const cutCommand = Buffer.from([0x1D, 0x56, 0x00]); 
    const finalBuffer = Buffer.concat([textBuffer, cutCommand]);
    
    const tempFile = path.join(__dirname, '..', '..', 'temp_receipt.bin');
    fs.writeFileSync(tempFile, finalBuffer);
    
    const psScript = path.join(__dirname, 'RawPrint.ps1');
    const psCommand = `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -printerName "POS-80C" -filePath "${tempFile}"`;
    
    console.log('[PRINTER] Sending RAW ESC/POS buffer with CUT command...');
    
    exec(psCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PRINTER ERROR]: ${error.message}`);
      } else {
        console.log(`[PRINTER SUCCESS] RAW output: ${stdout.trim()}`);
      }
      
      setTimeout(() => {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }, 5000);
    });
  } catch (err) {
    console.error('[PRINTER CATCH ERROR]', err);
  }
}

module.exports = {
  printOrderBackend
};
