import React, { useState } from 'react';

export const OrdersPage = ({ orders, onUpdateOrderStatus }) => {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const statusFilters = ['ALL', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

  const filteredOrders = orders.filter((order) => {
    const s = (order.status || order.kitchenStatus || 'NEW').toUpperCase();

    // Status filter
    if (filterStatus !== 'ALL' && s !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchOrderNum = (order.orderNumber || '').toLowerCase().includes(q);
      const matchName = (order.userName || '').toLowerCase().includes(q);
      const matchToken = String(order.tokenNumber || '').includes(q);
      if (!matchOrderNum && !matchName && !matchToken) return false;
    }

    return true;
  });

  return (
    <div className="page-orders">
      <div className="section-header">
        <div>
          <h2>Live Orders & Kitchen Display (KOT)</h2>
          <p>Real-time order queue, 5-stage lifecycle transitions, and dining token management</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="filters-row">
            {statusFilters.map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-btn ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search Order #, Token #, Officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '260px', padding: '6px 12px', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {filteredOrders.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No orders found matching the filter "{filterStatus}".
          </div>
        ) : (
          filteredOrders.map((order) => {
            const orderId = order.id || order._id || order.orderNumber;
            const status = (order.status || order.kitchenStatus || 'NEW').toUpperCase();
            const pStatus = (order.paymentStatus || 'UNPAID').toUpperCase();
            const isPreOrder = order.orderType === 'PRE_ORDER' || Boolean(order.pickupTime);

            let statusBadgeColor = '#fef3c7';
            let statusTextColor = '#b45309';
            if (status === 'ACCEPTED') { statusBadgeColor = '#e0e7ff'; statusTextColor = '#3730a3'; }
            if (status === 'PREPARING') { statusBadgeColor = '#e0f2fe'; statusTextColor = '#0369a1'; }
            if (status === 'READY') { statusBadgeColor = '#dcfce7'; statusTextColor = '#15803d'; }
            if (status === 'COMPLETED' || status === 'DELIVERED') { statusBadgeColor = '#f1f5f9'; statusTextColor = '#475569'; }
            if (status === 'CANCELLED') { statusBadgeColor = '#fee2e2'; statusTextColor = '#b91c1c'; }

            return (
              <div key={orderId} className="card" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="card-header" style={{ background: '#f8fafc', padding: '12px 16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--primary)' }}>
                        #{order.orderNumber}
                      </span>
                      {order.tokenNumber ? (
                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#0a3d31', color: '#ffffff', padding: '2px 8px', borderRadius: '12px' }}>
                          Token #{order.tokenNumber}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Just now'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: statusBadgeColor, color: statusTextColor }}>
                      {status}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: pStatus === 'PAID' ? '#dcfce7' : '#fef3c7', color: pStatus === 'PAID' ? '#15803d' : '#b45309' }}>
                      {pStatus}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  {/* Officer Info */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a' }}>
                      {order.userName || 'IAS Officer'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      📱 {order.userPhone || 'Registered Officer'}
                    </div>
                  </div>

                  {/* Dining Type & Pickup Time */}
                  <div style={{ marginBottom: '10px', padding: '6px 10px', background: isPreOrder ? '#fef3c7' : '#f0fdf4', borderRadius: '6px', fontSize: '11.5px' }}>
                    <span style={{ fontWeight: '700', color: isPreOrder ? '#92400e' : '#166534' }}>
                      {isPreOrder ? '⏳ Pre-Order Pickup' : '⚡ Instant Dining'}
                    </span>
                    {order.pickupTime ? (
                      <span style={{ marginLeft: '6px', color: '#451a03', fontWeight: '800' }}>
                        • Time: {order.pickupTime}
                      </span>
                    ) : null}
                  </div>

                  {/* Items List */}
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginBottom: '10px' }}>
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                        <span>
                          <strong>{item.quantity}×</strong> {item.name}
                        </span>
                        <span style={{ fontWeight: '600' }}>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Special Note */}
                  {order.orderNote ? (
                    <div style={{ fontSize: '11.5px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', color: '#475569', marginBottom: '10px' }}>
                      📝 <em>"{order.orderNote}"</em>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Grand Total</span>
                    <span style={{ fontSize: '17px', fontWeight: '900', color: 'var(--primary)' }}>₹{order.totalAmount}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(status === 'NEW' || status === 'ACCEPTED') && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', background: '#0284c7' }}
                      onClick={() => onUpdateOrderStatus(orderId, 'PREPARING')}
                    >
                      👨‍🍳 START PREPARING
                    </button>
                  )}

                  {status === 'PREPARING' && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', background: '#16a34a' }}
                      onClick={() => onUpdateOrderStatus(orderId, 'READY')}
                    >
                      🔔 MARK READY
                    </button>
                  )}

                  {status === 'READY' && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', background: '#0a3d31' }}
                      onClick={() => onUpdateOrderStatus(orderId, 'COMPLETED')}
                    >
                      ✓ MARK COMPLETED
                    </button>
                  )}

                  {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => {
                        if (confirm(`Cancel order #${order.orderNumber}?`)) {
                          onUpdateOrderStatus(orderId, 'CANCELLED');
                        }
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
