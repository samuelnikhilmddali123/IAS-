// Helper to calculate human readable time ago
export const getTimeAgo = (dateInput) => {
  if (!dateInput) return 'Just now';
  const diffMs = Date.now() - new Date(dateInput).getTime();
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Helper to calculate elapsed seconds for prep timer
export const getElapsedSeconds = (dateInput) => {
  if (!dateInput) return 0;
  const diffSec = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
  return diffSec > 0 ? diffSec : 0;
};

// Normalize backend status to UI status
export const mapBackendStatusToUI = (raw) => {
  if (!raw) return 'prep';
  const kStatus = (raw.kitchenStatus || '').toUpperCase();
  const status = (raw.status || '').toUpperCase();

  if (kStatus === 'CANCELLED' || status === 'CANCELLED') {
    return 'cancelled';
  }
  if (kStatus === 'COMPLETED' || status === 'COMPLETED' || status === 'DELIVERED') {
    return 'completed';
  }
  if (kStatus === 'READY' || status === 'READY') {
    return 'ready';
  }
  if (kStatus === 'PREPARING') {
    return 'prep';
  }
  if (kStatus === 'ACCEPTED') {
    return 'prep';
  }
  if (kStatus === 'NEW') {
    return 'prep';
  }

  // Fallback to main status field
  if (status === 'PREPARING') return 'prep';
  if (status === 'READY') return 'ready';
  if (status === 'COMPLETED') return 'completed';

  return 'prep';
};

// Normalize a raw backend order object to UI format
export const normalizeOrder = (raw) => {
  if (!raw) return null;

  const uiStatus = mapBackendStatusToUI(raw);
  const timeAgo = getTimeAgo(raw.createdAt);
  const timerSec = getElapsedSeconds(raw.createdAt);

  const items = (raw.items || []).map(item => ({
    qty: item.quantity || item.qty || 1,
    name: item.name || 'Dish item',
    price: item.price || 0,
    spicy: !!item.spicy || (item.name && item.name.toLowerCase().includes('spicy'))
  }));

  const orderId = raw.id || raw._id || raw.orderNumber || String(Math.floor(Math.random() * 9000) + 1000);

  return {
    id: orderId,
    _id: raw._id || raw.id,
    orderNumber: raw.orderNumber || (orderId.length > 10 ? `ORD-${orderId.slice(-5)}` : orderId),
    tokenNumber: raw.tokenNumber || null,
    userName: raw.userName || raw.customerName || 'Officer',
    userPhone: raw.userPhone || '',
    type: raw.orderType === 'INSTANT' ? 'Instant KOT' : raw.orderType || raw.type || 'Dine In',
    table: raw.table || (raw.mealSlot && raw.mealSlot !== 'General' ? `${raw.mealSlot} Slot` : 'Counter Pickup'),
    items,
    note: raw.orderNote || raw.note || '',
    status: uiStatus,
    rawKitchenStatus: (raw.kitchenStatus || '').toUpperCase(),
    rawStatus: (raw.status || '').toUpperCase(),
    timerSeconds: timerSec,
    startedTimeAgo: uiStatus === 'prep' ? `Cooking · ${timeAgo}` : `Started ${timeAgo}`,
    readyTimeAgo: uiStatus === 'ready' ? `Ready · ${timeAgo}` : `Ready ${timeAgo}`,
    timeAgo,
    totalAmount: raw.totalAmount || raw.grandTotal || 0,
    paymentStatus: raw.paymentStatus || 'UNPAID',
    createdAt: raw.createdAt || new Date().toISOString()
  };
};
