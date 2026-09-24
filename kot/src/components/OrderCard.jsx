import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Clock,
  MessageSquare,
  Building2,
  User
} from 'lucide-react';

export function OrderCard({ order, onAccept, onReject, onMarkReady, onMarkCompleted }) {
  // Timer formatting for prep orders
  const [seconds, setSeconds] = useState(order.timerSeconds || 0);

  useEffect(() => {
    if (order.status === 'prep') {
      const interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order.status]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '');

  return (
    <div className="order-card">
      {/* Top Bar: Token / Order ID & Time */}
      <div className="card-top" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {order.tokenNumber && (
              <span style={{
                backgroundColor: '#16201c',
                color: '#cca43b',
                fontWeight: 800,
                fontSize: '0.78rem',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}>
                TOKEN #{order.tokenNumber}
              </span>
            )}
            <span className="order-id" style={{ fontSize: order.tokenNumber ? '0.78rem' : '0.9rem', color: '#6b7280' }}>
              {displayId}
            </span>
          </div>

          {order.userName && (
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <User size={12} color="#4b5563" />
              {order.userName}
            </span>
          )}
        </div>

        <span className={`order-time-ago time-${order.status}`}>
          {order.status === 'new' && (order.timeAgo || 'Just now')}
          {order.status === 'prep' && (order.startedTimeAgo || 'Started just now')}
          {order.status === 'ready' && (order.readyTimeAgo || 'Ready just now')}
        </span>
      </div>

      {/* Subheader: Table & Type Tags */}
      <div className="card-subheader" style={{ marginTop: '0.5rem' }}>
        {order.table && (
          <span className="tag-pill">
            <Building2 size={12} />
            {order.table}
          </span>
        )}
        <span className="tag-pill">
          <Utensils size={12} />
          {order.type || 'Dine In'}
        </span>
        {order.totalAmount > 0 && (
          <span className="tag-pill" style={{ marginLeft: 'auto', fontWeight: 700, color: '#16201c', backgroundColor: '#f3f4f6' }}>
            ₹{order.totalAmount}
          </span>
        )}
      </div>

      {/* Items List */}
      <div className="card-items-list">
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="item-row">
            <span className="item-qty">{item.qty || item.quantity} ×</span>
            <span className="item-name">{item.name}</span>
            {item.spicy && <span className="item-tag-spicy">(Spicy)</span>}
          </div>
        ))}
      </div>

      {/* Custom Kitchen Note / Status message */}
      {order.note && (
        <div className={`note-box note-${order.status === 'new' ? 'red' : order.status === 'prep' ? 'orange' : 'green'}`}>
          <MessageSquare size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{order.note}</span>
        </div>
      )}

      {order.statusNote && (
        <div className="note-box note-green">
          <MessageSquare size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{order.statusNote}</span>
        </div>
      )}

      {/* Progress Bar & Timer for Preparing Orders */}
      {order.status === 'prep' && (
        <div className="prep-progress-container">
          <div className="prep-progress-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
              <Clock size={13} />
              {formatTimer(seconds)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 600 }}>Cooking in Progress</span>
          </div>
          <div className="prep-progress-bar-bg">
            <div
              className="prep-progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(30, (seconds / 600) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card-actions">


        {order.status === 'prep' && (
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button className="btn-reject" style={{ flex: 1 }} onClick={() => onReject && onReject(order.id)}>
              Reject
            </button>
            <button className="btn-mark-ready" style={{ flex: 2 }} onClick={() => onMarkReady && onMarkReady(order.id)}>
              Mark as Ready
            </button>
          </div>
        )}

        {order.status === 'ready' && (
          <button className="btn-mark-completed" onClick={() => onMarkCompleted && onMarkCompleted(order.id)}>
            Handover / Complete
          </button>
        )}
      </div>
    </div>
  );
}
