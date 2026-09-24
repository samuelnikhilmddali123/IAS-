import React from 'react';

export function Footer() {
  const lastUpdated = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <footer className="status-footer">
      <div className="footer-left">
        <div className="footer-online-indicator">
          <span className="footer-online-dot" />
          <span>Kitchen Online</span>
        </div>
        <span className="footer-divider">|</span>
        <span>Last updated: {lastUpdated}</span>
        <span className="footer-divider">|</span>
        <span>Auto refresh: 10s</span>
      </div>

      <div className="footer-right">
        NOURISHING THOSE WHO SERVE
      </div>
    </footer>
  );
}
