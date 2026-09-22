import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar = ({ counts = {}, onOpenSettings, onOpenHelp }) => {
  return (
    <aside className="nav-sidebar">
      {/* Top Header Branding */}
      <div className="sidebar-brand">
        <div className="emblem-container">
          <img
            src="/admin/assets/emblem.png"
            alt="Emblem of India"
            className="national-emblem"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div className="brand-text-block">
          <span className="brand-gov-title">GOVERNMENT OF INDIA</span>
          <h1 className="brand-main-title">Canteen Services</h1>
          <span className="brand-sub-title">Admin & Kitchen Desk</span>
          <span className="brand-dept-title">Cabinet Secretariat</span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="nav-menu">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </span>
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/food-menu"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2v8a3 3 0 0 1-3 3h-1v9h-2v-9h-1a3 3 0 0 1-3-3V2"></path>
              <line x1="12" y1="2" x2="12" y2="7"></line>
              <line x1="8" y1="2" x2="8" y2="7"></line>
              <line x1="16" y1="2" x2="16" y2="7"></line>
            </svg>
          </span>
          <span className="nav-label">Food Menu</span>
          {typeof counts.foods === 'number' && (
            <span className="nav-badge badge-orange" id="badge-foods-count">
              {counts.foods}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          <span className="nav-label">Live Orders</span>
          {typeof counts.activeOrders === 'number' && (
            <span className="nav-badge badge-red" id="badge-orders-count">
              {counts.activeOrders}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/whatsapp"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </span>
          <span className="nav-label">WhatsApp & QR</span>
          {typeof counts.whatsapp === 'number' && (
            <span className="nav-badge badge-green" id="badge-whatsapp-count">
              {counts.whatsapp}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/officers"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </span>
          <span className="nav-label">Registered Officers</span>
          {typeof counts.officers === 'number' && (
            <span className="nav-badge badge-orange-light" id="badge-officers-count">
              {counts.officers}
            </span>
          )}
        </NavLink>

        {/* SYSTEM SECTION */}
        <div className="nav-section-title">SYSTEM</div>

        <NavLink
          to="/reports"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item system-nav-item')}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span className="nav-label">Reports & Analytics</span>
        </NavLink>

        <button
          type="button"
          className="nav-item system-nav-item"
          onClick={onOpenSettings}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </span>
          <span className="nav-label">Settings</span>
        </button>

        <button
          type="button"
          className="nav-item system-nav-item"
          onClick={onOpenHelp}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </span>
          <span className="nav-label">Help & Support</span>
        </button>
      </nav>

      {/* Sidebar Footer Artwork & Slogan */}
      <div className="sidebar-footer">
        <div className="dome-silhouette-wrapper">
          <img
            src="/admin/assets/sidebar_dome.jpg"
            alt="Rashtrapati Bhavan Silhouette"
            className="dome-silhouette-img"
          />
        </div>
        <div className="sidebar-motto">
          SERVICE • DISCIPLINE • NATION FIRST
        </div>
        <div className="tricolor-strip">
          <span className="saffron-part"></span>
          <span className="white-part"></span>
          <span className="green-part"></span>
        </div>
      </div>
    </aside>
  );
};
