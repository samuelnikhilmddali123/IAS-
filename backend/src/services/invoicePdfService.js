const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Directly converts the exact thermal printer image (temp_user_bill.png)
 * into bill.pdf with matching dimensions and 0 margin, ensuring a 1:1 identical match.
 * Returns a Promise resolving to a PDF Buffer.
 */
function generateInvoicePdf(billData, imagePath = null) {
  return new Promise((resolve, reject) => {
    try {
      const targetImagePath = imagePath || path.join(__dirname, '../../temp_user_bill.png');
      
      if (fs.existsSync(targetImagePath)) {
        try {
          const doc = new PDFDocument({ autoFirstPage: false });
          const img = doc.openImage(targetImagePath);
          
          doc.addPage({
            size: [img.width, img.height],
            margin: 0,
            info: {
              Title: `Food Invoice - ${billData?.invoiceNo || 'PAID'}`,
              Author: 'Canteen Services • Government of India'
            }
          });
          
          doc.image(img, 0, 0, { width: img.width, height: img.height });
          
          const buffers = [];
          doc.on('data', b => buffers.push(b));
          doc.on('end', () => resolve(Buffer.concat(buffers)));
          doc.on('error', reject);
          doc.end();
          return;
        } catch (imgErr) {
          console.warn('[PDF GENERATION] Image load error, creating fallback receipt:', imgErr.message);
        }
      }

      // Fallback simple document if image not on disk
      const doc = new PDFDocument({ size: [380, 600], margin: 20 });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.font('Helvetica-Bold').fontSize(16).text('CANTEEN SERVICES • GOVERNMENT OF INDIA', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`FOOD INVOICE (PAID) - ${billData?.invoiceNo || ''}`, { align: 'center' });
      doc.fontSize(10).text(`Officer: ${billData?.userName || 'IAS Officer'}`);
      doc.text(`Total Paid: Rs. ${billData?.totalAmount || 0}`);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf
};
