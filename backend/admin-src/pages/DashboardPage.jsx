import React from 'react';
import { Link } from 'react-router-dom';

export const DashboardPage = ({
  stats,
  orders,
  foods,
  officers,
  onOpenAddFood,
  onUpdateOrderStatus,
}) => {
  // Compute active in-progress orders
  const activeOrders = orders.filter((o) => {
    const s = (o.status || o.kitchenStatus || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'DELIVERED' && s !== 'CANCELLED';
  });

  // Latest 5 orders
  const recentOrders = orders.slice(0, 5);

  // Meal slot counts
  const slotCounts = {
    breakfast: foods.filter((f) => f.mealSlot === 'breakfast').length,
    lunch: foods.filter((f) => f.mealSlot === 'lunch').length,
    dinner: foods.filter((f) => f.mealSlot === 'dinner').length,
  };

  return (
    <div className="page-dashboard">
      <div className="section-header">
        <div>
          <h2>Canteen Executive Overview</h2>
          <p>Live metrics, meal slots summary, and active order counts</p>
        </div>
        <button className="btn-primary" onClick={onOpenAddFood}>
          <span>+</span> Add Food Item
        </button>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card gold">
          <div className="metric-icon">₹</div>
          <div>
            <div className="metric-val">₹{stats.totalRevenue || 0}</div>
            <div className="metric-label">Total Revenue</div>
          </div>
        </div>

        <div className="metric-card green">
          <div className="metric-icon">📋</div>
          <div>
            <div className="metric-val">{orders.length}</div>
            <div className="metric-label">Total Orders</div>
          </div>
        </div>

        <div className="metric-card blue">
          <div className="metric-icon">⏳</div>
          <div>
            <div className="metric-val">{activeOrders.length}</div>
            <div className="metric-label">Active In Kitchen</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎖️</div>
          <div>
            <div className="metric-val">{officers.length}</div>
            <div className="metric-label">Registered Officers</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="quick-actions-grid">
        <Link to="/food-menu" className="action-card">
          <div className="action-card-icon">🍲</div>
          <div className="action-card-text">
            <h4>Manage Food Menu</h4>
            <p>{foods.length} items configured across meal slots</p>
          </div>
        </Link>

        <Link to="/orders" className="action-card">
          <div className="action-card-icon">📋</div>
          <div className="action-card-text">
            <h4>Live Orders & KOT</h4>
            <p>{activeOrders.length} orders currently being prepared</p>
          </div>
        </Link>

        <Link to="/whatsapp" className="action-card">
          <div className="action-card-icon">💬</div>
          <div className="action-card-text">
            <h4>WhatsApp & Lifetime QR</h4>
            <p>Admin gateway pairing & message audit</p>
          </div>
        </Link>

        <Link to="/officers" className="action-card">
          <div className="action-card-icon">🎖️</div>
          <div className="action-card-text">
            <h4>Registered Officers</h4>
            <p>{officers.length} authenticated IAS officers</p>
          </div>
        </Link>
      </div>

      {/* Slot Breakdown Banner */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>🍽️ Current Menu Availability by Meal Slot</h3>
          <Link to="/food-menu" className="btn-outline btn-sm">
            View All Dishes ➔
          </Link>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
            <div style={{ fontWeight: '800', color: '#b45309' }}>🍳 Breakfast Dishes</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: '#78350f' }}>
              {slotCounts.breakfast} Items
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '160px', padding: '12px', background: '#dbeafe', borderRadius: '8px' }}>
            <div style={{ fontWeight: '800', color: '#1d4ed8' }}>🍛 Lunch Dishes</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: '#1e3a8a' }}>
              {slotCounts.lunch} Items
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '160px', padding: '12px', background: '#f3e8ff', borderRadius: '8px' }}>
            <div style={{ fontWeight: '800', color: '#7e22ce' }}>🍲 Dinner Dishes</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: '#581c87' }}>
              {slotCounts.dinner} Items
            </div>
          </div>
        </div>
      </div>

      {/* Recent Live Orders Preview */}
      <div className="card">
        <div className="card-header">
          <h3>🕒 Recent Orders Preview</h3>
          <Link to="/orders" className="btn-outline btn-sm">
            Open Full Live Orders ➔
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Officer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const status = (order.status || order.kitchenStatus || 'NEW').toUpperCase();
                  const pStatus = (order.paymentStatus || 'UNPAID').toUpperCase();

                  let statusClass = 'badge-status-pending';
                  if (status === 'PREPARING') statusClass = 'badge-status-preparing';
                  if (status === 'READY') statusClass = 'badge-status-ready';
                  if (status === 'COMPLETED' || status === 'DELIVERED') statusClass = 'badge-status-delivered';
                  if (status === 'CANCELLED') statusClass = 'badge-status-cancelled';

                  return (
                    <tr key={order.id || order._id || order.orderNumber}>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        #{order.orderNumber}
                        {order.tokenNumber ? (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Token: #{order.tokenNumber}</div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{order.userName || 'IAS Officer'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>📱 {order.userPhone || '—'}</div>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                        {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ') || '—'}
                      </td>
                      <td style={{ fontWeight: '700' }}>₹{order.totalAmount || 0}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: pStatus === 'PAID' ? '#dcfce7' : '#fef3c7',
                            color: pStatus === 'PAID' ? '#15803d' : '#b45309',
                          }}
                        >
                          {pStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>{status}</span>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={status}
                          onChange={(e) => onUpdateOrderStatus(order.id || order._id, e.target.value)}
                        >
                          <option value="NEW">New</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="PREPARING">Preparing</option>
                          <option value="READY">Ready</option>
                          <option value="COMPLETED">Completed</option>
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
      </div>
    </div>
  );
};
