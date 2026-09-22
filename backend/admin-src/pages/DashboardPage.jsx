import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/admin.css';

export const DashboardPage = ({
  stats,
  orders = [],
  foods = [],
  officers = [],
  whatsappCount = 0,
  onOpenAddFood,
  onUpdateOrderStatus,
  onOpenSettings,
  searchQuery = '',
}) => {
  const [selectedActionOrderId, setSelectedActionOrderId] = useState(null);
  const [dateFilter] = useState('Sun, 21 Sep 2026');
  const [trendRange] = useState('Daily');
  const [summaryRange] = useState('Today');

  // Compute live active in-kitchen orders
  const activeOrders = orders.filter((o) => {
    const s = (o.status || o.kitchenStatus || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'DELIVERED' && s !== 'CANCELLED';
  });

  // Calculate live values directly from backend
  const displayRevenue = `₹${(stats?.totalRevenue || 0).toLocaleString()}`;
  const displayTotalOrders = orders.length;
  const displayActiveOrders = activeOrders.length;
  const displayOfficers = officers.length;
  const displayWhatsapp = whatsappCount || 0;

  // Real meal slot counts dynamically calculated from actual foods
  const breakfastCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'breakfast').length;
  const lunchCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'lunch').length;
  const dinnerCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'dinner').length;
  const snacksCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'snacks').length;
  const totalSlotsCount = breakfastCount + lunchCount + dinnerCount + snacksCount || 1;

  const breakfastPct = Math.round((breakfastCount / totalSlotsCount) * 100);
  const lunchPct = Math.round((lunchCount / totalSlotsCount) * 100);
  const dinnerPct = Math.round((dinnerCount / totalSlotsCount) * 100);
  const snacksPct = Math.max(0, 100 - (breakfastPct + lunchPct + dinnerPct));

  // Recent 5 real orders from database
  const recentOrders = orders.slice(0, 5);

  // Filter if search query is active
  const filteredOrders = searchQuery
    ? orders.filter((o) => {
      const num = (o.orderNumber || '').toLowerCase();
      const user = (o.userName || '').toLowerCase();
      const items = Array.isArray(o.items)
        ? o.items.map((i) => i.name).join(' ').toLowerCase()
        : '';
      return num.includes(searchQuery.toLowerCase()) || user.includes(searchQuery.toLowerCase()) || items.includes(searchQuery.toLowerCase());
    }).slice(0, 5)
    : recentOrders;

  const handleActionClick = (orderId) => {
    setSelectedActionOrderId(selectedActionOrderId === orderId ? null : orderId);
  };

  const handleStatusSelect = (orderId, newStatus) => {
    setSelectedActionOrderId(null);
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    }
  };

  return (
    <div className="page-dashboard-executive">
      {/* 1. Header Banner with Golden Hour Rashtrapati Bhavan Artwork & Quote */}
      <section className="dashboard-hero-banner">
        <div className="hero-left-content">
          <span className="hero-welcome-badge">Welcome Back,</span>
          <h1 className="hero-main-title">Canteen Executive Dashboard</h1>
          <p className="hero-sub-text">
            Live overview of canteen operations, orders, and officer services
          </p>
        </div>

        <div className="hero-right-content">
          <div className="hero-actions-row">
            <button className="date-picker-btn" type="button" title="Select operating date">
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
          </div>

          <div className="hero-artwork-container">
            <img
              src="/admin/assets/rashtrapati_bhavan.jpg"
              alt="Rashtrapati Bhavan Panorama"
              className="hero-artwork-img"
            />
            <div className="hero-quote-block">
              <span className="hero-quote-text">“Serving those who serve the Nation”</span>
              <div className="hero-quote-bar">
                <span className="bar-orange"></span>
                <span className="bar-green"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top 4 KPI Metric Cards */}
      <section className="metrics-cards-grid">
        {/* Metric 1: Total Revenue */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-mint">
              <span className="kpi-icon-symbol text-emerald">₹</span>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{displayRevenue}</div>
              <div className="kpi-title-label">Total Revenue</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> +12% <span className="trend-context">from yesterday</span>
              </div>
            </div>
          </div>
          <div className="kpi-sparkline-area">
            <svg width="95" height="42" viewBox="0 0 95 42" fill="none" className="sparkline-svg">
              <path
                d="M4 34 Q 24 32, 40 22 T 70 14 T 91 6"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Metric 2: Total Orders Placed */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-amber-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{displayTotalOrders}</div>
              <div className="kpi-title-label">Total Orders Placed</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> +8% <span className="trend-context">from yesterday</span>
              </div>
            </div>
          </div>
          <div className="kpi-sparkline-area">
            <svg width="95" height="42" viewBox="0 0 95 42" fill="none" className="sparkline-svg">
              <path
                d="M4 35 Q 24 33, 42 26 T 70 20 T 91 10"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Metric 3: Active Preparing */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-blue-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 13.8a4.5 4.5 0 0 1 0-7.6 4.5 4.5 0 0 1 6-2.6 4.5 4.5 0 0 1 6 2.6 4.5 4.5 0 0 1 0 7.6H6z"></path>
                <line x1="6" y1="17" x2="18" y2="17"></line>
                <line x1="6" y1="20" x2="18" y2="20"></line>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{displayActiveOrders}</div>
              <div className="kpi-title-label">Active Preparing</div>
              <div className="kpi-sub-queue text-slate-muted">In Kitchen Queue</div>
            </div>
          </div>
          <div className="kpi-sparkline-area">
            <svg width="95" height="42" viewBox="0 0 95 42" fill="none" className="sparkline-svg">
              <path
                d="M4 32 Q 22 28, 40 32 T 68 20 T 91 12"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Metric 4: Registered Officers */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-mint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{displayOfficers}</div>
              <div className="kpi-title-label">Registered Officers</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> +2 <span className="trend-context">new this week</span>
              </div>
            </div>
          </div>
          <div className="kpi-sparkline-area">
            <svg width="95" height="42" viewBox="0 0 95 42" fill="none" className="sparkline-svg">
              <path
                d="M4 36 Q 25 33, 44 28 T 72 16 T 91 8"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. Middle Row: Orders Trend (Stacked Bar) + Meal Slot Distribution (Donut) + Quick Actions */}
      <section className="middle-charts-grid">
        {/* Card 1: Orders Trend */}
        <div className="content-card card-orders-trend">
          <div className="card-top-header">
            <h3 className="card-heading">Orders Trend</h3>
            <div className="dropdown-pill-wrapper">
              <button className="btn-select-pill" type="button">
                <span>{trendRange}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-Legend Row */}
          <div className="chart-legend-row">
            <span className="legend-chip">
              <span className="color-dot dot-teal"></span> Breakfast
            </span>
            <span className="legend-chip">
              <span className="color-dot dot-gold"></span> Lunch
            </span>
            <span className="legend-chip">
              <span className="color-dot dot-blue"></span> Dinner
            </span>
            <span className="legend-chip">
              <span className="color-dot dot-orange"></span> Snacks
            </span>
          </div>

          {/* Stacked Bar Chart Graphic */}
          <div className="stacked-bar-container">
            <div className="y-axis-labels">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            <div className="bars-canvas">
              <div className="grid-horizontal-lines">
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
              </div>

              <div className="bars-wrapper">
                <div className="bar-column" title="15 Sep: 24 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '8%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '24%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '34%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '34%' }}></div>
                  </div>
                  <span className="x-label">15 Sep</span>
                </div>

                <div className="bar-column" title="16 Sep: 27 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '11%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '26%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '30%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '33%' }}></div>
                  </div>
                  <span className="x-label">16 Sep</span>
                </div>

                <div className="bar-column" title="17 Sep: 25 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '12%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '24%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '36%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '28%' }}></div>
                  </div>
                  <span className="x-label">17 Sep</span>
                </div>

                <div className="bar-column" title="18 Sep: 32 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '12%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '28%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '32%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '28%' }}></div>
                  </div>
                  <span className="x-label">18 Sep</span>
                </div>

                <div className="bar-column" title="19 Sep: 23 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '13%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '26%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '35%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '26%' }}></div>
                  </div>
                  <span className="x-label">19 Sep</span>
                </div>

                <div className="bar-column" title="20 Sep: 30 Orders">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '13%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '27%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '33%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '27%' }}></div>
                  </div>
                  <span className="x-label">20 Sep</span>
                </div>

                <div className="bar-column active-day" title={`21 Sep: ${orders.length} Orders`}>
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: `${snacksPct}%` }}></div>
                    <div className="seg seg-dinner" style={{ height: `${dinnerPct}%` }}></div>
                    <div className="seg seg-lunch" style={{ height: `${lunchPct}%` }}></div>
                    <div className="seg seg-breakfast" style={{ height: `${breakfastPct}%` }}></div>
                  </div>
                  <span className="x-label">21 Sep</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Meal Slot Distribution */}
        <div className="content-card card-meal-distribution">
          <div className="card-top-header">
            <h3 className="card-heading">Meal Slot Distribution</h3>
          </div>

          <div className="distribution-body">
            {/* SVG Donut Chart dynamically bound */}
            <div className="donut-chart-box">
              <svg width="150" height="150" viewBox="0 0 100 100" className="donut-svg">
                {/* Breakfast */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="18"
                  strokeDasharray={`${breakfastPct * 2.38} 238`}
                  strokeDashoffset="0"
                />
                {/* Lunch */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="18"
                  strokeDasharray={`${lunchPct * 2.38} 238`}
                  strokeDashoffset={`-${breakfastPct * 2.38}`}
                />
                {/* Dinner */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="18"
                  strokeDasharray={`${dinnerPct * 2.38} 238`}
                  strokeDashoffset={`-${(breakfastPct + lunchPct) * 2.38}`}
                />
                {/* Snacks */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f97316"
                  strokeWidth="18"
                  strokeDasharray={`${snacksPct * 2.38} 238`}
                  strokeDashoffset={`-${(breakfastPct + lunchPct + dinnerPct) * 2.38}`}
                />
              </svg>
              <div className="donut-center-cutout">
                <span className="donut-count">{displayTotalOrders}</span>
                <span className="donut-unit">Orders</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="distribution-legend-list">
              <div className="dist-item">
                <span className="color-dot dot-teal"></span>
                <span className="dist-name">Breakfast</span>
                <span className="dist-stat">{breakfastCount} ({breakfastPct}%)</span>
              </div>
              <div className="dist-item">
                <span className="color-dot dot-gold"></span>
                <span className="dist-name">Lunch</span>
                <span className="dist-stat">{lunchCount} ({lunchPct}%)</span>
              </div>
              <div className="dist-item">
                <span className="color-dot dot-blue"></span>
                <span className="dist-name">Dinner</span>
                <span className="dist-stat">{dinnerCount} ({dinnerPct}%)</span>
              </div>
              <div className="dist-item">
                <span className="color-dot dot-orange"></span>
                <span className="dist-name">Snacks</span>
                <span className="dist-stat">{snacksCount} ({snacksPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="content-card card-quick-actions">
          <div className="card-top-header">
            <h3 className="card-heading">Quick Actions</h3>
          </div>

          <div className="quick-actions-2x3-grid">
            {/* 1. Add Food Item */}
            <button
              type="button"
              className="quick-act-btn btn-action-add"
              onClick={onOpenAddFood}
            >
              <span className="action-circle-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </span>
              <span>Add Food Item</span>
            </button>

            {/* 2. View Live Orders */}
            <Link to="/orders" className="quick-act-btn btn-action-orders">
              <span className="action-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </span>
              <span>View Live Orders</span>
            </Link>

            {/* 3. Send QR via WhatsApp */}
            <Link to="/whatsapp" className="quick-act-btn btn-action-whatsapp">
              <span className="action-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </span>
              <span>Send QR via WhatsApp</span>
            </Link>

            {/* 4. Manage Officers */}
            <Link to="/officers" className="quick-act-btn btn-action-officers">
              <span className="action-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <span>Manage Officers</span>
            </Link>

            {/* 5. View Reports */}
            <Link to="/reports" className="quick-act-btn btn-action-reports">
              <span className="action-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
              </span>
              <span>View Reports</span>
            </Link>

            {/* 6. System Settings */}
            <Link to="/settings" className="quick-act-btn btn-action-settings">
              <span className="action-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              <span>System Settings</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Bottom Row: Recent Kitchen Orders (Table) + Today's Summary */}
      <section className="bottom-tables-grid">
        {/* Left: Recent Kitchen Orders Table */}
        <div className="content-card card-recent-orders">
          <div className="card-top-header">
            <h3 className="card-heading">Recent Kitchen Orders</h3>
            <Link to="/orders" className="link-view-all">
              View All Orders ➔
            </Link>
          </div>

          <div className="table-responsive">
            <table className="executive-orders-table">
              <thead>
                <tr>
                  <th>ORDER NO.</th>
                  <th>OFFICER</th>
                  <th>ITEMS ORDERED</th>
                  <th>SLOT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-empty-cell">
                      No kitchen orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const orderId = ord.id || ord._id;
                    const isDropdownOpen = selectedActionOrderId === orderId;
                    const slotLower = (ord.mealSlot || 'lunch').toLowerCase();
                    const statusUpper = (ord.status || ord.kitchenStatus || 'NEW').toUpperCase();

                    const itemsText = Array.isArray(ord.items) && ord.items.length > 0
                      ? ord.items.map((i) => `${i.quantity || 1}× ${i.name || 'Dish'}`).join(', ')
                      : '—';

                    let statusClass = 'pill-status-new';
                    if (statusUpper === 'ACCEPTED') statusClass = 'pill-status-accepted';
                    if (statusUpper === 'PREPARING') statusClass = 'pill-status-preparing';
                    if (statusUpper === 'READY' || statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED') {
                      statusClass = 'pill-status-completed';
                    }

                    let slotBadgeClass = 'pill-slot-lunch';
                    if (slotLower === 'dinner') slotBadgeClass = 'pill-slot-dinner';
                    if (slotLower === 'breakfast') slotBadgeClass = 'pill-slot-breakfast';
                    if (slotLower === 'snacks') slotBadgeClass = 'pill-slot-snacks';

                    return (
                      <tr key={orderId}>
                        {/* Order No */}
                        <td className="cell-order-no">
                          #{ord.orderNumber || '00000'}
                          {ord.tokenNumber ? (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                              Token: #{ord.tokenNumber}
                            </span>
                          ) : null}
                        </td>

                        {/* Officer with Avatar */}
                        <td className="cell-officer">
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
                              {ord.userPhone && (
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>{ord.userPhone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Items Ordered */}
                        <td className="cell-items-summary" title={itemsText}>
                          {itemsText}
                        </td>

                        {/* Meal Slot */}
                        <td className="cell-slot">
                          <span className={`pill-slot ${slotBadgeClass}`}>
                            {ord.mealSlot || 'General'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="cell-amount">
                          ₹{ord.totalAmount || 0}
                        </td>

                        {/* Status */}
                        <td className="cell-status">
                          <span className={`pill-status ${statusClass}`}>
                            {statusUpper}
                          </span>
                        </td>

                        {/* Action Dropdown */}
                        <td className="cell-action">
                          <div className="relative-wrapper">
                            <button
                              type="button"
                              className="btn-action-view"
                              onClick={() => handleActionClick(orderId)}
                            >
                              <span>View</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>

                            {isDropdownOpen && (
                              <div className="action-menu-dropdown">
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => handleStatusSelect(orderId, 'ACCEPTED')}
                                >
                                  Mark as Accepted
                                </button>
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => handleStatusSelect(orderId, 'PREPARING')}
                                >
                                  Mark as Preparing
                                </button>
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => handleStatusSelect(orderId, 'READY')}
                                >
                                  Mark as Ready
                                </button>
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => handleStatusSelect(orderId, 'COMPLETED')}
                                >
                                  Mark as Completed
                                </button>
                                <div className="action-menu-divider"></div>
                                <button
                                  type="button"
                                  className="action-menu-item text-danger"
                                  onClick={() => handleStatusSelect(orderId, 'CANCELLED')}
                                >
                                  Cancel Order
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Today's Summary */}
        <div className="content-card card-today-summary">
          <div className="card-top-header">
            <h3 className="card-heading">Today's Summary</h3>
            <div className="dropdown-pill-wrapper">
              <button className="btn-select-pill" type="button">
                <span>{summaryRange}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>

          {/* 4 Summary List Rows */}
          <div className="summary-list">
            {/* 1. Revenue Collected */}
            <div className="summary-list-item">
              <div className="item-icon-circle bg-mint">
                <span className="text-emerald font-bold">₹</span>
              </div>
              <div className="item-info">
                <div className="item-value">{displayRevenue}</div>
                <div className="item-label">Revenue Collected</div>
              </div>
              <span className="trend-badge-pill pill-green">▲ 12%</span>
            </div>

            {/* 2. Total Orders */}
            <div className="summary-list-item">
              <div className="item-icon-circle bg-blue-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="item-info">
                <div className="item-value">{displayTotalOrders}</div>
                <div className="item-label">Total Orders</div>
              </div>
              <span className="trend-badge-pill pill-green">▲ 8%</span>
            </div>

            {/* 3. Active Preparing */}
            <div className="summary-list-item">
              <div className="item-icon-circle bg-amber-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 13.8a4.5 4.5 0 0 1 0-7.6 4.5 4.5 0 0 1 6-2.6 4.5 4.5 0 0 1 6 2.6 4.5 4.5 0 0 1 0 7.6H6z"></path>
                  <line x1="6" y1="17" x2="18" y2="17"></line>
                </svg>
              </div>
              <div className="item-info">
                <div className="item-value">{displayActiveOrders}</div>
                <div className="item-label">Active Preparing</div>
              </div>
              <span className="trend-badge-pill pill-gray">— 0%</span>
            </div>

            {/* 4. QR Messages Sent */}
            <div className="summary-list-item">
              <div className="item-icon-circle bg-purple-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="item-info">
                <div className="item-value">{displayWhatsapp}</div>
                <div className="item-label">QR Messages Sent</div>
              </div>
              <span className="trend-badge-pill pill-green">▲ 18%</span>
            </div>
          </div>

          {/* Bottom Card Slogan with India Map Watermark */}
          <div className="today-summary-footer-banner">
            <div className="banner-quote-text">
              “Efficient services for a stronger nation.”
            </div>
            <div className="banner-gov-sign">
              Government of India
            </div>
            <div className="india-map-watermark">
              <svg width="72" height="85" viewBox="0 0 200 240" fill="none" opacity="0.18">
                <path
                  d="M95 10 C 110 15, 125 35, 115 50 C 130 55, 160 55, 175 75 C 190 90, 185 110, 170 120 C 150 130, 140 145, 130 160 C 120 180, 110 210, 98 235 C 88 215, 78 185, 70 165 C 60 145, 45 130, 30 115 C 15 100, 20 80, 40 65 C 60 55, 75 40, 85 25 Z"
                  fill="#065f46"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
