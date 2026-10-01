import React, { useState } from 'react';
import { QrInspectModal } from '../components/QrInspectModal';

export const OfficersPage = ({ officers, refreshAllData, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [newPhone, setNewPhone] = useState('');
  const [inspectingQr, setInspectingQr] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredOfficers = officers.filter(officer => {
    const q = searchTerm.toLowerCase();
    return (
      (officer.name && officer.name.toLowerCase().includes(q)) ||
      (officer.phone && officer.phone.includes(q)) ||
      (officer.mobile && officer.mobile.includes(q)) ||
      (officer.email && officer.email.toLowerCase().includes(q)) ||
      (officer.department && officer.department.toLowerCase().includes(q))
    );
  });

  const handleEditPhone = (officer) => {
    setEditingOfficer(officer);
    setNewPhone(officer.phone || officer.mobile || '');
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (!editingOfficer) return;
    if (!newPhone.trim()) {
      alert('Phone number cannot be empty');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${editingOfficer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Officer phone number updated successfully');
        setEditingOfficer(null);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error updating officer phone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateQr = async (officer) => {
    if (!confirm(`Regenerate lifetime login QR for ${officer.name}? The previous QR will be invalidated and a new lifetime QR will be sent to ${officer.phone || officer.mobile} via WhatsApp.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${officer.id}/regenerate-qr`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`New lifetime QR generated & dispatched to ${officer.phone || officer.mobile}`);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Error regenerating officer QR');
    }
  };

  const handleRevokeQr = async (officer) => {
    if (!confirm(`Revoke login access for ${officer.name}? Their existing lifetime QR code will be immediately disabled.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${officer.id}/revoke-qr`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Login QR revoked for ${officer.name}`);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Error revoking officer QR');
    }
  };

  const handleDelete = async (officer) => {
    if (!confirm(`Are you sure you want to completely remove ${officer.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${officer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Officer removed successfully');
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Error deleting officer');
    }
  };

  const handleToggleOfficial = async (officer) => {
    const targetStatus = !officer.isOfficial;
    const confirmMsg = targetStatus
      ? `Mark ${officer.name} as an Official / Verified Officer? They will receive the verified blue tick and Official pricing.`
      : `Remove Official status for ${officer.name}? They will be converted to General User with standard pricing.`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/auth/users/${officer.id}/toggle-official`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOfficial: targetStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Officer ${officer.name} is now ${targetStatus ? 'Verified Official ✓' : 'General User'}`);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Error updating officer official status');
    }
  };

  const handleInspectQr = (officer) => {
    const qrImg = officer.lifetimeQrImage || officer.lifetimeQrDataUrl || '';
    setInspectingQr({
      image: qrImg,
      payload: officer.lifetimeQrPayload || '',
      userName: officer.name,
      toPhone: officer.phone || officer.mobile
    });
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Registered IAS Officers</h2>
          <p>Manage registered officers, verify Official IAS status for special pricing, update mobile numbers, and monitor lifetime QR credentials</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search officers by name, phone..."
            style={{ width: '260px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Officer Portrait</th>
              <th>Full Name</th>
              <th>Mobile Number</th>
              <th>Official Email</th>
              <th>Department / Office</th>
              <th>User Status</th>
              <th>QR Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOfficers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  {officers.length === 0
                    ? 'No registered officers found in the database.'
                    : 'No officers matching your search criteria.'}
                </td>
              </tr>
            ) : (
              filteredOfficers.map((officer) => {
                const isRevoked = !!officer.qrRevoked;
                const qrAvailable = officer.lifetimeQrImage || officer.lifetimeQrDataUrl;
                const isOfficial = !!officer.isOfficial;

                return (
                  <tr key={officer.id}>
                    <td>
                      <img
                        src={officer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'}
                        className="officer-avatar"
                        alt={officer.name}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0a3d31', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {officer.name}
                        {isOfficial && (
                          <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: '800' }} title="Verified Official User">✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        ID: {officer.id ? officer.id.substring(0, 8) : '—'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {officer.phone || officer.mobile || '—'}
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>
                      {officer.email || 'officer.ias@gov.in'}
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {officer.department || 'Cabinet Secretariat'}
                      </span>
                    </td>
                    <td>
                      {isOfficial ? (
                        <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '11px' }}>
                          ✓ OFFICIAL
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>
                          GENERAL
                        </span>
                      )}
                    </td>
                    <td>
                      {isRevoked ? (
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '11px' }}>
                          🚫 REVOKED
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '11px' }}>
                          🟢 ACTIVE
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          className="btn-outline"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: isOfficial ? '#2563eb' : '#059669',
                            borderColor: isOfficial ? '#93c5fd' : '#86efac',
                            backgroundColor: isOfficial ? '#eff6ff' : '#f0fdf4',
                            fontWeight: '600'
                          }}
                          onClick={() => handleToggleOfficial(officer)}
                          title={isOfficial ? 'Remove Official Status' : 'Mark as Official / Verified User'}
                        >
                          {isOfficial ? 'Remove Official' : '✓ Mark Official'}
                        </button>

                        <button
                          className="btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleEditPhone(officer)}
                        >
                          ✏️ Phone
                        </button>

                        {qrAvailable && (
                          <button
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleInspectQr(officer)}
                            title="View Lifetime QR"
                          >
                            🔍 QR
                          </button>
                        )}

                        <button
                          className="btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#0a3d31', borderColor: '#0a3d31' }}
                          onClick={() => handleRegenerateQr(officer)}
                          title="Generate brand new lifetime QR and dispatch via WhatsApp"
                        >
                          🔄 New QR
                        </button>

                        {!isRevoked ? (
                          <button
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#d97706', borderColor: '#d97706' }}
                            onClick={() => handleRevokeQr(officer)}
                            title="Revoke login access"
                          >
                            🚫 Revoke
                          </button>
                        ) : null}

                        <button
                          className="btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626', borderColor: '#dc2626' }}
                          onClick={() => handleDelete(officer)}
                        >
                          ✕ Delete
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

      {/* Edit Phone Modal */}
      {editingOfficer && (
        <div className="modal-overlay" onClick={() => setEditingOfficer(null)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Officer Phone</h3>
              <button type="button" className="close-btn" onClick={() => setEditingOfficer(null)}>&times;</button>
            </div>
            <form onSubmit={handleSavePhone}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Update registered WhatsApp mobile number for <b>{editingOfficer.name}</b>. All future bills &amp; login QRs will be sent to this number.
              </p>
              <div className="form-group">
                <label>Mobile Number (with country code) *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98888 88888"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-outline" onClick={() => setEditingOfficer(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Mobile Number'}
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
