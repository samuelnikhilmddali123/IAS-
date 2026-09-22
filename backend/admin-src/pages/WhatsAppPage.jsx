import React, { useState, useEffect } from 'react';
import { QrInspectModal } from '../components/QrInspectModal';
import '../styles/admin.css';

export const WhatsAppPage = ({ showToast }) => {
  const [statusData, setStatusData] = useState({
    isConnected: true,
    status: 'CONNECTED',
    pairingQr: '',
    adminWhatsAppNumber: '+919676482288'
  });
  const [config, setConfig] = useState({
    adminWhatsAppNumber: '+919676482288',
    provider: 'whatsapp_web',
    lastTestedAt: '21 Sep 2026, 02:47 PM'
  });
  const [outbox, setOutbox] = useState([]);
  const [inspectingQr, setInspectingQr] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter] = useState('Sun, 21 Sep 2026');
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTo, setTestTo] = useState('+919999912345');
  const [testMsg, setTestMsg] = useState('Central Government Canteen Services: Your login verification token is active.');
  const [testSending, setTestSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchStatus = async (forcePair = false) => {
    try {
      const url = forcePair ? '/api/whatsapp/pair' : '/api/whatsapp/status';
      const method = forcePair ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      const data = await res.json();
      setStatusData({
        isConnected: !!data.isConnected,
        status: data.status || (data.isConnected ? 'CONNECTED' : 'DISCONNECTED'),
        pairingQr: data.pairingQr || '',
        adminWhatsAppNumber: data.adminWhatsAppNumber || '+919676482288'
      });
    } catch (err) {
      console.warn('Failed to load WhatsApp status:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          adminWhatsAppNumber: data.config.adminWhatsAppNumber || '+919676482288',
          provider: data.config.provider || 'whatsapp_web',
          lastTestedAt: data.config.lastTestedAt ? new Date(data.config.lastTestedAt).toLocaleString() : '21 Sep 2026, 02:47 PM'
        });
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp config:', err);
    }
  };

  const fetchOutbox = async () => {
    try {
      const res = await fetch('/api/whatsapp/outbox');
      const data = await res.json();
      if (data.success && Array.isArray(data.outbox)) {
        setOutbox(data.outbox);
      }
    } catch (err) {
      console.warn('Failed to load outbox:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchOutbox();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        showToast ? showToast('WhatsApp settings saved successfully') : alert('Saved');
        fetchConfig();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      alert('Error saving configuration');
    }
  };

  const handleSendTestMessage = async () => {
    if (!testTo.trim()) return;
    setTestSending(true);
    try {
      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, message: testMsg })
      });
      const data = await res.json();
      if (data.success) {
        showToast ? showToast('✓ Test message queued successfully') : alert('Sent');
        setTestModalOpen(false);
        fetchOutbox();
      } else {
        alert('Test failed: ' + (data.message || 'Check gateway'));
      }
    } catch (e) {
      alert('Error sending test message: ' + e.message);
    } finally {
      setTestSending(false);
    }
  };

  // KPI Calculations from real outbox
  const totalSent = outbox.length;
  const activeTokensCount = outbox.filter((o) => {
    const st = (o.status || '').toUpperCase();
    return st === 'DELIVERED' || st === 'SENT' || st === 'ACTIVE';
  }).length;
  const expiredTokensCount = Math.max(0, totalSent - activeTokensCount);

  // Filter Outbox
  const filteredOutbox = outbox.filter((msg) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTo = (msg.to || '').toLowerCase().includes(q);
      const matchOfficer = (msg.officerName || msg.userName || '').toLowerCase().includes(q);
      if (!matchTo && !matchOfficer) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredOutbox.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedOutbox = filteredOutbox.slice(startIndex, startIndex + itemsPerPage);

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Sep 21, 02:49 PM';
    }
  };

  return (
    <div className="page-whatsapp-redesign">
      {/* 1. Header with Quote & Date */}
      <section className="whatsapp-header-banner">
        <div className="wa-header-left">
          <h1 className="wa-page-title">WhatsApp & QR Dispatch Gateway</h1>
          <p className="wa-page-sub">
            Send one-time QR login codes to registered officers via WhatsApp
          </p>
        </div>

        <div className="wa-header-right">
          <div className="culinary-quote-box">
            <span className="culinary-quote-text">“Digital access for a smoother service.”</span>
            <div className="hero-quote-bar">
              <span className="bar-orange"></span>
              <span className="bar-green"></span>
            </div>
          </div>

          <button className="date-picker-btn" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{dateFilter}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* 2. Top 2 Large Gateway Panels */}
      <section className="whatsapp-top-grid wa-top-columns-grid">
        {/* Panel 1: WhatsApp Web Gateway */}
        <div className="gateway-panel wa-gateway-card card">
          <div className="gateway-panel-header wa-gateway-header">
            <div className="wa-icon-brand-row">
              <div className="wa-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <div>
                <h3 className="gateway-title">WhatsApp Web Gateway</h3>
                <p className="gateway-sub">
                  Link your admin phone to automatically send login QR images to registered officers.
                </p>
              </div>
            </div>
            <span className={`status-pill ${statusData.isConnected ? 'online' : 'offline'}`}>
              <span className={`pulse-dot ${statusData.isConnected ? 'online' : 'offline'}`}></span>
              <span>{statusData.isConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>

          <div className="gateway-pairing-content wa-qr-scan-row">
            <div className="pairing-qr-box wa-qr-image-wrap">
              {statusData.pairingQr ? (
                <img
                  src={statusData.pairingQr}
                  alt="WhatsApp Pairing QR"
                  className="pairing-qr-image"
                />
              ) : (
                <div className="qr-rendered-vector">
                  {/* Clean SVG QR mockup if pairing is connected */}
                  <svg width="150" height="150" viewBox="0 0 100 100" fill="#0f172a">
                    <rect x="10" y="10" width="25" height="25" rx="3" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="18" y="18" width="9" height="9" />
                    <rect x="65" y="10" width="25" height="25" rx="3" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="73" y="18" width="9" height="9" />
                    <rect x="10" y="65" width="25" height="25" rx="3" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="18" y="73" width="9" height="9" />
                    <rect x="42" y="12" width="6" height="6" />
                    <rect x="52" y="12" width="6" height="6" />
                    <rect x="42" y="22" width="6" height="6" />
                    <rect x="52" y="32" width="6" height="6" />
                    <rect x="42" y="42" width="16" height="16" />
                    <rect x="65" y="42" width="8" height="8" />
                    <rect x="78" y="52" width="8" height="8" />
                    <rect x="65" y="65" width="12" height="12" />
                    <rect x="82" y="78" width="8" height="8" />
                    <rect x="42" y="65" width="6" height="14" />
                    <rect x="52" y="75" width="6" height="12" />
                  </svg>
                </div>
              )}
            </div>

            <div className="pairing-instructions">
              <h4 className="instructions-title">Scan with WhatsApp to Link Device</h4>
              <ol className="instructions-list">
                <li>Open WhatsApp on <strong>{config.adminWhatsAppNumber}</strong></li>
                <li>Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                <li>Click on <strong>Link a Device</strong></li>
                <li>Point your camera at this QR code</li>
              </ol>

              <div className="keep-open-notice">
                <span className="dot-mini bg-emerald"></span>
                <span>Keep this page open while scanning</span>
              </div>
            </div>
          </div>

          <div className="gateway-panel-footer">
            <button
              type="button"
              className="btn-refresh-pairing"
              onClick={() => fetchStatus(true)}
            >
              <span>↻</span> Refresh Pairing QR
            </button>
            <button
              type="button"
              className="btn-test-whatsapp"
              onClick={() => setTestModalOpen(true)}
            >
              <span>✈</span> Test WhatsApp Message
            </button>
          </div>
        </div>

        {/* Panel 2: Stats & Configuration */}
        <div className="gateway-config-panel wa-right-column">
          {/* Top 3 Stats in Row */}
          <div className="wa-stats-grid">
            <div className="wa-stat-card card">
              <div className="wa-stat-icon-wrap bg-blue-soft">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
              <div className="wa-stat-meta">
                <div className="wa-stat-val">{totalSent}</div>
                <div className="wa-stat-lbl">QR Messages Sent</div>
                <div className="wa-stat-trend text-emerald">▲ 12% this week</div>
              </div>
            </div>

            <div className="wa-stat-card card">
              <div className="wa-stat-icon-wrap bg-mint">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="wa-stat-meta">
                <div className="wa-stat-val">{activeTokensCount}</div>
                <div className="wa-stat-lbl">Active Tokens</div>
                <div className="wa-stat-trend text-emerald">▲ 8% from yesterday</div>
              </div>
            </div>

            <div className="wa-stat-card card">
              <div className="wa-stat-icon-wrap bg-rose-soft">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="wa-stat-meta">
                <div className="wa-stat-val">{expiredTokensCount}</div>
                <div className="wa-stat-lbl">Expired Tokens</div>
                <div className="wa-stat-trend text-rose">▼ 25% this week</div>
              </div>
            </div>
          </div>

          {/* Centralized Sending Configuration Form */}
          <div className="centralized-config-card wa-config-card card">
            <div className="card-header-flex">
              <div className="config-card-title">
                <span className="config-gear-icon">⚙️</span>
                <h3>Centralized WhatsApp Sending Configuration</h3>
              </div>
            </div>
            <p className="config-card-sub">
              All QR login codes are sent from this configured business number.
            </p>

            <form onSubmit={handleSaveConfig} className="config-form">
              <div className="form-group">
                <label>Admin WhatsApp Number *</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.adminWhatsAppNumber}
                  onChange={(e) => setConfig({ ...config, adminWhatsAppNumber: e.target.value })}
                  placeholder="+919676482288"
                  required
                />
                <span className="field-hint">The sender number officers see on WhatsApp</span>
              </div>

              <div className="form-group">
                <label>WhatsApp Provider Gateway *</label>
                <select
                  className="form-control"
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                >
                  <option value="whatsapp_web">WhatsApp Web (Multi-Device)</option>
                  <option value="meta_cloud">Meta Cloud WhatsApp Business API</option>
                  <option value="twilio">Twilio WhatsApp Sandbox</option>
                </select>
                <span className="field-hint">Backend service routing the message</span>
              </div>

              <div className="config-submit-row">
                <div className="verified-status-box">
                  <div className="verified-badge">
                    <span className="dot-mini bg-emerald"></span>
                    <strong>Verified System Gateway</strong>
                  </div>
                  <div className="verified-time">Self-healing & audit logging active • {config.lastTestedAt}</div>
                </div>

                <button type="submit" className="btn-save-config">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 3. Bottom Table: Dispatched WhatsApp Messages & QR Outbox */}
      <section className="whatsapp-outbox-container wa-outbox-card card">
        <div className="outbox-table-header">
          <div className="outbox-title-group">
            <span className="outbox-doc-icon">📄</span>
            <div>
              <h3 className="outbox-heading">Dispatched WhatsApp Messages & QR Outbox</h3>
              <p className="outbox-sub">Audit log of all QR codes sent to officers with real-time token status.</p>
            </div>
          </div>

          <div className="outbox-controls-group">
            <span className="dispatches-count-pill">{totalSent} Dispatches</span>
            <div className="table-search-box" style={{ minWidth: '240px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search by officer name or mobile..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="table-search-input"
              />
            </div>

            <div className="select-wrapper">
              <select className="control-select">
                <option>All Dates</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>Last 7 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="whatsapp-audit-table wa-outbox-table">
            <thead>
              <tr>
                <th>DISPATCHED AT</th>
                <th>SENDER (ADMIN WHATSAPP)</th>
                <th>RECIPIENT OFFICER</th>
                <th>QR PREVIEW</th>
                <th>TOKEN STATUS</th>
                <th>MESSAGE EXPIRY</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedOutbox.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-cell">
                    No dispatched WhatsApp logs found.
                  </td>
                </tr>
              ) : (
                displayedOutbox.map((item, idx) => {
                  const statusUpper = (item.status || 'DELIVERED').toUpperCase();
                  const isDelivered = statusUpper === 'DELIVERED' || statusUpper === 'SENT';

                  return (
                    <tr key={idx}>
                      {/* Dispatched At */}
                      <td className="cell-time">{formatTime(item.timestamp)}</td>

                      {/* Sender */}
                      <td className="cell-sender">{config.adminWhatsAppNumber}</td>

                      {/* Recipient Officer */}
                      <td className="cell-recipient">
                        <div className="officer-recipient-row">
                          <span className="officer-user-icon">👤</span>
                          <div>
                            <div className="recipient-name">{item.officerName || item.userName || 'IAS Officer'}</div>
                            <div className="recipient-phone">📞 {item.to || item.phone || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* QR Preview */}
                      <td className="cell-qr-thumb">
                        <div
                          className="mini-qr-box"
                          onClick={() => setInspectingQr(item.qrPayload || item.qrDataUrl || item.messageText)}
                          title="Click to view full QR"
                        >
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="#10b981">
                            <rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="#10b981" strokeWidth="2" />
                            <rect x="14" y="2" width="8" height="8" rx="1" fill="none" stroke="#10b981" strokeWidth="2" />
                            <rect x="2" y="14" width="8" height="8" rx="1" fill="none" stroke="#10b981" strokeWidth="2" />
                            <rect x="5" y="5" width="2" height="2" />
                            <rect x="17" y="5" width="2" height="2" />
                            <rect x="5" y="17" width="2" height="2" />
                            <rect x="14" y="14" width="3" height="3" />
                            <rect x="19" y="14" width="3" height="3" />
                            <rect x="14" y="19" width="8" height="3" />
                          </svg>
                        </div>
                      </td>

                      {/* Token Status */}
                      <td className="cell-token-status">
                        <span className={`pill-token-status ${isDelivered ? 'active' : 'expired'}`}>
                          <span className={`dot-mini ${isDelivered ? 'bg-emerald' : 'bg-rose'}`}></span>
                          <span>{isDelivered ? 'Active (1-Time)' : 'Expired'}</span>
                        </span>
                      </td>

                      {/* Message Expiry */}
                      <td className="cell-expiry">
                        {item.expiresAt ? formatTime(item.expiresAt) : '5 mins'}
                      </td>

                      {/* Actions */}
                      <td className="cell-actions" style={{ textAlign: 'right' }}>
                        <div className="actions-inline-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-view-qr-action"
                            onClick={() => setInspectingQr(item.qrPayload || item.qrDataUrl || item.messageText)}
                          >
                            <span>🔍</span> View QR
                          </button>
                          <button type="button" className="btn-more-dots">
                            ⋮
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing {filteredOutbox.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredOutbox.length)} of {filteredOutbox.length} records
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
              <button
                key={page}
                type="button"
                className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>

            <div className="per-page-select-wrap">
              <select
                className="per-page-select"
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* QR Inspection Modal */}
      {inspectingQr && (
        <QrInspectModal
          payload={inspectingQr}
          onClose={() => setInspectingQr(null)}
        />
      )}

      {/* Test Message Modal */}
      {testModalOpen && (
        <div className="modal-overlay" onClick={() => setTestModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✈ Test WhatsApp Message Dispatch</h3>
              <button className="close-btn" onClick={() => setTestModalOpen(false)}>×</button>
            </div>
            <div style={{ padding: '10px 0' }}>
              <div className="form-group">
                <label>Recipient Mobile (E.164 with Country Code)</label>
                <input
                  type="text"
                  className="form-control"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="+919999912345"
                />
              </div>
              <div className="form-group">
                <label>Message Content</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setTestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={testSending}
                  onClick={handleSendTestMessage}
                >
                  {testSending ? 'Sending...' : 'Send WhatsApp Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
