import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

export const WhatsAppQrPage: React.FC = () => {
  const {
    API_BASE,
    waWebStatus,
    waConfig,
    waOutbox,
    waTokens,
    loadWhatsAppWebStatus,
    loadWhatsAppConfig,
    loadWhatsAppOutbox,
    openTestWaModal,
    openQrModal,
  } = useAdmin();

  // Config Form state
  const [adminNumber, setAdminNumber] = useState('');
  const [provider, setProvider] = useState('sandbox');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadWhatsAppWebStatus();
    loadWhatsAppConfig();
    loadWhatsAppOutbox();

    const interval = setInterval(() => {
      loadWhatsAppWebStatus();
      loadWhatsAppOutbox();
    }, 3500);

    return () => clearInterval(interval);
  }, [loadWhatsAppWebStatus, loadWhatsAppConfig, loadWhatsAppOutbox]);

  useEffect(() => {
    if (waConfig) {
      setAdminNumber(waConfig.adminWhatsAppNumber || '+91 91212 66269');
      setProvider(waConfig.provider || 'sandbox');
      if (waConfig.meta) {
        setMetaPhoneId(waConfig.meta.phoneNumberId || '');
        setMetaToken(waConfig.meta.accessToken || '');
      }
      if (waConfig.twilio) {
        setTwilioSid(waConfig.twilio.accountSid || '');
        setTwilioToken(waConfig.twilio.authToken || '');
        setTwilioFrom(waConfig.twilio.fromNumber || '');
      }
    }
  }, [waConfig]);

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to unlink Admin WhatsApp?')) return;
    try {
      await fetch(`${API_BASE}/api/whatsapp/disconnect`, { method: 'POST' });
      loadWhatsAppWebStatus(true);
    } catch (err) {
      alert('Could not disconnect device');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);

    const payload: any = {
      adminWhatsAppNumber: adminNumber.trim(),
      provider,
    };

    if (provider === 'meta') {
      payload.meta = {
        phoneNumberId: metaPhoneId.trim(),
        accessToken: metaToken.trim(),
      };
    } else if (provider === 'twilio') {
      payload.twilio = {
        accountSid: twilioSid.trim(),
        authToken: twilioToken.trim(),
        fromNumber: twilioFrom.trim(),
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert('WhatsApp Gateway Configuration updated successfully!');
        loadWhatsAppConfig();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Could not connect to backend server');
    } finally {
      setSavingConfig(false);
    }
  };

  const displayAdminNum = adminNumber || waConfig?.adminWhatsAppNumber || '+91 91212 66269';

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Admin WhatsApp & QR Dispatch Gateway</h2>
          <p>
            Configure the centralized WhatsApp number and monitor live QR login codes dispatched to
            registered officers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={() => loadWhatsAppOutbox()}
            style={{ borderColor: '#cbd5e1', color: '#0a3d31' }}
          >
            🔄 Refresh Outbox
          </button>
          <button
            className="btn btn-primary"
            onClick={openTestWaModal}
            style={{ background: '#16a34a' }}
          >
            ✉️ Test WhatsApp Message
          </button>
        </div>
      </div>

      {/* WhatsApp Web Linking Card */}
      <div className="card" style={{ marginBottom: '24px', border: '2px solid #16a34a', background: '#f0fdf4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0a3d31' }}>
              📱 WhatsApp Web Gateway (<span>{displayAdminNum}</span>)
            </h3>
            <p style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>
              Link your admin phone once to automatically send login QR images to registered users' WhatsApp!
            </p>
          </div>
          <span
            className="badge"
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              background: waWebStatus?.isConnected ? '#dcfce7' : waWebStatus?.pairingQr ? '#fef3c7' : '#fee2e2',
              color: waWebStatus?.isConnected ? '#15803d' : waWebStatus?.pairingQr ? '#92400e' : '#b91c1c',
            }}
          >
            {waWebStatus?.isConnected
              ? '🟢 Linked & Ready'
              : waWebStatus?.pairingQr
              ? '🟡 Ready to Scan'
              : waWebStatus
              ? '⚪ Disconnected'
              : '⏳ Checking Connection...'}
          </span>
        </div>

        {/* Pairing QR Container */}
        {(!waWebStatus || !waWebStatus.isConnected) && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0a3d31', marginBottom: '8px' }}>
              Scan with WhatsApp to Link (<span>{displayAdminNum}</span>)
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              1. Open WhatsApp on <b>{displayAdminNum.replace(/\D/g, '')}</b> &gt; Tap <b>Settings / Linked Devices</b> &gt; <b>Link a Device</b>.<br />
              2. Point your camera at the QR code below to connect.
            </p>
            {waWebStatus?.pairingQr && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <img
                  src={waWebStatus.pairingQr}
                  alt="WhatsApp Pairing QR"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              </div>
            )}
            <div style={{ marginTop: '14px' }}>
              <button
                className="btn btn-outline"
                onClick={() => loadWhatsAppWebStatus(true)}
                style={{ borderColor: '#16a34a', color: '#16a34a' }}
              >
                🔄 Refresh Pairing QR
              </button>
            </div>
          </div>
        )}

        {/* Connected State */}
        {waWebStatus?.isConnected && (
          <div
            style={{
              padding: '20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: 0 }}>
                    Connected as {waWebStatus.adminWhatsAppNumber || displayAdminNum}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#4b5563', margin: '2px 0 0 0' }}>
                    Live dispatch active. As soon as an officer registers, their QR image is automatically sent to their WhatsApp.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-outline"
                onClick={handleDisconnect}
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
              >
                Disconnect / Relink
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Gateway Settings Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0a3d31' }}>
              Centralized WhatsApp Sending Configuration
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              All one-time QR login codes are sent strictly from this configured business number to the officer's registered mobile.
            </p>
          </div>
          <span
            className="badge badge-success"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {waConfig?.connectionStatus || '🟢 Active (Canteen Gateway)'}
          </span>
        </div>

        <form onSubmit={handleSaveConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Admin WhatsApp Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 91212 66269"
                value={adminNumber}
                onChange={(e) => setAdminNumber(e.target.value)}
                required
              />
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                The sender number officers see on WhatsApp
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>WhatsApp Provider Gateway *</label>
              <select
                className="form-control"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="sandbox">Canteen Sandbox / Testing Gateway (Default)</option>
                <option value="meta">Meta WhatsApp Business Cloud API</option>
                <option value="twilio">Twilio WhatsApp Messaging API</option>
              </select>
              <small style={{ fontSize: '11px', color: '#64748b' }}>
                Backend service routing the message
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Last Status Check</label>
              <input
                type="text"
                className="form-control"
                readOnly
                style={{ background: '#f8fafc' }}
                value={waConfig?.lastTestedAt ? new Date(waConfig.lastTestedAt).toLocaleString() : 'Verified System Gateway'}
              />
              <small style={{ fontSize: '11px', color: '#16a34a' }}>
                Self-healing & audit logging active
              </small>
            </div>
          </div>

          {/* Meta Specific Inputs */}
          {provider === 'meta' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Meta Phone Number ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1048291048201"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Meta System User Access Token (Bearer)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="EAABw..."
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Twilio Specific Inputs */}
          {provider === 'twilio' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio Account SID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="AC..."
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio Auth Token</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Auth Token"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Twilio WhatsApp Sender</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="whatsapp:+14155238886"
                  value={twilioFrom}
                  onChange={(e) => setTwilioFrom(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#0a3d31' }}
              disabled={savingConfig}
            >
              💾 {savingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* Dispatched QR Outbox Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0a3d31' }}>
              Dispatched WhatsApp Messages & QR Outbox
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Audit log of all login QR codes sent to officers with real-time token states.
            </p>
          </div>
          <span
            className="badge"
            style={{ background: '#eef7f2', color: '#0a3d31', fontSize: '12px', fontWeight: 700 }}
          >
            {waOutbox.length} Dispatches
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Dispatched At</th>
                <th>Sender (Admin WhatsApp)</th>
                <th>Recipient Officer</th>
                <th>QR Preview</th>
                <th>Token Status</th>
                <th>Message Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waOutbox.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No WhatsApp QR messages dispatched yet. Register an officer to see real-time dispatch.
                  </td>
                </tr>
              ) : (
                waOutbox.map((msg, idx) => {
                  const tRecord = msg.qrId ? waTokens[msg.qrId] : undefined;
                  const isUsed = tRecord?.used;
                  const isExpired = tRecord?.expiresAt && new Date(tRecord.expiresAt) < new Date();

                  let statusBadge = (
                    <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d' }}>
                      🟢 ACTIVE (1-Time)
                    </span>
                  );
                  if (isUsed) {
                    statusBadge = (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        ⚪ USED
                      </span>
                    );
                  } else if (isExpired) {
                    statusBadge = (
                      <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        🔴 EXPIRED
                      </span>
                    );
                  }

                  const qrImgSrc = msg.qrImage
                    ? `${API_BASE}${msg.qrImage}`
                    : msg.qrDataUrl || '';
                  const payload = msg.qrPayload || '';
                  const recipientName = msg.userName || 'IAS Officer';

                  return (
                    <tr key={msg.id || idx}>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(msg.timestamp).toLocaleString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 700, color: '#0a3d31' }}>
                        {msg.from || displayAdminNum}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                          {recipientName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>📱 {msg.to}</div>
                      </td>
                      <td>
                        {qrImgSrc ? (
                          <img
                            src={qrImgSrc}
                            onClick={() => openQrModal(qrImgSrc, payload, msg.to, recipientName)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: '1px solid #cbd5e1',
                            }}
                            title="Click to view full QR"
                            alt="QR Thumbnail"
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{statusBadge}</td>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>
                        {msg.expiresAt
                          ? new Date(msg.expiresAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '5 mins'}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openQrModal(qrImgSrc, payload, msg.to, recipientName)}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
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
    </section>
  );
};
