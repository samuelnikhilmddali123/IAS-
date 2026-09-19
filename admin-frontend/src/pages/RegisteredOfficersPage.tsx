import React from 'react';
import { useAdmin } from '../context/AdminContext';

export const RegisteredOfficersPage: React.FC = () => {
  const { API_BASE, allOfficers, showToast, refreshAllData } = useAdmin();

  const handleUpdatePhone = async (id: string, currentPhone: string) => {
    const newPhone = window.prompt('Enter new phone number for this officer:', currentPhone);
    if (newPhone === null || newPhone.trim() === '' || newPhone === currentPhone) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Officer phone updated');
        await refreshAllData();
      } else {
        showToast('Failed to update: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      showToast('Error updating officer phone');
    }
  };

  const handleDeleteOfficer = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this officer?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Officer removed successfully');
        await refreshAllData();
      } else {
        showToast('Failed to delete: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      showToast('Error deleting officer');
    }
  };

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Registered IAS Officers</h2>
          <p>Officers registered in Canteen Services with saved Google Images profile photos</p>
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
              <th>Registered Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allOfficers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No registered officers yet. Complete a registration on the app to view officers here.
                </td>
              </tr>
            ) : (
              allOfficers.map((officer) => {
                const phone = officer.phone || officer.mobile || '';
                return (
                  <tr key={officer.id}>
                    <td>
                      <img
                        src={
                          officer.avatar ||
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'
                        }
                        className="officer-avatar"
                        alt={officer.name}
                      />
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{officer.name}</td>
                    <td>{phone}</td>
                    <td>{officer.email || 'officer.ias@gov.in'}</td>
                    <td>{officer.department || 'Cabinet Secretariat'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(officer.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn-outline"
                        style={{ padding: '4px 8px', marginRight: '6px' }}
                        onClick={() => handleUpdatePhone(officer.id, phone)}
                      >
                        Edit Phone
                      </button>
                      <button
                        className="btn-outline"
                        style={{ padding: '4px 8px', color: '#dc2626' }}
                        onClick={() => handleDeleteOfficer(officer.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
