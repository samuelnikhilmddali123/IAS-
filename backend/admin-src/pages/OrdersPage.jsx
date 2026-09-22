import React, { useState } from 'react';
import '../styles/admin.css';

export const OrdersPage = ({ orders = [], onUpdateOrderStatus }) => {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(orders[0] || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFilter] = useState('Sun, 21 Sep 2026');

  // Compute live counts
  const totalOrdersCount = orders.length;
  const newCount = orders.filter((o) => {
    const s = (o.status || o.kitchenStatus || 'NEW').toUpperCase();
    return s === 'NEW' || s === 'PENDING' || s === 'PRE_ORDERED';
  }).length;
  const acceptedCount = orders.filter((o) => (o.status || o.kitchenStatus || '').toUpperCase() === 'ACCEPTED').length;
  const preparingCount = orders.filter((o) => (o.status || o.kitchenStatus || '').toUpperCase() === 'PREPARING').length;
  const readyCount = orders.filter((o) => (o.status || o.kitchenStatus || '').toUpperCase() === 'READY').length;
  const completedCount = orders.filter((o) => {
    const s = (o.status || o.kitchenStatus || '').toUpperCase();
    return s === 'COMPLETED' || s === 'DELIVERED';
  }).length;

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const s = (order.status || order.kitchenStatus || 'NEW').toUpperCase();

    if (filterStatus === 'NEW' && !(s === 'NEW' || s === 'PENDING' || s === 'PRE_ORDERED')) return false;
    if (filterStatus === 'ACCEPTED' && s !== 'ACCEPTED') return false;
    if (filterStatus === 'PREPARING' && s !== 'PREPARING') return false;
    if (filterStatus === 'READY' && s !== 'READY') return false;
    if (filterStatus === 'COMPLETED' && !(s === 'COMPLETED' || s === 'DELIVERED')) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = (order.orderNumber || '').toLowerCase().includes(q);
      const matchName = (order.userName || '').toLowerCase().includes(q);
      const matchPhone = (order.userPhone || '').toLowerCase().includes(q);
      const matchItems = Array.isArray(order.items)
        ? order.items.map((i) => i.name).join(' ').toLowerCase().includes(q)
        : false;
      if (!matchNum && !matchName && !matchPhone && !matchItems) return false;
    }

    return true;
  });

  // Ensure selectedOrder is set
  const activeSelected = selectedOrder || filteredOrders[0] || orders[0] || null;

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleStatusChange = (orderId, nextStatus) => {
    onUpdateOrderStatus(orderId, nextStatus);
    if (activeSelected && (activeSelected.id === orderId || activeSelected._id === orderId)) {
      setSelectedOrder({ ...activeSelected, status: nextStatus, kitchenStatus: nextStatus });
    }
  };

  const formatOrderTime = (createdAt) => {
    if (!createdAt) return '02:49 PM';
    try {
      const d = new Date(createdAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '02:49 PM';
    }
  };

  return (
    <div className="page-orders-redesign">
      {/* 1. Header with Date Filter */}
      <section className="orders-header-row">
        <div>
          <h1 className="orders-page-title">Live Orders & Kitchen Queue</h1>
          <p className="orders-page-sub">
            Real-time orders with status tracking from order to delivery
          </p>
        </div>

        <button className="date-picker-btn" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{dateFilter}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </section>

      {/* 2. Top Filter Pills Bar with Counts */}
      <section className="orders-filter-pills-bar">
        <div className="status-pills-scroll">
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
          >
            All Orders <span className="pill-cnt">{totalOrdersCount}</span>
          </button>
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'NEW' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('NEW'); setCurrentPage(1); }}
          >
            New <span className="pill-cnt bg-blue">{newCount}</span>
          </button>
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'ACCEPTED' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('ACCEPTED'); setCurrentPage(1); }}
          >
            Accepted <span className="pill-cnt bg-amber">{acceptedCount}</span>
          </button>
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'PREPARING' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('PREPARING'); setCurrentPage(1); }}
          >
            Preparing <span className="pill-cnt bg-purple">{preparingCount}</span>
          </button>
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'READY' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('READY'); setCurrentPage(1); }}
          >
            Ready for Pickup <span className="pill-cnt bg-emerald">{readyCount}</span>
          </button>
          <button
            type="button"
            className={`status-filter-pill ${filterStatus === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('COMPLETED'); setCurrentPage(1); }}
          >
            Completed <span className="pill-cnt bg-gray">{completedCount}</span>
          </button>
        </div>

        <div className="orders-search-filter-wrap">
          <div className="table-search-box" style={{ minWidth: '240px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by order ID or officer..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="table-search-input"
            />
          </div>
          <button type="button" className="btn-filter-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filter</span>
          </button>
        </div>
      </section>

      {/* 3. 4 KPI Metrics Row */}
      <section className="food-kpi-grid">
        {/* KPI 1: Total Orders Today */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-mint">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{totalOrdersCount}</div>
            <div className="kpi-lbl">Total Orders Today</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> 12% from yesterday
            </div>
          </div>
        </div>

        {/* KPI 2: Currently Preparing */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-blue-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 13.8a4.5 4.5 0 0 1 0-7.6 4.5 4.5 0 0 1 6-2.6 4.5 4.5 0 0 1 6 2.6 4.5 4.5 0 0 1 0 7.6H6z"></path>
              <line x1="6" y1="17" x2="18" y2="17"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{preparingCount}</div>
            <div className="kpi-lbl">Currently Preparing</div>
            <div className="kpi-note text-muted">In Kitchen Queue</div>
          </div>
        </div>

        {/* KPI 3: Completed Today */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-mint">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{completedCount}</div>
            <div className="kpi-lbl">Completed Today</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> 100% vs. last hour
            </div>
          </div>
        </div>

        {/* KPI 4: Ready for Pickup */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-amber-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{readyCount}</div>
            <div className="kpi-lbl">Ready for Pickup</div>
            <div className="kpi-note text-muted">Awaiting counter collection</div>
          </div>
        </div>
      </section>

      {/* 4. Main Split View: Left Orders Table + Right Order Details Card */}
      <section className="orders-split-grid">
        {/* Left Side: Orders Table */}
        <div className="orders-table-wrapper orders-table-card card">
          <div className="table-responsive">
            <table className="orders-queue-table orders-table">
              <thead>
                <tr>
                  <th>ORDER / TIME</th>
                  <th>OFFICER DETAILS</th>
                  <th>ITEMS & INSTRUCTIONS</th>
                  <th>SLOT</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-empty-cell" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No orders found in this queue.
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((ord) => {
                    const orderId = ord.id || ord._id;
                    const isSelected = activeSelected && (activeSelected.id === orderId || activeSelected._id === orderId);
                    const statusUpper = (ord.status || ord.kitchenStatus || 'NEW').toUpperCase();
                    const paymentStatus = (ord.paymentStatus || 'UNPAID').toUpperCase();

                    const itemsList = Array.isArray(ord.items) && ord.items.length > 0
                      ? ord.items.map((i) => `${i.quantity || 1}× ${i.name || 'Dish'}`).join(', ')
                      : '1× Canteen Meal';

                    let statusClass = 'pill-status-new';
                    if (statusUpper === 'ACCEPTED') statusClass = 'pill-status-accepted';
                    if (statusUpper === 'PREPARING') statusClass = 'pill-status-preparing';
                    if (statusUpper === 'READY' || statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED') {
                      statusClass = 'pill-status-completed';
                    }

                    return (
                      <tr
                        key={orderId}
                        className={`order-row ${isSelected ? 'row-active-selected' : ''}`}
                        onClick={() => setSelectedOrder(ord)}
                      >
                        {/* Order No & Time */}
                        <td className="cell-order-time">
                          <div className="order-num-tag">
                            #{ord.orderNumber}
                          </div>
                          <div className="order-timestamp">{formatOrderTime(ord.createdAt)}</div>
                          <div className="order-pickup-badge">
                            <span className="dot-mini bg-emerald"></span>
                            <span>Pickup {ord.pickupTime || 'ASAP'}</span>
                          </div>
                        </td>

                        {/* Officer Details */}
                        <td className="cell-officer-info">
                          <div className="officer-profile-row">
                            <img
                              src={ord.userPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                              alt={ord.userName || 'Officer'}
                              className="officer-mini-thumb"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';
                              }}
                            />
                            <div>
                              <div className="officer-name-bold">{ord.userName || 'IAS Officer'}</div>
                              <div className="officer-phone-sub">{ord.userPhone || '—'}</div>
                              <div className="officer-dept-sub">{ord.department || 'Cabinet Secretariat'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Items & Instructions */}
                        <td className="cell-items-instructions">
                          <div className="items-text-primary">{itemsList}</div>
                          {ord.orderNote && (
                            <div className="note-text-highlight">
                              Note: {ord.orderNote}
                            </div>
                          )}
                        </td>

                        {/* Slot */}
                        <td className="cell-slot">
                          <span className="pill-slot pill-slot-lunch">
                            {ord.mealSlot || 'Lunch'}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="cell-payment-box">
                          <div className="amount-bold">₹{ord.totalAmount || 0}</div>
                          <span className={`pill-payment ${paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>
                            {paymentStatus}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="cell-status">
                          <span className={`pill-status ${statusClass}`}>
                            {statusUpper}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="cell-actions-progression">
                          <div className="actions-progression-col">
                            {statusUpper === 'NEW' && (
                              <button
                                type="button"
                                className="btn-act-accept"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(orderId, 'ACCEPTED'); }}
                              >
                                Accept
                              </button>
                            )}
                            {statusUpper === 'ACCEPTED' && (
                              <button
                                type="button"
                                className="btn-act-preparing"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(orderId, 'PREPARING'); }}
                              >
                                Start Preparing
                              </button>
                            )}
                            {statusUpper === 'PREPARING' && (
                              <button
                                type="button"
                                className="btn-act-ready"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(orderId, 'READY'); }}
                              >
                                Mark Ready
                              </button>
                            )}
                            {statusUpper === 'READY' && (
                              <button
                                type="button"
                                className="btn-act-complete"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(orderId, 'COMPLETED'); }}
                              >
                                Complete
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-act-view-outline"
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(ord); }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing {filteredOrders.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>

              <div className="per-page-select-wrap">
                <select
                  className="per-page-select"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Order Details Card */}
        {activeSelected && (
          <div className="order-details-drawer card">
            <div className="drawer-header">
              <h3>Order Details</h3>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {/* Order Status Banner */}
              <div className="drawer-order-banner">
                <span className="banner-status-badge">
                  {(activeSelected.status || activeSelected.kitchenStatus || 'NEW').toUpperCase()} ORDER
                </span>
                <span className="banner-time-text">
                  {formatOrderTime(activeSelected.createdAt)}
                </span>
              </div>

              <div className="drawer-order-id-row">
                <h2>#{activeSelected.orderNumber}</h2>
                <span className="pickup-chip">
                  Pickup: {activeSelected.pickupTime || 'ASAP'}
                </span>
              </div>

              {/* Officer Information */}
              <div className="drawer-section-card">
                <div className="section-title-sm">Officer Information</div>
                <div className="officer-detail-block">
                  <img
                    src={activeSelected.userPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                    alt={activeSelected.userName}
                    className="officer-detail-thumb"
                  />
                  <div>
                    <h4 className="officer-detail-name">{activeSelected.userName || 'Officer (IAS)'}</h4>
                    <div className="officer-contact-row">
                      <span>📞 {activeSelected.userPhone || '—'}</span>
                    </div>
                    <div className="officer-contact-row">
                      <span>✉️ {activeSelected.userEmail || `${(activeSelected.userName || 'officer').toLowerCase().replace(/\s+/g, '.')}@ias.gov.in`}</span>
                    </div>
                    <div className="officer-contact-row text-muted">
                      <span>🏛️ {activeSelected.department || 'Cabinet Secretariat'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="drawer-section-card">
                <div className="section-header-flex">
                  <div className="section-title-sm">Order Items</div>
                  <span className="count-pill">
                    {Array.isArray(activeSelected.items) ? activeSelected.items.length : 1} items
                  </span>
                </div>

                <div className="drawer-items-list">
                  {Array.isArray(activeSelected.items) && activeSelected.items.length > 0 ? (
                    activeSelected.items.map((it, idx) => (
                      <div key={idx} className="drawer-item-row">
                        <img
                          src={it.image || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&h=100&fit=crop&q=80'}
                          alt={it.name}
                          className="item-square-thumb"
                        />
                        <div className="item-text-col">
                          <div className="item-title">{it.name}</div>
                          <div className="item-calc">{it.quantity || 1} × ₹{it.price || 60}</div>
                        </div>
                        <div className="item-total-col">
                          ₹{(it.quantity || 1) * (it.price || 60)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="drawer-item-row">
                      <div className="item-title">Standard Canteen Meal</div>
                      <div className="item-total-col">₹{activeSelected.totalAmount || 60}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              {activeSelected.orderNote && (
                <div className="drawer-section-card">
                  <div className="section-title-sm">Special Instructions</div>
                  <div className="special-note-box">
                    <span className="note-pin-icon">📌</span>
                    <span>{activeSelected.orderNote}</span>
                  </div>
                </div>
              )}

              {/* Payment Status */}
              <div className="drawer-section-card">
                <div className="section-title-sm">Payment Status</div>
                <div className="drawer-payment-row">
                  <span className={`pill-payment ${(activeSelected.paymentStatus || '').toUpperCase() === 'PAID' ? 'paid' : 'unpaid'}`}>
                    {(activeSelected.paymentStatus || 'UNPAID').toUpperCase()}
                  </span>
                  <div className="total-amount-large">₹{activeSelected.totalAmount || 0}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="drawer-action-buttons">
                <button
                  type="button"
                  className="btn-drawer-accept"
                  onClick={() => handleStatusChange(activeSelected.id || activeSelected._id, 'ACCEPTED')}
                >
                  ✓ Accept Order
                </button>
                <button
                  type="button"
                  className="btn-drawer-reject"
                  onClick={() => handleStatusChange(activeSelected.id || activeSelected._id, 'CANCELLED')}
                >
                  ✕ Reject Order
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
