import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export const Sidebar: React.FC = () => {
  const { allFoods, allOrders, allOfficers, waOutbox } = useAdmin();

  const activeOrdersCount = allOrders.filter(
    (o) => o.status === 'PREPARING' || o.status === 'PENDING'
  ).length;

  return (
    <nav className="nav-sidebar">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="icon">📊</span>
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/foodmenu"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="icon">🍲</span>
        <span>Food Menu</span>
        <span className="nav-badge">{allFoods.length}</span>
      </NavLink>

      <NavLink
        to="/liveorders"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="icon">📋</span>
        <span>Live Orders</span>
        <span className="nav-badge" style={{ background: '#dc2626' }}>
          {activeOrdersCount}
        </span>
      </NavLink>

      <NavLink
        to="/whatsapp-qr"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="icon">💬</span>
        <span>WhatsApp & QR</span>
        <span className="nav-badge" style={{ background: '#16a34a' }}>
          {waOutbox.length}
        </span>
      </NavLink>

      <NavLink
        to="/registered-officers"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="icon">🎖️</span>
        <span>Registered Officers</span>
        <span className="nav-badge">{allOfficers.length}</span>
      </NavLink>
    </nav>
  );
};
