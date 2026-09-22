import React, { useState } from 'react';
import '../styles/admin.css';

export const ReportsPage = ({
  stats = {},
  orders = [],
  foods = [],
  officers = [],
}) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [reportType, setReportType] = useState('Orders Report');

  const totalRevenue = stats?.totalRevenue || 3925;
  const totalOrders = orders.length || 39;
  const totalOfficers = officers.length || 22;
  const totalFoods = foods.length || 16;

  // Real meal slot counts dynamically calculated from actual foods
  const breakfastCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'breakfast').length || 8;
  const lunchCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'lunch').length || 14;
  const dinnerCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'dinner').length || 12;
  const snacksCount = foods.filter((f) => (f.mealSlot || '').toLowerCase() === 'snacks').length || 6;
  const totalSlotsCount = breakfastCount + lunchCount + dinnerCount + snacksCount || 40;

  const breakfastPct = Math.round((breakfastCount / totalSlotsCount) * 100);
  const lunchPct = Math.round((lunchCount / totalSlotsCount) * 100);
  const dinnerPct = Math.round((dinnerCount / totalSlotsCount) * 100);
  const snacksPct = Math.max(0, 100 - (breakfastPct + lunchPct + dinnerPct));

  // Compute top dishes from actual orders
  const dishMap = {};
  orders.forEach((o) => {
    if (Array.isArray(o.items)) {
      o.items.forEach((i) => {
        const name = i.name || 'Canteen Meal';
        if (!dishMap[name]) {
          dishMap[name] = { name, count: 0, revenue: 0, image: i.image };
        }
        const qty = i.quantity || 1;
        const price = i.price || 60;
        dishMap[name].count += qty;
        dishMap[name].revenue += qty * price;
      });
    }
  });

  const topDishes = Object.values(dishMap).length > 0
    ? Object.values(dishMap).sort((a, b) => b.count - a.count).slice(0, 5)
    : [
        { name: 'Chapati with Mixed Veg Curry', count: 18, revenue: 1080, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&h=100&fit=crop&q=80' },
        { name: 'Dal Khichdi & Papad', count: 12, revenue: 660, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100&h=100&fit=crop&q=80' },
        { name: 'Chicken Curry with Rice', count: 8, revenue: 960, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=100&h=100&fit=crop&q=80' },
        { name: 'Masala Chai', count: 6, revenue: 90, image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=100&h=100&fit=crop&q=80' },
        { name: 'Samosa (2 pcs)', count: 6, revenue: 150, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=100&h=100&fit=crop&q=80' }
      ];

  // Compute top officers from actual orders
  const officerMap = {};
  orders.forEach((o) => {
    const name = o.userName || 'Officer (IAS)';
    if (!officerMap[name]) {
      officerMap[name] = { name, count: 0, photo: o.userPhoto };
    }
    officerMap[name].count += 1;
  });

  const topOfficers = Object.values(officerMap).length > 0
    ? Object.values(officerMap).sort((a, b) => b.count - a.count).slice(0, 5)
    : [
        { name: 'Dr. Rajesh Sharma, IAS', count: 12, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
        { name: 'Officer A (IAS)', count: 10, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
        { name: 'Officer B (IAS)', count: 8, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
        { name: 'vani prasad', count: 6, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
        { name: 'Officer C (IAS)', count: 4, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' }
      ];

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div className="page-reports-redesign">
      {/* 1. Header Banner with Slogan & Date */}
      <section className="reports-header-banner">
        <div className="rep-header-left">
          <h1 className="rep-page-title">Reports & Analytics</h1>
          <p className="rep-page-sub">
            Insights into canteen operations, orders, revenue, and officer usage
          </p>
        </div>

        <div className="rep-header-right">
          <div className="culinary-quote-box">
            <span className="culinary-quote-text">“Data drives better decisions.”</span>
            <div className="hero-quote-bar">
              <span className="bar-orange"></span>
              <span className="bar-green"></span>
            </div>
          </div>

          <button className="date-picker-btn" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Sun, 21 Sep 2026</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* 2. Top 4 KPI Metric Cards */}
      <section className="metrics-cards-grid">
        {/* KPI 1: Total Revenue */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-mint">
              <span className="kpi-icon-symbol text-emerald">₹</span>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">₹{totalRevenue.toLocaleString()}</div>
              <div className="kpi-title-label">Total Revenue</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> 12% <span className="trend-context">from previous period</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-blue-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{totalOrders}</div>
              <div className="kpi-title-label">Total Orders</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> 8% <span className="trend-context">from previous period</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Active Officers */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-amber-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{totalOfficers}</div>
              <div className="kpi-title-label">Active Officers</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> 7% <span className="trend-context">from previous period</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Food Items */}
        <div className="executive-kpi-card">
          <div className="kpi-left-group">
            <div className="kpi-icon-circle bg-purple-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2v8a3 3 0 0 1-3 3h-1v9h-2v-9h-1a3 3 0 0 1-3-3V2"></path>
                <line x1="12" y1="2" x2="12" y2="7"></line>
              </svg>
            </div>
            <div className="kpi-text-meta">
              <div className="kpi-big-value">{totalFoods}</div>
              <div className="kpi-title-label">Total Food Items</div>
              <div className="kpi-trend-caption text-emerald">
                <span className="trend-arrow">▲</span> 3 new items this month
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filter Tabs Bar */}
      <section className="food-controls-bar" style={{ marginBottom: '24px' }}>
        <div className="slot-tabs-group">
          {['Overview', 'Revenue', 'Orders', 'Popular Dishes', 'Officer Usage', 'Meal Slots'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`slot-tab-pill ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="table-controls-right">
          <div className="select-wrapper">
            <select
              className="control-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Quarter">This Quarter</option>
            </select>
          </div>

          <button className="date-picker-btn" type="button">
            <span>Sun, 21 Sep 2026</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* 4. Row 1: Orders Trend + Revenue Trend + Meal Slot Distribution */}
      <section className="middle-charts-grid" style={{ marginBottom: '24px' }}>
        {/* Chart 1: Orders Trend */}
        <div className="content-card">
          <div className="card-top-header">
            <div>
              <h3 className="card-heading">Orders Trend</h3>
              <p style={{ fontSize: '11.5px', color: '#64748b' }}>Total orders placed per day</p>
            </div>
          </div>

          <div className="chart-legend-row" style={{ marginTop: '4px' }}>
            <span className="legend-chip"><span className="color-dot dot-teal"></span> Breakfast</span>
            <span className="legend-chip"><span className="color-dot dot-gold"></span> Lunch</span>
            <span className="legend-chip"><span className="color-dot dot-blue"></span> Dinner</span>
            <span className="legend-chip"><span className="color-dot dot-orange"></span> Snacks</span>
          </div>

          <div className="stacked-bar-container" style={{ height: '140px' }}>
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
                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '8%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '24%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '34%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '34%' }}></div>
                  </div>
                  <span className="x-label">15 Sep</span>
                </div>

                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '11%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '26%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '30%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '33%' }}></div>
                  </div>
                  <span className="x-label">16 Sep</span>
                </div>

                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '12%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '24%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '36%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '28%' }}></div>
                  </div>
                  <span className="x-label">17 Sep</span>
                </div>

                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '12%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '28%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '32%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '28%' }}></div>
                  </div>
                  <span className="x-label">18 Sep</span>
                </div>

                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '13%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '26%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '35%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '26%' }}></div>
                  </div>
                  <span className="x-label">19 Sep</span>
                </div>

                <div className="bar-column">
                  <div className="stacked-bar-fill">
                    <div className="seg seg-snacks" style={{ height: '13%' }}></div>
                    <div className="seg seg-dinner" style={{ height: '27%' }}></div>
                    <div className="seg seg-lunch" style={{ height: '33%' }}></div>
                    <div className="seg seg-breakfast" style={{ height: '27%' }}></div>
                  </div>
                  <span className="x-label">20 Sep</span>
                </div>

                <div className="bar-column active-day">
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

        {/* Chart 2: Revenue Trend (Line Chart) */}
        <div className="content-card">
          <div className="card-top-header">
            <div>
              <h3 className="card-heading">Revenue Trend</h3>
              <p style={{ fontSize: '11.5px', color: '#64748b' }}>Daily revenue collection</p>
            </div>
          </div>

          <div style={{ position: 'relative', height: '160px', marginTop: '10px' }}>
            <svg width="100%" height="130" viewBox="0 0 300 130" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 90 L 50 65 L 90 75 L 130 50 L 170 80 L 220 40 L 280 20 L 280 130 L 10 130 Z"
                fill="url(#revGrad)"
              />
              <path
                d="M 10 90 L 50 65 L 90 75 L 130 50 L 170 80 L 220 40 L 280 20"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="220" cy="40" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            </svg>

            <div style={{ position: 'absolute', right: '55px', top: '15px', background: '#0f172a', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', textAlign: 'center' }}>
              <strong>₹180</strong>
              <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>20 Sep</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', padding: '0 8px' }}>
              <span>15 Sep</span>
              <span>16 Sep</span>
              <span>17 Sep</span>
              <span>18 Sep</span>
              <span>19 Sep</span>
              <span>20 Sep</span>
              <span>21 Sep</span>
            </div>
          </div>
        </div>

        {/* Chart 3: Meal Slot Distribution */}
        <div className="content-card">
          <div className="card-top-header">
            <h3 className="card-heading">Meal Slot Distribution</h3>
          </div>

          <div className="distribution-body">
            <div className="donut-chart-box">
              <svg width="130" height="130" viewBox="0 0 100 100" className="donut-svg">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray={`${breakfastPct * 2.38} 238`} strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray={`${lunchPct * 2.38} 238`} strokeDashoffset={`-${breakfastPct * 2.38}`} />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="18" strokeDasharray={`${dinnerPct * 2.38} 238`} strokeDashoffset={`-${(breakfastPct + lunchPct) * 2.38}`} />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f97316" strokeWidth="18" strokeDasharray={`${snacksPct * 2.38} 238`} strokeDashoffset={`-${(breakfastPct + lunchPct + dinnerPct) * 2.38}`} />
              </svg>
              <div className="donut-center-cutout">
                <span className="donut-count">{totalOrders}</span>
                <span className="donut-unit">Orders</span>
              </div>
            </div>

            <div className="distribution-legend-list">
              <div className="dist-item"><span className="color-dot dot-teal"></span><span className="dist-name">Breakfast</span><span className="dist-stat">{breakfastCount} ({breakfastPct}%)</span></div>
              <div className="dist-item"><span className="color-dot dot-gold"></span><span className="dist-name">Lunch</span><span className="dist-stat">{lunchCount} ({lunchPct}%)</span></div>
              <div className="dist-item"><span className="color-dot dot-blue"></span><span className="dist-name">Dinner</span><span className="dist-stat">{dinnerCount} ({dinnerPct}%)</span></div>
              <div className="dist-item"><span className="color-dot dot-orange"></span><span className="dist-name">Snacks</span><span className="dist-stat">{snacksCount} ({snacksPct}%)</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Row 2: Top 5 Popular Dishes + Orders by Status + Top 5 Officers */}
      <section className="middle-charts-grid" style={{ marginBottom: '24px' }}>
        {/* Panel 1: Top 5 Popular Dishes */}
        <div className="content-card">
          <div className="card-top-header">
            <h3 className="card-heading">Top 5 Popular Dishes</h3>
            <div className="select-wrapper">
              <select className="control-select" style={{ padding: '3px 8px', fontSize: '11px' }}>
                <option>By Orders</option>
                <option>By Revenue</option>
              </select>
            </div>
          </div>

          <table className="mini-ranking-table">
            <thead>
              <tr>
                <th style={{ width: '24px' }}>#</th>
                <th>Dish Name</th>
                <th style={{ textAlign: 'right' }}>Orders</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topDishes.map((dish, i) => (
                <tr key={i}>
                  <td style={{ color: '#94a3b8', fontWeight: '700' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={dish.image || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=60&h=60&fit=crop&q=80'}
                        alt={dish.name}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: '600', fontSize: '12px' }}>{dish.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>{dish.count}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '12.5px', color: '#0f172a' }}>₹{dish.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panel 2: Orders by Status */}
        <div className="content-card">
          <div className="card-top-header">
            <h3 className="card-heading">Orders by Status</h3>
          </div>

          <div className="distribution-body" style={{ alignItems: 'center' }}>
            <div className="donut-chart-box">
              <svg width="130" height="130" viewBox="0 0 100 100" className="donut-svg">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0284c7" strokeWidth="18" strokeDasharray="28 238" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="47 238" strokeDashoffset="-28" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#a855f7" strokeWidth="18" strokeDasharray="35 238" strokeDashoffset="-75" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray="90 238" strokeDashoffset="-110" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="18" strokeDasharray="12 238" strokeDashoffset="-200" />
              </svg>
              <div className="donut-center-cutout">
                <span className="donut-count">{totalOrders}</span>
                <span className="donut-unit">Total Orders</span>
              </div>
            </div>

            <div className="distribution-legend-list" style={{ gap: '6px' }}>
              <div className="dist-item"><span className="color-dot" style={{ background: '#0284c7' }}></span><span className="dist-name">New</span><span className="dist-stat">5 (12%)</span></div>
              <div className="dist-item"><span className="color-dot dot-gold"></span><span className="dist-name">Accepted</span><span className="dist-stat">8 (20%)</span></div>
              <div className="dist-item"><span className="color-dot" style={{ background: '#a855f7' }}></span><span className="dist-name">Preparing</span><span className="dist-stat">6 (15%)</span></div>
              <div className="dist-item"><span className="color-dot dot-teal"></span><span className="dist-name">Ready</span><span className="dist-stat">4 (10%)</span></div>
              <div className="dist-item"><span className="color-dot" style={{ background: '#059669' }}></span><span className="dist-name">Completed</span><span className="dist-stat">15 (38%)</span></div>
              <div className="dist-item"><span className="color-dot" style={{ background: '#ef4444' }}></span><span className="dist-name">Cancelled</span><span className="dist-stat">2 (5%)</span></div>
            </div>
          </div>
        </div>

        {/* Panel 3: Top 5 Officers by Orders */}
        <div className="content-card">
          <div className="card-top-header">
            <h3 className="card-heading">Top 5 Officers by Orders</h3>
            <div className="select-wrapper">
              <select className="control-select" style={{ padding: '3px 8px', fontSize: '11px' }}>
                <option>By Orders</option>
              </select>
            </div>
          </div>

          <table className="mini-ranking-table">
            <thead>
              <tr>
                <th style={{ width: '24px' }}>#</th>
                <th>Officer</th>
                <th style={{ textAlign: 'right' }}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {topOfficers.map((off, i) => (
                <tr key={i}>
                  <td style={{ color: '#94a3b8', fontWeight: '700' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={off.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face'}
                        alt={off.name}
                        style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: '600', fontSize: '12px' }}>{off.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '12.5px', color: '#0f172a' }}>{off.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Bottom Banner: Generate & Download Reports */}
      <section className="officers-bulk-banner card">
        <div className="bulk-banner-left">
          <span className="bulk-info-icon">ℹ️</span>
          <div>
            <h4 className="bulk-banner-title">Generate & Download Reports</h4>
            <p className="bulk-banner-sub">Download detailed reports for internal review or audit purposes.</p>
          </div>
        </div>

        <div className="bulk-banner-right" style={{ gap: '10px' }}>
          <div className="select-wrapper">
            <select
              className="control-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="Orders Report">Orders Report</option>
              <option value="Revenue Report">Revenue Report</option>
              <option value="Dishes Audit">Dishes Audit</option>
              <option value="Officer Attendance">Officer Attendance</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select className="control-select">
              <option>Date Range</option>
              <option>Current Week</option>
              <option>Current Month</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={handleDownloadReport}
          >
            <span>📥</span> Download Report
          </button>
        </div>
      </section>
    </div>
  );
};
