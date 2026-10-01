import React from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChefHat,
  Utensils
} from 'lucide-react';
import { printPaymentBill, printKOTTicket } from '../utils/printer';

export function RightPanel({ preOrders = [], onStartPrep, onMarkReady, onReject }) {
  return (
    <aside className="right-panel">
      <div className="panel-widget" style={{ padding: '0.85rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Panel Header */}
        <div className="widget-header" style={{ borderBottom: '1.5px solid #fde68a', paddingBottom: '0.65rem' }}>
          <div className="widget-title-group" style={{ color: '#92400e' }}>
            <Calendar size={18} color="#b45309" />
            <span style={{ fontSize: '0.92rem', letterSpacing: '0.3px' }}>Pre-Orders</span>
            <span style={{
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '999px',
              marginLeft: '4px'
            }}>
              {preOrders.length}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b45309' }}>
            Scheduled Pickups
          </span>
        </div>

        {/* Pre-Orders List */}
        <div className="kanban-cards-scroll" style={{ flex: 1, overflowY: 'auto', gap: '0.75rem', marginTop: '0.5rem' }}>
          {preOrders.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#9ca3af',
              gap: '0.5rem'
            }}>
              <Calendar size={36} color="#d1d5db" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>
                No Upcoming Pre-Orders
              </span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', maxWidth: '200px' }}>
                Pre-orders scheduled by officers will appear here with date & time.
              </span>
            </div>
          ) : (
            preOrders.map((order) => {
              const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID' || (order.paymentStatus || '').toUpperCase() === 'COMPLETED';
              const paymentMethod = (order.paymentMethod || order.paymentMode || 'UPI').toUpperCase();
              const displayId = order.orderNumber || (order.id ? (String(order.id).startsWith('#') ? order.id : `#${order.id}`) : '');
              const slotDisplay = order.pickupTime || order.preOrderSlot || 'Scheduled Slot';
              const dateDisplay = order.pickupDateStr ? `${order.pickupDateStr}, ` : '';

              return (
                <div
                  key={order.id || order._id}
                  className="order-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fde68a',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Top Bar: Token & Payment */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {order.tokenNumber && (
                        <span style={{
                          backgroundColor: '#16201c',
                          color: '#cca43b',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          #{order.tokenNumber}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                        {displayId}
                      </span>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                      color: isPaid ? '#15803d' : '#b91c1c',
                      border: isPaid ? '1px solid #86efac' : '1px solid #fca5a5'
                    }}>
                      {isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {isPaid ? `PAID (${paymentMethod})` : 'UNPAID'}
                    </span>
                  </div>

                  {/* Officer / Customer Name */}
                  {order.userName && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      <User size={12} color="#4b5563" />
                      <span>{order.userName}</span>
                      {order.table && order.table !== 'Counter Pickup' && (
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500 }}>
                          ({order.table})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Scheduled Slot Time Highlight Box */}
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    margin: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Clock size={13} color="#b45309" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', lineHeight: 1.2 }}>
                      {dateDisplay}{slotDisplay}
                    </span>
                  </div>

                  {/* Items List */}
                  <div style={{
                    borderTop: '1px dashed #e5e7eb',
                    borderBottom: '1px dashed #e5e7eb',
                    padding: '4px 0',
                    margin: '4px 0',
                    fontSize: '0.74rem',
                    color: '#374151'
                  }}>
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                        <span>
                          <strong style={{ color: '#111827' }}>{it.qty || it.quantity || 1}x</strong> {it.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons: Start Prep & Print Bill */}
                  <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#0d3829',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      onClick={() => onStartPrep && onStartPrep(order.id || order._id)}
                    >
                      <ChefHat size={12} />
                      Start Cooking
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Print Pre-Order Bill"
                      onClick={() => printPaymentBill(order._id || order.id || order.orderNumber)}
                    >
                      <Printer size={12} />
                      Bill
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Print KOT Ticket"
                      onClick={() => printKOTTicket(order._id || order.id || order.orderNumber)}
                    >
                      <Utensils size={12} />
                      KOT
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
