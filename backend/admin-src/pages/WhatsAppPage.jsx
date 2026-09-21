import React, { useState, useEffect } from 'react';
import { QrInspectModal } from '../components/QrInspectModal';

export const WhatsAppPage = ({ showToast }) => {
  const [statusData, setStatusData] = useState({
    isConnected: false,
    status: 'CHECKING',
    pairingQr: '',
    adminWhatsAppNumber: '+91 91212 66269'
  });
  const [config, setConfig] = useState({
    adminWhatsAppNumber: '+91 91212 66269',
    provider: 'sandbox',
    connectionStatus: '🟢 Active',
    lastTestedAt: '',
    meta: { phoneNumberId: '', accessToken: '' },
    twilio: { accountSid: '', authToken: '', fromNumber: '' }
  });
  const [outbox, setOutbox] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectingQr, setInspectingQr] = useState(null);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testSending, setTestSending] = useState(false);

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
        adminWhatsAppNumber: data.adminWhatsAppNumber || '+91 91212 66269'
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
        const c = data.config;
        setConfig({
          adminWhatsAppNumber: c.adminWhatsAppNumber || '+91 91212 66269',
          provider: c.provider || 'sandbox',
          connectionStatus: c.connectionStatus || '🟢 Active',
          lastTestedAt: c.lastTestedAt ? new Date(c.lastTestedAt).toLocaleString() : 'Verified System Gateway',
          meta: c.meta || { phoneNumberId: '', accessToken: '' },
          twilio: c.twilio || { accountSid: '', authToken: '', fromNumber: '' }
        });
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp config:', err);
    }
  };

  const fetchOutbox = async () => {
    try {
      const [outboxRes, tokensRes] = await Promise.all([
        fetch('/api/whatsapp/outbox').then(r => r.json()),
        fetch('/api/whatsapp/tokens').then(r => r.json())
      ]);
      if (outboxRes && Array.isArray(outboxRes.outbox)) {
        setOutbox(outboxRes.outbox);
      }
      if (tokensRes && Array.isArray(tokensRes.tokens)) {
        setTokens(tokensRes.tokens);
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp outbox:', err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchConfig(), fetchOutbox()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchStatus();
      fetchOutbox();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to unlink Admin WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      showToast('Admin WhatsApp unlinked. New pairing code generated.');
      fetchStatus(true);
    } catch (err) {
      alert('Could not disconnect device');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        adminWhatsAppNumber: config.adminWhatsAppNumber.trim(),
        provider: config.provider,
        meta: config.provider === 'meta' ? config.meta : undefined,
        twilio: config.provider === 'twilio' ? config.twilio : undefined
      };
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('WhatsApp Gateway Configuration saved successfully');
        fetchConfig();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Could not connect to backend server');
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testTo) return;
    setTestSending(true);
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, message: testMsg })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`WhatsApp message dispatched to ${testTo}`);
        setTestModalOpen(false);
        setTestTo('');
        setTestMsg('');
        fetchOutbox();
      } else {
        alert('Failed: ' + data.message);
      }
    } catch (err) {
      alert('Failed to connect to backend server');
    } finally {
      setTestSending(false);
    }
  };

  const tokenMap = {};
  tokens.forEach(t => { tokenMap[t.id] = t; });

  const adminNumDisplay = config.adminWhatsAppNumber || statusData.adminWhatsAppNumber || '+91 91212 66269';

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Admin WhatsApp & Lifetime QR Gateway</h2>
          <p>Configure centralized WhatsApp dispatch number and audit lifetime login QRs delivered to registered officers</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline" onClick={refreshAll} disabled={loading}>
            🔄 Refresh Outbox
          </button>
          <button className="btn-primary" onClick={() => setTestModalOpen(true)} style={{ background: '#16a34a' }}>
            ✉️ Test WhatsApp Message
          </button>
        </div>
      </div>

      {/* WhatsApp Web Linking Card */}
      <div className="card" style={{ marginBottom: '24px', border: '2px solid #16a34a', background: '#f0fdf4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0a3d31' }}>
              📱 WhatsApp Web Gateway ({adminNumDisplay})
            </h3>
            <p style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
              Link your admin phone once to automatically send lifetime login QR images directly to officers' WhatsApp!
            </p>
          </div>
          <span
            className="badge"
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              background: statusData.isConnected ? '#dcfce7' : statusData.pairingQr ? '#fef3c7' : '#fee2e2',
              color: statusData.isConnected ? '#15803d' : statusData.pairingQr ? '#92400e' : '#b91c1c'
            }}
          >
            {statusData.isConnected ? '🟢 Linked & Ready' : statusData.pairingQr ? '🟡 Ready to Scan' : '⚪ Disconnected'}
          </span>
        </div>

        {/* If Disconnected / Pairing */}
        {!statusData.isConnected && (
          <div style={{ textAlign: 'center', padding: '20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0a3d31', marginBottom: '8px' }}>
              Scan with WhatsApp to Link ({adminNumDisplay})
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              1. Open WhatsApp on <b>{adminNumDisplay}</b> &gt; Tap <b>Settings / Linked Devices</b> &gt; <b>Link a Device</b>.<br />
              2. Point your camera at the QR code below to connect.
            </p>
            {statusData.pairingQr ? (
              <div style={{ display: 'inline-block', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <img src={statusData.pairingQr} alt="WhatsApp Pairing QR" style={{ width: '220px', height: '220px', display: 'block' }} />
              </div>
            ) : (
              <div style={{ padding: '30px', color: '#64748b' }}>Generating pairing QR code...</div>
            )}
            <div style={{ marginTop: '14px' }}>
              <button className="btn-outline" onClick={() => fetchStatus(true)} style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                🔄 Refresh Pairing QR
              </button>
            </div>
          </div>
        )}

        {/* If Connected */}
        {statusData.isConnected && (
          <div style={{ padding: '20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>✅</span>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: 0 }}>
                    Connected as {adminNumDisplay}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Live dispatch active. Lifetime login QR images and restaurant payment bills are dispatched seamlessly to officers.
                  </p>
                </div>
              </div>
              <button className="btn-outline" onClick={handleDisconnect} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                Disconnect / Relink
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Centralized Settings Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0a3d31' }}>Centralized WhatsApp Sending Configuration</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              All lifetime QR login credentials and canteen bills are dispatched strictly from this configured business sender.
            </p>
          </div>
          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', fontSize: '12px' }}>
            {config.connectionStatus || '🟢 Active (Canteen Gateway)'}
          </span>
        </div>

        <form onSubmit={handleSaveConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Admin WhatsApp Number *</label>
              <input
                type="text"
                className="form-control"
                value={config.adminWhatsAppNumber}
                onChange={(e) => setConfig({ ...config, adminWhatsAppNumber: e.target.value })}
                placeholder="+91 91212 66269"
                required
              />
              <small style={{ fontSize: '11px', color: '#64748b' }}>The sender number officers see on WhatsApp</small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>WhatsApp Provider Gateway *</label>
              <select
                className="form-control"
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              >
                <option value="sandbox">Canteen Sandbox / Testing Gateway (Default)</option>
                <option value="meta">Meta WhatsApp Business Cloud API</option>
                <option value="twilio">Twilio WhatsApp Messaging API</option>
              </select>
              <small style={{ fontSize: '11px', color: '#64748b' }}>Backend service routing the message</small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Last Status Check</label>
              <input
                type="text"
                className="form-control"
                readOnly
                style={{ background: '#f8fafc' }}
                value={config.lastTestedAt}
              />
              <small style={{ fontSize: '11px', color: '#16a34a' }}>Self-healing & audit logging active</small>
            </div>
          </div>

          {/* Meta Fields */}
          {config.provider === 'meta' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Meta Phone Number ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.meta?.phoneNumberId || ''}
                  onChange={(e) => setConfig({ ...config, meta: { ...config.meta, phoneNumberId: e.target.value } })}
                  placeholder="e.g. 1048291048201"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Meta System User Access Token (Bearer)</label>
                <input
                  type="password"
                  className="form-control"
                  value={config.meta?.accessToken || ''}
                  onChange={(e) => setConfig({ ...config, meta: { ...config.meta, accessToken: e.target.value } })}
                  placeholder="EAABw..."
                />
              </div>
            </div>
          )}

          {/* Twilio Fields */}
          {config.provider === 'twilio' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio Account SID</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.twilio?.accountSid || ''}
                  onChange={(e) => setConfig({ ...config, twilio: { ...config.twilio, accountSid: e.target.value } })}
                  placeholder="AC..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio Auth Token</label>
                <input
                  type="password"
                  className="form-control"
                  value={config.twilio?.authToken || ''}
                  onChange={(e) => setConfig({ ...config, twilio: { ...config.twilio, authToken: e.target.value } })}
                  placeholder="Auth Token"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio WhatsApp Sender</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.twilio?.fromNumber || ''}
                  onChange={(e) => setConfig({ ...config, twilio: { ...config.twilio, fromNumber: e.target.value } })}
                  placeholder="whatsapp:+14155238886"
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ background: '#0a3d31' }}>
              💾 Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Dispatched QR Outbox Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0a3d31' }}>Dispatched WhatsApp Messages & QR Outbox</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Audit log of all login QR codes sent to officers with real-time lifetime token states.</p>
          </div>
          <span className="badge" style={{ background: '#eef7f2', color: '#0a3d31', fontSize: '12px', fontWeight: 700 }}>
            {outbox.length} Dispatches
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Dispatched At</th>
                <th>Sender (Admin WhatsApp)</th>
                <th>Recipient Officer</th>
                <th>QR Preview</th>
                <th>Token Status</th>
                <th>Access Validity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outbox.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No WhatsApp QR messages dispatched yet. Register an officer to observe real-time delivery.
                  </td>
                </tr>
              ) : (
                outbox.map((msg, idx) => {
                  const tRecord = tokenMap[msg.qrId] || {};
                  const isRevoked = !!tRecord.revoked;
                  const qrImgSrc = msg.qrImage ? msg.qrImage : (msg.qrDataUrl || '');

                  return (
                    <tr key={idx}>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 700, color: '#0a3d31' }}>
                        {msg.from || adminNumDisplay}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                          {msg.userName || 'IAS Officer'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          📱 {msg.to}
                        </div>
                      </td>
                      <td>
                        {qrImgSrc ? (
                          <img
                            src={qrImgSrc}
                            alt="QR thumbnail"
                            onClick={() => setInspectingQr({
                              image: qrImgSrc,
                              payload: msg.qrPayload || '',
                              userName: msg.userName,
                              toPhone: msg.to
                            })}
                            style={{ width: '40px', height: '40px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                            title="Click to inspect full QR"
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {isRevoked ? (
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '11px' }}>
                            🚫 REVOKED
                          </span>
                        ) : (
                          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '11px' }}>
                            🟢 ACTIVE (Lifetime)
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                        ♾️ Lifetime Access
                      </td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => setInspectingQr({
                            image: qrImgSrc,
                            payload: msg.qrPayload || '',
                            userName: msg.userName,
                            toPhone: msg.to
                          })}
                        >
                          🔍 View QR
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test WhatsApp Modal */}
      {testModalOpen && (
        <div className="modal-overlay" onClick={() => setTestModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✉️ Send Test WhatsApp Message</h3>
              <button type="button" className="close-btn" onClick={() => setTestModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSendTest}>
              <div className="form-group">
                <label>Recipient Mobile Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 98888 88888 or 9888888888"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  required
                />
                <small style={{ fontSize: '11px', color: '#64748b' }}>The message will be sent from configured Admin WhatsApp {adminNumDisplay}.</small>
              </div>
              <div className="form-group">
                <label>Custom Message (Optional)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Testing Canteen Services WhatsApp gateway delivery..."
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-outline" onClick={() => setTestModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#16a34a' }} disabled={testSending}>
                  {testSending ? 'Sending...' : 'Send WhatsApp Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Inspect Modal */}
      {inspectingQr && (
        <QrInspectModal qrData={inspectingQr} onClose={() => setInspectingQr(null)} />
      )}
    </section>
  );
};
