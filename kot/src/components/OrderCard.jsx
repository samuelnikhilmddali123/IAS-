import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Clock,
  MessageSquare,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar
} from 'lucide-react';
import { printPaymentBill } from '../utils/printer';

export function OrderCard({ order, onStartPrep, onAccept, onReject, onMarkReady, onMarkCompleted }) {
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
  const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID' || (order.paymentStatus || '').toUpperCase() === 'COMPLETED';
  const paymentMethod = (order.paymentMethod || order.paymentMode || 'UPI').toUpperCase();

  return (
    <div className="order-card" style={{ borderLeft: isPaid ? '4px solid #16a34a' : '4px solid #dc2626' }}>
      {/* Top Bar: Token / Order ID & Time */}
      <div className="card-top" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

            {/* Prominent Payment Status Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
              color: isPaid ? '#15803d' : '#b91c1c',
              border: isPaid ? '1px solid #86efac' : '1px solid #fca5a5',
              letterSpacing: '0.3px'
            }}>
              {isPaid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {isPaid ? `PAID (${paymentMethod})` : 'UNPAID'}
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

      {/* Prominent Pre-Order Scheduled Date & Slot Banner */}
      {order.isPreOrder && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          padding: '4px 8px',
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#92400e'
        }}>
          <Calendar size={13} color="#b45309" />
          <span>
            ⏳ Pre-Order: {order.pickupDateStr ? `${order.pickupDateStr}, ` : ''}{order.pickupTime || order.preOrderSlot || 'Scheduled Slot'}
          </span>
        </div>
      )}

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
          <span className="tag-pill" style={{ marginLeft: 'auto', fontWeight: 800, color: '#16201c', backgroundColor: isPaid ? '#f0fdf4' : '#fff1f2' }}>
            Rs. {order.totalAmount}
          </span>
        )}
      </div>

      {/* Items List */}
      <div className="card-items-list">
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="item-row">
            <span className="item-qty">{item.qty || item.quantity} x</span>
            <span className="item-name">{item.name}</span>
            {item.spicy && <span className="item-tag-spicy">(Spicy)</span>}
          </div>
        ))}
      </div>

      {/* Custom Kitchen Note */}
      {order.note && (
        <div className={`note-box note-${order.status === 'new' ? 'red' : order.status === 'prep' ? 'orange' : 'green'}`}>
          <MessageSquare size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{order.note}</span>
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
      <div className="card-actions" style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        {/* Manual Print Bill Button */}
        <button
          type="button"
          style={{
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            color: '#374151',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={() => printPaymentBill(order._id || order.id || order.orderNumber)}
        >
          <Printer size={13} />
          Print Bill
        </button>

        {/* Status: NEW -> Button: Reject | Preparing Food */}
        {(order.status === 'new' || order.rawKitchenStatus === 'NEW') && (
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <button className="btn-reject" style={{ flex: 1 }} onClick={() => onReject && onReject(order.id || order._id)}>
              Reject
            </button>
            <button
              className="btn-mark-ready"
              style={{ flex: 2, backgroundColor: '#0d3829', color: '#ffffff', border: 'none' }}
              onClick={() => (onStartPrep || onAccept) ? (onStartPrep ? onStartPrep(order.id || order._id) : onAccept(order.id || order._id)) : (onMarkReady && onMarkReady(order.id || order._id))}
            >
              Preparing Food
            </button>
          </div>
        )}

        {/* Status: PREP -> Button: Reject | Ready */}
        {(order.status === 'prep' && order.rawKitchenStatus !== 'NEW') && (
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <button className="btn-reject" style={{ flex: 1 }} onClick={() => onReject && onReject(order.id || order._id)}>
              Reject
            </button>
            <button className="btn-mark-ready" style={{ flex: 2 }} onClick={() => onMarkReady && onMarkReady(order.id || order._id)}>
              Ready
            </button>
          </div>
        )}

        {/* Status: READY -> Button: Complete */}
        {order.status === 'ready' && (
          <button className="btn-mark-completed" style={{ flex: 1 }} onClick={() => onMarkCompleted && onMarkCompleted(order.id || order._id)}>
            Complete
          </button>
        )}
      </div>
    </div>
  );
}
