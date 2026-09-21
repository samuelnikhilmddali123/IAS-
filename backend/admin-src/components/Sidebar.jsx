import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar = ({ counts }) => {
  return (
    <nav className="nav-sidebar">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <span className="icon">📊</span>
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/food-menu"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <span className="icon">🍲</span>
        <span>Food Menu</span>
        {counts.foods > 0 && (
          <span className="nav-badge" id="badge-foods-count">
            {counts.foods}
          </span>
        )}
      </NavLink>

      <NavLink
        to="/orders"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <span className="icon">📋</span>
        <span>Live Orders</span>
        {counts.activeOrders > 0 && (
          <span className="nav-badge" style={{ background: '#dc2626' }}>
            {counts.activeOrders}
          </span>
        )}
      </NavLink>

      <NavLink
        to="/whatsapp"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <span className="icon">💬</span>
        <span>WhatsApp & QR</span>
        {counts.whatsapp > 0 && (
          <span className="nav-badge" style={{ background: '#16a34a' }}>
            {counts.whatsapp}
          </span>
        )}
      </NavLink>

      <NavLink
        to="/officers"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <span className="icon">🎖️</span>
        <span>Registered Officers</span>
        {counts.officers > 0 && (
          <span className="nav-badge" style={{ background: '#0a3d31' }}>
            {counts.officers}
          </span>
        )}
      </NavLink>
    </nav>
  );
};
