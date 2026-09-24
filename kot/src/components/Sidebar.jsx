import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CookingPot,
  Clock,
  ConciergeBell,
  CheckCheck,
  XCircle,
  UtensilsCrossed,
  Grid,
  BarChart3,
  Settings,
  ShieldAlert
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'active-kots', label: 'Active KOTs', icon: CookingPot },
  { id: 'preparing', label: 'Preparing', icon: Clock },
  { id: 'ready', label: 'Ready', icon: ConciergeBell },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
  { type: 'divider' },
  { id: 'menu-items', label: 'Menu / Items', icon: UtensilsCrossed },
  { id: 'tables', label: 'Tables', icon: Grid },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function Sidebar({ activeTab, setActiveTab, newOrdersCount = 3 }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="military-emblem">
          <ShieldAlert size={22} />
        </div>
        <div className="sidebar-title-group">
          <span className="sidebar-brand">MILITARY CANTEEN</span>
          <span className="sidebar-tagline">SERVICE NOURISHES STRENGTH</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={`divider-${idx}`} className="nav-divider" />;
          }

          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.id === 'new-orders' && newOrdersCount > 0;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="nav-item-left">
                <IconComponent size={18} />
                <span>{item.label}</span>
              </div>
              {showBadge && (
                <span className="nav-badge">{newOrdersCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="watermark-motto">
          DISCIPLINE<br />IN EVERY MEAL
        </div>
      </div>
    </aside>
  );
}
