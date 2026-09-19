import React from 'react';
import { useAdmin } from '../context/AdminContext';

export const TopBar: React.FC = () => {
  const { refreshAllData } = useAdmin();

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
        <div className="status-pill">
          <span className="pulse-dot"></span>
          <span>Backend Online</span>
        </div>
        <button className="btn-refresh" onClick={refreshAllData}>
          <span>↻</span> Refresh
        </button>
        <a
          href="http://localhost:8081"
          target="_blank"
          rel="noreferrer"
          className="btn-refresh"
          style={{ background: 'rgba(217, 119, 6, 0.4)' }}
        >
          📱 Open App
        </a>
      </div>
    </header>
  );
};
