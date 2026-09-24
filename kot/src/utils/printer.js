/**
 * Kitchen Order Ticket (KOT) Printing Utility
 * Opens a clean, formatted thermal receipt print dialog (like Gmail's print trigger)
 * directly targeting the connected printer.
 */
export function printKOTTicket(order) {
  if (!order) return;

  const displayToken = order.tokenNumber ? `TOKEN #${order.tokenNumber}` : (order.orderNumber || `#${order.id}`);
  const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const customer = order.userName || 'Counter Pickup';
  const tableOrLocation = order.table || (order.mealSlot && order.mealSlot !== 'General' ? `${order.mealSlot} Slot` : 'Dine In / Counter');
  const orderType = order.type || 'Dine In';
  const items = order.items || [];
  const note = order.note || order.orderNote || '';
  const totalAmount = order.totalAmount ? `₹${order.totalAmount}` : '';

  // Remove any pre-existing printing iframe
  const existingIframe = document.getElementById('kot-print-frame');
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  // Create an isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'kot-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>KOT - ${displayToken}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 3mm;
        }
        @media print {
          body {
            width: 74mm;
            margin: 0;
            padding: 2mm;
          }
        }
        body {
          font-family: 'Courier New', Courier, 'Lucida Console', monospace, system-ui;
          font-size: 12px;
          line-height: 1.25;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 3mm;
          width: 74mm;
          box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: 800; }
        .header-box {
          border-bottom: 2px dashed #000;
          padding-bottom: 5px;
          margin-bottom: 6px;
          text-align: center;
        }
        .kitchen-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .canteen-sub {
          font-size: 11px;
          font-weight: 700;
          margin-top: 1px;
        }
        .kot-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }
        .token-badge {
          font-size: 22px;
          font-weight: 900;
          margin: 6px 0;
          padding: 5px;
          border: 2px solid #000;
          text-align: center;
          background: #fff;
        }
        .meta-table {
          width: 100%;
          font-size: 11px;
          margin-bottom: 4px;
          border-collapse: collapse;
        }
        .meta-table td {
          padding: 1.5px 0;
          vertical-align: top;
        }
        .divider {
          border-bottom: 1px dashed #000;
          margin: 5px 0;
        }
        .double-divider {
          border-bottom: 2px solid #000;
          margin: 6px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 4px;
        }
        .items-table th {
          border-bottom: 1px solid #000;
          text-align: left;
          padding: 3px 0;
          font-size: 10.5px;
          font-weight: 800;
        }
        .items-table td {
          padding: 4px 0;
          vertical-align: top;
        }
        .qty-col {
          width: 20%;
          font-weight: 900;
          font-size: 13px;
        }
        .item-col {
          width: 80%;
        }
        .item-name {
          font-weight: 700;
        }
        .item-extra {
          font-size: 10px;
          font-style: italic;
          display: block;
        }
        .note-box {
          background: #f4f4f4;
          border: 1px dashed #000;
          padding: 5px;
          margin: 6px 0;
          font-size: 11px;
          font-weight: 700;
        }
        .footer {
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px dashed #000;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div class="kitchen-title">MAIN KITCHEN</div>
        <div class="canteen-sub">MILITARY CANTEEN & OFFICERS MESS</div>
        <div class="kot-label">KITCHEN ORDER TICKET (KOT)</div>
      </div>

      <div class="token-badge">
        ${displayToken}
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>Order ID:</strong> ${displayId}</td>
          <td class="text-right"><strong>Type:</strong> ${orderType}</td>
        </tr>
        <tr>
          <td><strong>Customer:</strong> ${customer}</td>
          <td class="text-right"><strong>Table:</strong> ${tableOrLocation}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>Date & Time:</strong> ${dateStr} ${timeStr}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="qty-col">QTY</th>
            <th class="item-col">ITEM DESCRIPTION</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td class="qty-col">${item.qty || item.quantity || 1} ×</td>
              <td class="item-col">
                <span class="item-name">${item.name}</span>
                ${item.spicy ? '<span class="item-extra">** Spicy Preparation **</span>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${note ? `
        <div class="note-box">
          KITCHEN NOTE: ${note}
        </div>
      ` : ''}

      ${totalAmount ? `
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; margin-top: 2px;">
          <span>TOTAL AMOUNT:</span>
          <span>${totalAmount}</span>
        </div>
      ` : ''}

      <div class="double-divider"></div>

      <div class="footer">
        <div>*** KITCHEN PRODUCTION COPY ***</div>
        <div>Station: Main Kitchen Hot Line</div>
        <div style="font-size: 9px; margin-top: 2px;">Printed via KOT Terminal on Order Acceptance</div>
      </div>
    </body>
    </html>
  `);
  doc.close();

  // Trigger print dialog (Gmail-like behavior)
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Direct iframe print invocation fallback:', err);
      // Fallback: print current window if iframe access is restricted
      window.print();
    } finally {
      // Clean up iframe after print dialog completes
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 5000);
    }
  }, 300);
}
