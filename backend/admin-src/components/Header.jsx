import React, { useState } from 'react';

export const Header = ({
  isOnline = true,
  onRefresh,
  refreshing = false,
  searchQuery = '',
  onSearchChange,
  notificationCount = 3,
  notifications = [],
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="topbar">
      {/* Search Bar on Left */}
      <div className="search-bar-container">
        <span className="search-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="text"
          className="search-input"
          placeholder="Search orders, officers, dishes..."
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          aria-label="Search orders, officers, dishes"
        />
        <span className="search-kbd-shortcut">Ctrl K</span>
      </div>

      {/* Action Controls on Right */}
      <div className="topbar-right">
        {/* Backend Online Status Pill */}
        <div className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
          <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`}></span>
          <span>{isOnline ? 'Backend Online' : 'Connecting...'}</span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          className="btn-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh live system data"
        >
          <svg
            className={`refresh-icon ${refreshing ? 'spinning' : ''}`}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>

        {/* Notification Bell */}
        <div className="relative-wrapper">
          <button
            type="button"
            className="btn-icon-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            title="System notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notificationCount > 0 && (
              <span className="notification-badge-count">{notificationCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown-panel notifications-dropdown">
              <div className="dropdown-header">
                <h4>System Notifications</h4>
                <span className="badge badge-success">{notificationCount} Active</span>
              </div>
              <div className="dropdown-body">
                {(notifications && notifications.length > 0) ? (
                  notifications.map((n, idx) => (
                    <div key={idx} className="notification-item">
                      <div className="notification-dot"></div>
                      <div className="notification-content">
                        <div className="notification-title">{n.title || n}</div>
                        <div className="notification-time">{n.time || 'Just now'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="notification-item">
                      <div className="notification-dot dot-green"></div>
                      <div className="notification-content">
                        <div className="notification-title">Order #81496 placed by Dr. Rajesh Sharma, IAS</div>
                        <div className="notification-time">2 mins ago • Lunch Slot</div>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-dot dot-blue"></div>
                      <div className="notification-content">
                        <div className="notification-title">KOT generated for Kitchen Station #1</div>
                        <div className="notification-time">5 mins ago • Chapati + Veg Curry</div>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-dot dot-orange"></div>
                      <div className="notification-content">
                        <div className="notification-title">WhatsApp QR gateway synced successfully</div>
                        <div className="notification-time">14 mins ago • 38 deliveries today</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="dropdown-footer">
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => setShowNotifications(false)}
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Pill */}
        <div className="relative-wrapper">
          <div
            className="admin-profile-pill"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            role="button"
            tabIndex={0}
          >
            <div className="admin-avatar">A</div>
            <div className="admin-info-text">
              <span className="admin-name">Admin</span>
              <span className="admin-role">Kitchen Desk</span>
            </div>
            <svg className="admin-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          {showProfileMenu && (
            <div className="dropdown-panel profile-dropdown">
              <div className="profile-dropdown-header">
                <strong>Cabinet Secretariat Desk</strong>
                <span className="profile-sub">admin@canteen.gov.in</span>
              </div>
              <div className="profile-dropdown-items">
                <a href="/api/docs" target="_blank" rel="noreferrer" className="profile-item">
                  <span>📖</span> Swagger API Docs
                </a>
                <a href="http://localhost:8081" target="_blank" rel="noreferrer" className="profile-item">
                  <span>📱</span> Customer App Preview
                </a>
                <div className="profile-divider"></div>
                <div className="profile-item text-muted">
                  <span>🏛️</span> Rashtrapati Bhavan Desk
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
