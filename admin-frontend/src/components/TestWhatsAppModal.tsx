import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export const TestWhatsAppModal: React.FC = () => {
  const { API_BASE, isTestWaModalOpen, closeTestWaModal, loadWhatsAppOutbox } = useAdmin();
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isTestWaModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`WhatsApp message dispatched successfully from Admin number to ${to}!`);
        closeTestWaModal();
        setTo('');
        setMessage('');
        loadWhatsAppOutbox();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>✉️ Send Test WhatsApp Message</h3>
          <button type="button" className="close-btn" onClick={closeTestWaModal}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Recipient Mobile Number *</label>
            <input
              type="text"
              className="form-control"
              placeholder="+91 98888 88888 or 9888888888"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
            <small style={{ fontSize: '11px', color: '#64748b' }}>
              The message will be sent from the configured Admin WhatsApp number.
            </small>
          </div>
          <div className="form-group">
            <label>Custom Message (Optional)</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Testing Canteen Services WhatsApp gateway delivery..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '16px',
            }}
          >
            <button type="button" className="btn btn-outline" onClick={closeTestWaModal}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#16a34a' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send WhatsApp Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
