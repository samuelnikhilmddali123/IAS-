import React from 'react';

export const QrInspectModal = ({ qrData, onClose }) => {
  if (!qrData) return null;

  const handleCopy = () => {
    if (qrData.payload) {
      navigator.clipboard.writeText(qrData.payload);
      alert('Copied QR code payload to clipboard! You can test paste it into the app scanner.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ textAlign: 'left' }}>
          <h3>📱 WhatsApp QR Login Credential</h3>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '12px 0' }}>
          {qrData.image ? (
            <img
              src={qrData.image}
              alt="QR Code"
              style={{
                width: '220px',
                height: '220px',
                borderRadius: '12px',
                border: '2px solid #0a3d31',
                margin: '0 auto',
                display: 'block'
              }}
            />
          ) : (
            <div style={{ padding: '40px', background: '#f1f5f9', borderRadius: '12px' }}>
              No QR Image Available
            </div>
          )}

          <p style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '14px' }}>
            Officer: {qrData.userName || 'IAS Officer'}
          </p>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            📱 {qrData.toPhone || ''}
          </p>
          <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', marginTop: '6px' }}>
            ♾️ Lifetime Access • Cryptographically Secured
          </p>

          {qrData.payload && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', marginTop: '14px', textAlign: 'left' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                App-Only Opaque Payload:
              </p>
              <code style={{ fontSize: '10px', color: '#0a3d31', wordBreak: 'break-all', display: 'block' }}>
                {qrData.payload}
              </code>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button type="button" className="btn-outline" onClick={handleCopy} style={{ flex: 1 }}>
            📋 Copy Payload
          </button>
          <button type="button" className="btn-primary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
