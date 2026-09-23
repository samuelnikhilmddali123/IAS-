const { printOrderBackend } = require('./src/utils/printerService');

const mockOrder = {
  id: '123456',
  orderNumber: 'ORD-999',
  tokenNumber: 99,
  userName: 'Test User',
  table: 'Table 5',
  type: 'Dine In',
  totalAmount: 150,
  items: [
    { qty: 2, name: 'Test Item 1', spicy: true },
    { qty: 1, name: 'Test Item 2' }
  ],
  note: 'Extra test note'
};

console.log('Running test print...');
printOrderBackend(mockOrder);
