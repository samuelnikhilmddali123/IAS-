import React from 'react';
import {
  FileText,
  Bell,
  CookingPot,
  ConciergeBell,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react';

export function MetricsRow({ counts }) {
  const { newCount = 3, prepCount = 6, readyCount = 4, completedCount = 32, cancelledCount = 3, totalCount = 48 } = counts;

  return (
    <div className="metrics-grid">
      {/* 1. Total Orders */}
      <div className="metric-card">
        <div className="metric-icon-box total">
          <FileText size={20} />
        </div>
        <div className="metric-info">
          <span className="metric-title">Total Orders</span>
          <div className="metric-value-row">
            <span className="metric-value">{totalCount}</span>
            <span className="metric-trend">
              <TrendingUp size={12} style={{ marginRight: 2 }} /> 12%
            </span>
          </div>
          <span className="metric-subtext">Today</span>
        </div>
      </div>



      {/* 3. Preparing */}
      <div className="metric-card card-prep">
        <div className="metric-icon-box prep">
          <CookingPot size={20} />
        </div>
        <div className="metric-info">
          <span className="metric-title">Preparing</span>
          <div className="metric-value-row">
            <span className="metric-value">{prepCount}</span>
          </div>
          <span className="metric-subtext">In kitchen</span>
        </div>
      </div>

      {/* 4. Ready */}
      <div className="metric-card card-ready">
        <div className="metric-icon-box ready">
          <ConciergeBell size={20} />
        </div>
        <div className="metric-info">
          <span className="metric-title">Ready</span>
          <div className="metric-value-row">
            <span className="metric-value">{readyCount}</span>
          </div>
          <span className="metric-subtext">Ready to serve</span>
        </div>
      </div>

      {/* 5. Completed */}
      <div className="metric-card card-completed">
        <div className="metric-icon-box completed">
          <CheckCircle2 size={20} />
        </div>
        <div className="metric-info">
          <span className="metric-title">Completed</span>
          <div className="metric-value-row">
            <span className="metric-value">{completedCount}</span>
          </div>
          <span className="metric-subtext">Today</span>
        </div>
      </div>

      {/* 6. Cancelled */}
      <div className="metric-card card-cancelled">
        <div className="metric-icon-box cancelled">
          <XCircle size={20} />
        </div>
        <div className="metric-info">
          <span className="metric-title">Cancelled</span>
          <div className="metric-value-row">
            <span className="metric-value">{cancelledCount}</span>
          </div>
          <span className="metric-subtext">Today</span>
        </div>
      </div>
    </div>
  );
}
