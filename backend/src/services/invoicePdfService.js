const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates an official Government Canteen Services Paid Food Invoice PDF.
 * Returns a Promise that resolves with a Buffer.
 */
function generateInvoicePdf(billData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Canteen Invoice - ${billData.invoiceNo || 'PAID'}`,
          Author: 'Canteen Services • Government of India'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const primaryColor = '#0a3d31';
      const secondaryColor = '#15803d';
      const darkText = '#0f172a';
      const mutedText = '#64748b';
      const borderGray = '#e2e8f0';

      // 1. Header with Emblem / Logo
      const logoPath = path.join(__dirname, '../../public/blank_template.png');
      const emblemPath = path.join(__dirname, '../../../frontend/assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');
      
      let logoDrawn = false;
      if (fs.existsSync(emblemPath)) {
        try {
          doc.image(emblemPath, 40, 40, { width: 45 });
          logoDrawn = true;
        } catch (e) {}
      }

      const textStartX = logoDrawn ? 95 : 40;

      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(primaryColor)
        .text('GOVERNMENT OF INDIA', textStartX, 40)
        .fontSize(13)
        .fillColor(secondaryColor)
        .text('CANTEEN SERVICES', textStartX, 62)
        .fontSize(9)
        .fillColor(mutedText)
        .text('Good Food. Greater Service. • Nourishing Progress', textStartX, 78);

      // Right Top: Paid Badge
      doc
        .rect(380, 40, 175, 48)
        .fillAndStroke('#f0fdf4', '#bbf7d0');

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#15803d')
        .text('TAX INVOICE (PAID)', 380, 48, { width: 175, align: 'center' })
        .fontSize(9)
        .fillColor('#166534')
        .text('ONLINE UPI VERIFIED', 380, 66, { width: 175, align: 'center' });

      // Divider
      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(primaryColor).lineWidth(1.5).stroke();

      // 2. Invoice & Officer Details
      const detailsTop = 118;

      // Left Box: Officer Details
      doc
        .rect(40, detailsTop, 250, 85)
        .fillAndStroke('#f8fafc', borderGray);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(primaryColor)
        .text('BILLED TO (OFFICER):', 50, detailsTop + 10)
        .fontSize(11)
        .fillColor(darkText)
        .text(billData.userName || 'IAS Officer', 50, detailsTop + 25)
        .font('Helvetica')
        .fontSize(9)
        .fillColor(mutedText)
        .text(billData.designation || 'IAS Officer • Special Duty', 50, detailsTop + 40)
        .text(billData.department || 'Cabinet Secretariat • Govt of India', 50, detailsTop + 54)
        .text(`Phone: ${billData.userPhone || '+91 91212 66269'}`, 50, detailsTop + 68);

      // Right Box: Invoice Meta
      doc
        .rect(305, detailsTop, 250, 85)
        .fillAndStroke('#f8fafc', borderGray);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(primaryColor)
        .text('INVOICE METADATA:', 315, detailsTop + 10)
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(darkText)
        .text(`Invoice No:`, 315, detailsTop + 26)
        .font('Helvetica')
        .text(billData.invoiceNo || `INV-${Date.now()}`, 395, detailsTop + 26)
        .font('Helvetica-Bold')
        .text(`Date:`, 315, detailsTop + 40)
        .font('Helvetica')
        .text(billData.date || new Date().toLocaleDateString('en-IN'), 395, detailsTop + 40)
        .font('Helvetica-Bold')
        .text(`Time:`, 315, detailsTop + 54)
        .font('Helvetica')
        .text(billData.time || new Date().toLocaleTimeString('en-IN'), 395, detailsTop + 54)
        .font('Helvetica-Bold')
        .text(`Payment:`, 315, detailsTop + 68)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text('PAID (100% Verified)', 395, detailsTop + 68);

      // 3. Item Table
      const tableTop = 220;
      doc
        .rect(40, tableTop, 515, 26)
        .fillAndStroke(primaryColor, primaryColor);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#ffffff')
        .text('#', 50, tableTop + 8)
        .text('ITEM DESCRIPTION', 85, tableTop + 8)
        .text('QTY', 340, tableTop + 8, { width: 40, align: 'center' })
        .text('RATE (Rs.)', 400, tableTop + 8, { width: 60, align: 'right' })
        .text('AMOUNT (Rs.)', 475, tableTop + 8, { width: 70, align: 'right' });

      let currentY = tableTop + 26;
      const items = billData.items || [];

      items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        doc
          .rect(40, currentY, 515, 24)
          .fillAndStroke(isEven ? '#ffffff' : '#f8fafc', borderGray);

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(darkText)
          .text(String(index + 1), 50, currentY + 7)
          .font('Helvetica-Bold')
          .text(item.name || 'Menu Item', 85, currentY + 7, { width: 245, ellipsis: true })
          .font('Helvetica')
          .text(String(item.qty || item.quantity || 1), 340, currentY + 7, { width: 40, align: 'center' })
          .text(`₹${Number(item.price || 0).toFixed(2)}`, 400, currentY + 7, { width: 60, align: 'right' })
          .font('Helvetica-Bold')
          .text(`₹${Number(item.total || (item.qty * item.price) || 0).toFixed(2)}`, 475, currentY + 7, { width: 70, align: 'right' });

        currentY += 24;
      });

      // 4. Totals Summary Box
      currentY += 12;
      const totalBoxY = currentY;

      doc
        .rect(320, totalBoxY, 235, 75)
        .fillAndStroke('#f0fdf4', '#86efac');

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(mutedText)
        .text('Subtotal:', 335, totalBoxY + 12)
        .text(`₹${Number(billData.totalAmount || 0).toFixed(2)}`, 450, totalBoxY + 12, { width: 95, align: 'right' })
        .text('Service & GST (0%):', 335, totalBoxY + 28)
        .text('₹0.00', 450, totalBoxY + 28, { width: 95, align: 'right' })
        .moveTo(335, totalBoxY + 44).lineTo(545, totalBoxY + 44).strokeColor('#86efac').lineWidth(1).stroke()
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(primaryColor)
        .text('TOTAL PAID:', 335, totalBoxY + 52)
        .text(`₹${Number(billData.totalAmount || 0).toFixed(2)}`, 430, totalBoxY + 52, { width: 115, align: 'right' });

      // Notes / Declaration on Left
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(primaryColor)
        .text('PAYMENT VERIFICATION:', 40, totalBoxY + 12)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(mutedText)
        .text('This is an official digitally generated receipt. No physical signature is required.', 40, totalBoxY + 26, { width: 260 })
        .text('Thank you for dining with Central Canteen Services.', 40, totalBoxY + 44, { width: 260 });

      // 5. Footer Bar
      const footerY = 740;
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderGray).lineWidth(1).stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(primaryColor)
        .text('CANTEEN SERVICES • GOVERNMENT OF INDIA', 40, footerY + 10, { width: 515, align: 'center' })
        .font('Helvetica')
        .fontSize(8)
        .fillColor(mutedText)
        .text('Official Canteen Management Platform • Healthy People. Stronger India.', 40, footerY + 24, { width: 515, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf
};
