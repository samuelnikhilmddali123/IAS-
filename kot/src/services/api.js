export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const KitchenAPI = {
  // 1. Fetch Orders
  getOrders: async (status) => {
    try {
      const url = status 
        ? `${BASE_URL}/api/orders/admin/all?status=${encodeURIComponent(status)}`
        : `${BASE_URL}/api/orders/admin/all`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('KitchenAPI.getOrders error:', err);
      throw err;
    }
  },

  getOrderById: async (orderId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${encodeURIComponent(orderId)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`KitchenAPI.getOrderById(${orderId}) error:`, err);
      throw err;
    }
  },

  // 2. Kitchen & Order Stats
  getKitchenStats: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/admin/stats`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('KitchenAPI.getKitchenStats error:', err);
      throw err;
    }
  },

  // 3. Lifecycle Status Transitions
  // Allowed statuses: 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
  updateOrderStatus: async (orderId, status) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        // Fallback to /api/orders/admin/:id/status if standard route returns 404
        if (res.status === 404) {
          const fallbackRes = await fetch(`${BASE_URL}/api/orders/admin/${encodeURIComponent(orderId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          return await fallbackRes.json();
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`KitchenAPI.updateOrderStatus(${orderId}, ${status}) error:`, err);
      throw err;
    }
  },

  // 4. Menu / Food Management
  getAllFoods: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/foods/admin`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('KitchenAPI.getAllFoods error:', err);
      throw err;
    }
  },

  getActiveFoods: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/api/foods${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('KitchenAPI.getActiveFoods error:', err);
      throw err;
    }
  },

  toggleFoodStock: async (foodId, isAvailable, availableQuantity = null) => {
    try {
      const payload = { isAvailable };
      if (availableQuantity !== null && availableQuantity !== undefined) {
        payload.availableQuantity = availableQuantity;
      } else if (!isAvailable) {
        payload.availableQuantity = 0;
      }

      const res = await fetch(`${BASE_URL}/api/foods/${encodeURIComponent(foodId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`KitchenAPI.toggleFoodStock(${foodId}) error:`, err);
      throw err;
    }
  },

  createFood: async (foodData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodData)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('KitchenAPI.createFood error:', err);
      throw err;
    }
  },

  updateFood: async (foodId, updates) => {
    try {
      const res = await fetch(`${BASE_URL}/api/foods/${encodeURIComponent(foodId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`KitchenAPI.updateFood(${foodId}) error:`, err);
      throw err;
    }
  },

  deleteFood: async (foodId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/foods/${encodeURIComponent(foodId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`KitchenAPI.deleteFood(${foodId}) error:`, err);
      throw err;
    }
  }
};
