const puppeteer = require('puppeteer');
const { generateBillHtml } = require('./billImageService');
const PDFDocument = require('pdfkit');

/**
 * Dynamically generates the authentic Canteen Services "FOOD BILL" dining receipt PDF
 * matching the exact user design template (including zig-zag paper edges, food bill pill, items, and feedback QR).
 * Returns a Promise resolving to a PDF Buffer.
 */
async function generateInvoicePdf(billData) {
  const html = await generateBillHtml(billData);

  // 1. Primary: High-fidelity Puppeteer PDF rendering
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 900, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 6000 });

    const pdfBuffer = await page.pdf({
      width: '460px',
      printBackground: true,
      margin: {
        top: '10px',
        bottom: '10px',
        left: '10px',
        right: '10px'
      }
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (puppeteerErr) {
    console.warn('[PDF Service] Puppeteer PDF warning, using PDFKit fallback:', puppeteerErr.message);
  }

  // 2. Resilient PDFKit Fallback
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [380, 680],
        margin: 20,
        info: {
          Title: `Food Bill - ${billData?.invoiceNo || billData?.orderNumber || 'PAID'}`,
          Author: 'Canteen Services',
          Subject: 'Official Food Bill Receipt'
        }
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const invoiceNo = billData?.billNo || billData?.invoiceNo || (billData?.orderNumber ? `#${billData.orderNumber.replace(/\D/g, '').padStart(6, '0')}` : '#CS241027');
      const tableNo = billData?.table || billData?.tableNo || (billData?.roomNumber ? `T-${billData.roomNumber}` : 'T-08');
      const dateStr = billData?.date || '22 Sep 2026';
      const timeStr = billData?.time || '02:10 PM';

      // Header
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('CANTEEN SERVICES', { align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#333333').text('GOOD FOOD • GREATER SERVICE', { align: 'center' });
      doc.moveDown(0.5);

      // Pill Banner
      doc.roundedRect(110, doc.y, 160, 24, 12).fill('#000000');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('FOOD BILL', 110, doc.y + 6, { width: 160, align: 'center' });
      doc.moveDown(0.8);
      doc.fontSize(7.5).font('Helvetica').fillColor('#444444').text('THANK YOU FOR DINING WITH US', { align: 'center' });
      doc.moveDown(0.5);

      // Meta
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(`Bill No   : ${invoiceNo}`, 30, doc.y);
      doc.text(`Date      : ${dateStr}`, 30, doc.y);
      doc.text(`Time      : ${timeStr}`, 30, doc.y);
      doc.text(`Table     : ${tableNo}`, 30, doc.y);
      doc.moveDown(0.5);

      // Items Table
      doc.strokeColor('#666666').lineWidth(0.8).dash(3, { space: 3 }).moveTo(20, doc.y).lineTo(360, doc.y).stroke().undash();
      doc.moveDown(0.5);

      const items = Array.isArray(billData?.items) && billData.items.length > 0 ? billData.items : [{ name: 'Dining Items', qty: 1, price: billData?.totalAmount || 100, total: billData?.totalAmount || 100 }];
      
      items.forEach((item, idx) => {
        const qty = item.qty || item.quantity || 1;
        const total = item.total || (qty * (item.price || 0));
        doc.fontSize(9).font('Helvetica').text(`${idx + 1}.  ${item.name}`, 30, doc.y, { continued: true, width: 220 });
        doc.text(`Qty: ${qty}`, 250, doc.y, { continued: true, width: 50 });
        doc.text(`Rs.${total}`, 300, doc.y, { align: 'right' });
      });

      doc.moveDown(0.5);
      const totalAmount = billData?.totalAmount || items.reduce((s, i) => s + (i.total || (i.qty * i.price) || 0), 0);
      doc.strokeColor('#000000').lineWidth(1).moveTo(200, doc.y).lineTo(360, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold').text(`TOTAL AMOUNT: Rs.${totalAmount}`, { align: 'right' });
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold').text('Thank You! Visit Again', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf
};
