import React from 'react';

export const Header = ({ isOnline, onRefresh, refreshing }) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="emblem-badge">GOVERNMENT OF INDIA</span>
        <div className="brand-title">
          <h1>Canteen Services • Admin & Kitchen Desk</h1>
          <p>Cabinet Secretariat • Operations & Menu Portal</p>
        </div>
      </div>
      <div className="topbar-right">
        <div className={`status-pill ${isOnline ? '' : 'offline'}`}>
          <span className={`pulse-dot ${isOnline ? '' : 'offline'}`}></span>
          <span>{isOnline ? 'Backend Online' : 'Connecting...'}</span>
        </div>
        <button className="btn-refresh" onClick={onRefresh} disabled={refreshing} title="Refresh live data">
          <span>{refreshing ? '⏳' : '↻'}</span> {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="btn-refresh"
          style={{ textDecoration: 'none', background: 'rgba(59, 130, 246, 0.4)' }}
          title="Open Interactive Swagger API Documentation"
        >
          📖 Swagger Docs
        </a>
        <a
          href="http://localhost:8081"
          target="_blank"
          rel="noreferrer"
          className="btn-refresh"
          style={{ textDecoration: 'none', background: 'rgba(217, 119, 6, 0.4)' }}
          title="Open Customer Mobile Web App"
        >
          📱 Open App
        </a>
      </div>
    </header>
  );
};
