import React from 'react';
import { CheckCircle2, Bell, UtensilsCrossed, ArrowRight } from 'lucide-react';

export function RightPanel({ completedOrders = [], alerts = [] }) {
  return (
    <aside className="right-panel">
      {/* 1. Recent Completed */}
      <div className="panel-widget">
        <div className="widget-header">
          <div className="widget-title-group">
            <CheckCircle2 size={16} color="#111827" />
            <span>Recent Completed</span>
          </div>
          <button className="widget-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            View All <ArrowRight size={12} />
          </button>
        </div>

        <div className="completed-list">
          {completedOrders.map((item, idx) => (
            <div key={idx} className="completed-item">
              <span className="completed-id">{item.id}</span>
              <span className="completed-table">{item.location}</span>
              <span className="completed-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Alerts & Notifications */}
      <div className="panel-widget">
        <div className="widget-header">
          <div className="widget-title-group">
            <Bell size={16} color="#ef4444" />
            <span>Alerts & Notifications</span>
          </div>
          <button className="widget-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            View All <ArrowRight size={12} />
          </button>
        </div>

        <div className="alerts-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <span className={`alert-dot ${alert.dot}`} />
              <div className="alert-text">
                {alert.title}{' '}
                {alert.target && <span className="alert-order-id">{alert.target}</span>}
              </div>
              <span className="alert-time">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quote / Motto Box */}
      <div className="motto-card">
        <div className="motto-content">
          <p className="motto-text">
            “Good Food<br />Supports a Stronger Tomorrow”
          </p>
          <span className="motto-author">MILITARY CANTEEN</span>
        </div>
        <UtensilsCrossed className="motto-bg-icon" />
      </div>
    </aside>
  );
}
