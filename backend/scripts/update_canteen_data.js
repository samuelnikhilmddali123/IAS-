const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../frontend/src/data/canteenData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace "price": 150 with "price": 150,\n    "generalPrice": 150,\n    "officialPrice": 128 (if officialPrice not already there)
content = content.replace(/"price":\s*(\d+)(?!,\s*"officialPrice")/g, (match, p) => {
  const price = parseInt(p, 10);
  const officialPrice = Math.max(1, Math.round(price * 0.85));
  return `"price": ${price},\n    "generalPrice": ${price},\n    "officialPrice": ${officialPrice}`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated canteenData.ts with officialPrice and generalPrice');
