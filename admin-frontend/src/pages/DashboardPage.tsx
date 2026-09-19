import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export const DashboardPage: React.FC = () => {
  const { API_BASE, adminStats, allOrders, openAddFoodModal, showToast, refreshAllData } = useAdmin();
  const navigate = useNavigate();

  const recentOrders = allOrders.slice(0, 5);

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

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Canteen Executive Overview</h2>
          <p>Live metrics, dining summary, and meal slot counts</p>
        </div>
        <button className="btn-primary" onClick={openAddFoodModal}>
          <span>+</span> Add Food Item
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card gold">
          <div className="metric-icon">₹</div>
          <div>
            <div className="metric-val">
              ₹{(adminStats.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="metric-label">Total Revenue</div>
          </div>
        </div>
        <div className="metric-card green">
          <div className="metric-icon">📋</div>
          <div>
            <div className="metric-val">{adminStats.totalOrdersCount || 0}</div>
            <div className="metric-label">Total Orders Placed</div>
          </div>
        </div>
        <div className="metric-card blue">
          <div className="metric-icon">⏳</div>
          <div>
            <div className="metric-val">{adminStats.activeOrdersCount || 0}</div>
            <div className="metric-label">Active Preparing</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🎖️</div>
          <div>
            <div className="metric-val">{adminStats.totalOfficersCount || 0}</div>
            <div className="metric-label">Registered Officers</div>
          </div>
        </div>
      </div>

      {/* Recent Orders Preview */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Kitchen Orders</h3>
          <button className="btn-outline" onClick={() => navigate('/liveorders')}>
            View All Orders ➔
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order No.</th>
              <th>Officer</th>
              <th>Items Ordered</th>
              <th>Slot</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '18px', color: '#94a3b8' }}>
                  No orders recorded yet.
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => {
                const orderId = order.id || order.orderNumber;
                return (
                  <tr key={order.orderNumber || order.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.orderNumber}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={
                            order.userAvatar ||
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'
                          }
                          className="officer-avatar"
                          style={{ width: '32px', height: '32px' }}
                          alt={order.userName || 'Officer'}
                        />
                        <span style={{ fontWeight: 600 }}>{order.userName || 'IAS Officer'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {(order.items || [])
                        .map((i) => `${i.quantity}x ${i.name || i.item?.name || 'Dish'}`)
                        .join(', ')}
                    </td>
                    <td>
                      <span className="badge badge-lunch">{order.mealSlot || 'General'}</span>
                    </td>
                    <td style={{ fontWeight: 800 }}>₹{order.totalAmount}</td>
                    <td>
                      <span className={`badge badge-status-${(order.status || 'pending').toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={order.status}
                        onChange={(e) => updateOrderStatus(orderId, e.target.value)}
                      >
                        <option value="PREPARING">Preparing</option>
                        <option value="READY">Ready</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
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
