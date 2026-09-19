import React from 'react';
import { useAdmin } from '../context/AdminContext';

export const QrInspectModal: React.FC = () => {
  const { isQrModalOpen, qrModalData, closeQrModal } = useAdmin();

  if (!isQrModalOpen || !qrModalData) return null;

  const copyQrPayload = () => {
    if (qrModalData.payload) {
      navigator.clipboard.writeText(qrModalData.payload);
      alert('Copied QR code payload to clipboard! You can paste it in the App scanner to test.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div className="modal-header" style={{ textAlign: 'left' }}>
          <h3>📱 WhatsApp QR Login Code</h3>
          <button type="button" className="close-btn" onClick={closeQrModal}>
            &times;
          </button>
        </div>
        <div style={{ padding: '16px 0' }}>
          <img
            src={qrModalData.imgUrl}
            alt="QR Code"
            style={{
              width: '220px',
              height: '220px',
              borderRadius: '12px',
              border: '2px solid #0a3d31',
              margin: '0 auto',
              display: 'block',
            }}
          />
          <p
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#0f172a',
              marginTop: '14px',
            }}
          >
            Officer: {qrModalData.userName} (📱 {qrModalData.toPhone})
          </p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>
            Expires in 5 minutes • One-time use
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px',
              marginTop: '14px',
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              App-Only Opaque Payload (Safe against Google Lens):
            </p>
            <code
              style={{
                fontSize: '10px',
                color: '#0a3d31',
                wordBreak: 'break-all',
                display: 'block',
              }}
            >
              {qrModalData.payload || 'APPQR:v1:...'}
            </code>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-outline" onClick={copyQrPayload} style={{ flex: 1 }}>
            📋 Copy Payload
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={closeQrModal}
            style={{ background: '#0a3d31', flex: 1 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
