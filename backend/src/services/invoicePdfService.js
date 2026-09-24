const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates an official Government Canteen Services Paid Food Invoice PDF.
 * If the exact thermal printer render temp_user_bill.png is available, embeds it cleanly at full crisp resolution.
 * Otherwise, generates the exact receipt slip matching the physical POS-80C printout.
 * Returns a Promise that resolves with a Buffer.
 */
function generateInvoicePdf(billData) {
  return new Promise((resolve, reject) => {
    try {
      const tempBillPng = path.join(__dirname, '../../temp_user_bill.png');
      
      // If the rendered receipt image from RenderAndPrintUserBill.ps1 exists and was modified recently
      if (fs.existsSync(tempBillPng)) {
        try {
          const imgBuffer = fs.readFileSync(tempBillPng);
          // PDF dimensions based on 80mm thermal receipt aspect ratio (width 380pt)
          const doc = new PDFDocument({
            size: [380, 720],
            margin: 0,
            info: {
              Title: `Food Invoice - ${billData.invoiceNo || 'PAID'}`,
              Author: 'Canteen Services • Government of India'
            }
          });

          const buffers = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => resolve(Buffer.concat(buffers)));

          // Fit image to document width and centered
          doc.image(tempBillPng, 10, 10, { width: 360 });
          doc.end();
          return;
        } catch (e) {
          console.warn('[PDF GENERATION] Image embed fallback to vector generator:', e.message);
        }
      }

      // Vector receipt generator matching the thermal POS-80C format
      const items = billData.items || [];
      const itemRowHeight = 24;
      const baseHeight = 520;
      const pageHeight = Math.max(650, baseHeight + (items.length * itemRowHeight));

      const doc = new PDFDocument({
        size: [380, pageHeight],
        margin: 15,
        info: {
          Title: `Canteen Bill - ${billData.invoiceNo || 'PAID'}`,
          Author: 'Canteen Services • Government of India'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const darkText = '#111827';
      const grayLine = '#9ca3af';

      // 1. Header: Logo & Branding
      const logoPath = path.join(__dirname, '../../../frontend/assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 20, 20, { width: 55 });
        } catch (e) {}
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(darkText)
        .text('CANTEEN SERVICES', 85, 20)
        .fontSize(8.5)
        .text('GOVERNMENT OF INDIA', 85, 40)
        .text('GOOD FOOD. GREATER SERVICE.', 85, 52);

      // Vertical Divider
      doc.moveTo(240, 18).lineTo(240, 75).strokeColor(grayLine).lineWidth(1).stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(darkText)
        .text('OFFICIAL', 250, 22)
        .text('TAX INVOICE', 250, 34)
        .text('PAID RECEIPT', 250, 46)
        .text('DIGITAL COPY', 250, 58);

      // 2. Paid Invoice Inverted Black Badge
      doc
        .rect(20, 85, 340, 32)
        .fillAndStroke('#000000', '#000000');

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#ffffff')
        .text('FOOD INVOICE (PAID)', 20, 95, { width: 340, align: 'center' });

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(darkText)
        .text('ONLINE PAYMENT VERIFIED', 20, 124, { width: 340, align: 'center' });

      // Dashed Line 1
      doc.moveTo(20, 140).lineTo(360, 140).dash(4, { space: 2 }).strokeColor(darkText).lineWidth(1).stroke().undash();

      // 3. Invoice & Officer Details
      let metaY = 148;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(darkText);
      doc.text('Invoice No :', 25, metaY).text(String(billData.invoiceNo || 'INV-001'), 110, metaY);

      metaY += 20;
      doc.text('Officer     :', 25, metaY).text(String(billData.userName || 'IAS Officer'), 110, metaY);

      metaY += 20;
      doc.text('Date         :', 25, metaY).text(String(billData.date || new Date().toLocaleDateString('en-IN')), 110, metaY);

      metaY += 20;
      doc.text('Time         :', 25, metaY).text(String(billData.time || new Date().toLocaleTimeString('en-IN')), 110, metaY);

      metaY += 20;
      doc.text('Status      :', 25, metaY).fillColor('#15803d').text('PAID (Online UPI)', 110, metaY);

      // Dashed Line 2
      metaY += 26;
      doc.moveTo(20, metaY).lineTo(360, metaY).dash(4, { space: 2 }).strokeColor(darkText).lineWidth(1).stroke().undash();

      // 4. Table Header
      metaY += 10;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(darkText);
      doc.text('#', 25, metaY);
      doc.text('ITEM', 50, metaY);
      doc.text('QTY', 210, metaY, { width: 35, align: 'center' });
      doc.text('RATE', 260, metaY, { width: 40, align: 'center' });
      doc.text('AMT (Rs)', 305, metaY, { width: 55, align: 'right' });

      metaY += 18;
      doc.moveTo(20, metaY).lineTo(360, metaY).strokeColor(darkText).lineWidth(1).stroke();

      // Items List
      metaY += 8;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(darkText);

      items.forEach((item, index) => {
        doc.text(String(index + 1), 25, metaY);
        doc.text(String(item.name || 'Food Item'), 50, metaY, { width: 155, ellipsis: true });
        doc.text(String(item.qty || item.quantity || 1), 210, metaY, { width: 35, align: 'center' });
        doc.text(String(item.price || 0), 260, metaY, { width: 40, align: 'center' });
        const tot = item.total || ((item.qty || 1) * (item.price || 0));
        doc.text(String(tot), 305, metaY, { width: 55, align: 'right' });
        metaY += 20;
      });

      // Dashed Line 3
      metaY += 6;
      doc.moveTo(20, metaY).lineTo(360, metaY).dash(4, { space: 2 }).strokeColor(darkText).lineWidth(1).stroke().undash();

      // 5. Total Paid
      metaY += 14;
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkText);
      doc.text('TOTAL PAID :', 25, metaY);
      doc.fontSize(14).fillColor('#000000').text(`Rs. ${billData.totalAmount || 0}`, 200, metaY, { width: 160, align: 'right' });

      // Dashed Line 4
      metaY += 28;
      doc.moveTo(20, metaY).lineTo(360, metaY).dash(4, { space: 2 }).strokeColor(darkText).lineWidth(1).stroke().undash();

      // 6. Footer Callout & Script
      metaY += 14;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(darkText);
      doc.text('THANK YOU FOR YOUR SERVICE', 20, metaY, { width: 340, align: 'center' });

      metaY += 18;
      doc.font('Helvetica-Oblique').fontSize(14).fillColor(darkText);
      doc.text('Thank You', 20, metaY, { width: 340, align: 'center' });

      metaY += 24;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText);
      doc.text('CANTEEN SERVICES', 20, metaY, { width: 340, align: 'center' });
      doc.fontSize(7.5).text('GOOD FOOD. GREATER SERVICE.', 20, metaY + 12, { width: 340, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf
};
