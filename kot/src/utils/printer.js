/**
 * Official URL-Based Thermal Printing Utility
 * Works in both Browser (any laptop / device) and Electron Desktop App
 */

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://restaurants.stackvil.com';
};

/**
 * Print the Kitchen Order Ticket (KOT) from URL on checkout
 */
export async function printKOTTicket(orderIdOrOrder) {
  const id = typeof orderIdOrOrder === 'object' 
    ? (orderIdOrOrder._id || orderIdOrOrder.id || orderIdOrOrder.orderNumber || orderIdOrOrder.orderId || 'test') 
    : (orderIdOrOrder || 'test');

  const kotUrl = `${getApiBaseUrl()}/api/orders/${encodeURIComponent(id)}/kot-html?print=1`;
  console.log('[PRINT] Triggering Kitchen Order (KOT) print URL:', kotUrl);

  // 1. If running inside Electron desktop app, use native printUrl IPC
  if (window.api && window.api.printUrl) {
    try {
      await window.api.printUrl(kotUrl);
      return;
    } catch (e) {
      console.warn('[PRINT] Native Electron print error, falling back to iframe:', e);
    }
  }

  // 2. Browser iframe print using live URL source
  printBillViaIframe(kotUrl);
}

/**
 * Print the Official Customer Payment Bill from URL
 */
export async function printPaymentBill(orderIdOrOrder) {
  const id = typeof orderIdOrOrder === 'object' 
    ? (orderIdOrOrder._id || orderIdOrOrder.id || orderIdOrOrder.orderNumber || orderIdOrOrder.orderId || 'test') 
    : (orderIdOrOrder || 'test');

  const billUrl = `${getApiBaseUrl()}/api/orders/${encodeURIComponent(id)}/bill-html?print=1`;
  console.log('[PRINT] Triggering official payment bill print URL:', billUrl);

  // 1. If running inside Electron desktop app, use native printUrl IPC
  if (window.api && window.api.printUrl) {
    try {
      await window.api.printUrl(billUrl);
      return;
    } catch (e) {
      console.warn('[PRINT] Native Electron print error, falling back to iframe:', e);
    }
  }

  // 2. Browser iframe print using live URL source
  printBillViaIframe(billUrl);
}

export const printUserBill = printPaymentBill;

/**
 * Loads the actual bill URL inside an in-viewport iframe and triggers native print
 */
function printBillViaIframe(billUrl) {
  const existingFrame = document.getElementById('kot-print-frame');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'kot-print-frame';
  // Position in viewport with low opacity so Chromium does not discard rasterization
  iframe.style.position = 'fixed';
  iframe.style.right = '0px';
  iframe.style.bottom = '0px';
  iframe.style.width = '380px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-999';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';

  let printTriggered = false;
  const doPrint = () => {
    if (printTriggered) return;
    printTriggered = true;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    } catch (err) {
      console.warn('[PRINT] Iframe focus/print failed, opening print window fallback:', err);
      window.open(billUrl, '_blank');
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 25000);
    }
  };

  iframe.onload = () => {
    // Wait slightly for DOM, SVGs and fonts inside iframe to paint
    setTimeout(doPrint, 500);
  };

  iframe.src = billUrl;
  document.body.appendChild(iframe);
}

