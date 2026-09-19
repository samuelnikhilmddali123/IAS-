import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export const LiveOrdersPage: React.FC = () => {
  const { API_BASE, allOrders, showToast, refreshAllData } = useAdmin();
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      showToast(`Order status marked as ${status}`);
      await refreshAllData();
    } catch (e) {
      showToast('Failed to update order status');
    }
  };

  let filteredOrders = allOrders;
  if (activeStatusFilter !== 'all') {
    filteredOrders = filteredOrders.filter((o) => o.status === activeStatusFilter);
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Kitchen Orders & Dispense Queue</h2>
          <p>Live order queue with status tracker (Preparing, Ready for Counter, Delivered)</p>
        </div>
        <div className="filters-row">
          <button
            className={`filter-btn${activeStatusFilter === 'all' ? ' active' : ''}`}
            onClick={() => setActiveStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn${activeStatusFilter === 'PREPARING' ? ' active' : ''}`}
            onClick={() => setActiveStatusFilter('PREPARING')}
          >
            Preparing
          </button>
          <button
            className={`filter-btn${activeStatusFilter === 'READY' ? ' active' : ''}`}
            onClick={() => setActiveStatusFilter('READY')}
          >
            Ready for Pickup
          </button>
          <button
            className={`filter-btn${activeStatusFilter === 'DELIVERED' ? ' active' : ''}`}
            onClick={() => setActiveStatusFilter('DELIVERED')}
          >
            Delivered
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Order ID / Time</th>
              <th>Officer Info</th>
              <th>Items & Instructions</th>
              <th>Meal Slot</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Live Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No orders in this state.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const orderId = order.id || order.orderNumber;
                return (
                  <tr key={order.orderNumber || order.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {order.orderNumber}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={
                            order.userAvatar ||
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'
                          }
                          className="officer-avatar"
                          alt={order.userName || 'Officer'}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.userName || 'IAS Officer'}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {order.userPhone || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {(order.items || [])
                          .map((i) => `${i.quantity}x ${i.name || i.item?.name || 'Dish'}`)
                          .join(', ')}
                      </div>
                      {order.orderNote && (
                        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
                          Note: {order.orderNote}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-lunch">{order.mealSlot || 'General'}</span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                      {order.paymentMethod || 'online'}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{order.totalAmount}
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={order.status}
                        onChange={(e) => updateOrderStatus(orderId, e.target.value)}
                      >
                        <option value="PREPARING">⏳ Preparing</option>
                        <option value="READY">🔔 Ready for Pickup</option>
                        <option value="DELIVERED">✓ Delivered</option>
                        <option value="CANCELLED">✕ Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
