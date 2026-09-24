import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, User } from 'lucide-react';

export function Header({ alerts = [], isConnected = false }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as 12:28 PM
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Format date as Sat, 20 Sep 2026
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="header-bar">
      <div className="header-left">
        <h1 className="header-title">KOT</h1>
        <span className="header-subtitle">KITCHEN ORDER TICKET</span>
      </div>

      <div className="header-center">
        <div className="clock-display">
          <span className="clock-time">{formattedTime}</span>
          <span className="clock-date">{formattedDate}</span>
        </div>

        <div className="live-sync-pill">
          <div
            className="pulse-dot"
            style={{ backgroundColor: isConnected ? '#10b981' : '#f59e0b' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="live-sync-title">
              {isConnected ? 'Live Socket Connected' : 'Connecting Backend...'}
            </span>
            <span className="live-sync-desc">
              {isConnected ? 'Port 5001 Active' : 'Connecting to :5001'}
            </span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div style={{ position: 'relative' }}>
          <button 
            className="header-action-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className="notification-badge">{alerts.length}</span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              zIndex: 50,
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>Notifications</span>
                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>{alerts.length} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto' }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.35rem', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: a.dot === 'red' ? '#ef4444' : '#10b981',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, color: '#374151' }}>
                      <strong>{a.title}</strong> {a.target && <span style={{ color: '#111827', fontWeight: 700 }}>{a.target}</span>}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="user-profile-btn">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <span className="user-name">Kitchen Staff</span>
            <span className="user-role">Main Kitchen</span>
          </div>
          <ChevronDown size={14} color="#6b7280" />
        </button>

        <div className="header-motto">
          GOOD FOOD<br />STRONGER PEOPLE
        </div>
      </div>
    </header>
  );
}
