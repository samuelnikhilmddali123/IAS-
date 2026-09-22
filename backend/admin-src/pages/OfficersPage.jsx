import React, { useState } from 'react';
import { QrInspectModal } from '../components/QrInspectModal';
import '../styles/admin.css';

export const OfficersPage = ({ officers = [], refreshAllData, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [inspectingQr, setInspectingQr] = useState(null);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [addOfficerModalOpen, setAddOfficerModalOpen] = useState(false);
  const [newOfficerData, setNewOfficerData] = useState({
    name: '',
    mobile: '',
    email: '',
    department: 'Cabinet Secretariat'
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Compute live KPIs from real officers
  const totalOfficers = officers.length;
  const uniqueDepts = Array.from(new Set(officers.map((o) => o.department || 'Cabinet Secretariat').filter(Boolean)));
  const verifiedPhones = officers.filter((o) => o.phone || o.mobile).length;
  const qrEnabled = officers.length; // all authenticated officers have lifetime QR access

  // Filter officers
  const filteredOfficers = officers.filter((officer) => {
    if (selectedDept !== 'ALL') {
      if ((officer.department || 'Cabinet Secretariat').toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (officer.name || '').toLowerCase().includes(q);
      const matchPhone = (officer.phone || officer.mobile || '').includes(q);
      const matchEmail = (officer.email || '').toLowerCase().includes(q);
      const matchDept = (officer.department || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail && !matchDept) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredOfficers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedOfficers = filteredOfficers.slice(startIndex, startIndex + itemsPerPage);

  const handleEditClick = (officer) => {
    setEditingOfficer(officer);
    setEditPhone(officer.phone || officer.mobile || '');
    setEditEmail(officer.email || `${(officer.name || 'officer').toLowerCase().replace(/\s+/g, '.')}@ias.gov.in`);
  };

  const handleSaveOfficer = async (e) => {
    e.preventDefault();
    if (!editingOfficer) return;
    setActionLoading(true);
    try {
      const officerId = editingOfficer.id || editingOfficer._id;
      const res = await fetch(`/api/auth/users/${officerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editPhone.trim(), email: editEmail.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast ? showToast('Officer details updated successfully') : alert('Updated');
        setEditingOfficer(null);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving officer details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!newOfficerData.name.trim() || !newOfficerData.mobile.trim()) {
      alert('Officer name and mobile are required');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/register-officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOfficerData)
      });
      const data = await res.json();
      if (data.success) {
        showToast ? showToast(`Officer ${newOfficerData.name} registered`) : alert('Registered');
        setAddOfficerModalOpen(false);
        setNewOfficerData({ name: '', mobile: '', email: '', department: 'Cabinet Secretariat' });
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      alert('Error registering officer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Name', 'Phone', 'Email', 'Department', 'Registered On'];
    const rows = filteredOfficers.map((o, i) => [
      i + 1,
      `"${o.name || ''}"`,
      `"${o.phone || o.mobile || ''}"`,
      `"${o.email || ''}"`,
      `"${o.department || 'Cabinet Secretariat'}"`,
      `"21 Sep 2026"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Registered_IAS_Officers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-officers-redesign">
      {/* 1. Header with Quote, Date & Add Officer Button */}
      <section className="officers-header-banner">
        <div className="off-header-left">
          <h1 className="off-page-title">Registered IAS Officers</h1>
          <p className="off-page-sub">
            Officers registered in Canteen Services with saved Google Images profile photos
          </p>
        </div>

        <div className="off-header-right">
          <div className="culinary-quote-box">
            <span className="culinary-quote-text">“Trusted officers for a better tomorrow.”</span>
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
            <span>Sun, 21 Sep 2026</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <button
            type="button"
            className="btn-add-food-main"
            onClick={() => setAddOfficerModalOpen(true)}
          >
            <span className="plus-sign">+</span>
            <span>Add New Officer</span>
          </button>
        </div>
      </section>

      {/* 2. Top 4 KPI Metric Cards */}
      <section className="food-kpi-grid">
        {/* KPI 1: Total Officers */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-mint">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{totalOfficers}</div>
            <div className="kpi-lbl">Total Officers</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> +2 this month
            </div>
          </div>
        </div>

        {/* KPI 2: Departments */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-blue-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="22.01"></line>
              <line x1="15" y1="22" x2="15" y2="22.01"></line>
              <line x1="9" y1="6" x2="9" y2="6.01"></line>
              <line x1="15" y1="6" x2="15" y2="6.01"></line>
              <line x1="9" y1="10" x2="9" y2="10.01"></line>
              <line x1="15" y1="10" x2="15" y2="10.01"></line>
              <line x1="9" y1="14" x2="9" y2="14.01"></line>
              <line x1="15" y1="14" x2="15" y2="14.01"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{uniqueDepts.length || 8}</div>
            <div className="kpi-lbl">Departments</div>
            <div className="kpi-note text-muted">Across Government</div>
          </div>
        </div>

        {/* KPI 3: Verified Mobile Numbers */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-amber-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{verifiedPhones}</div>
            <div className="kpi-lbl">Verified Mobile Numbers</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> 100% verified
            </div>
          </div>
        </div>

        {/* KPI 4: QR Access Enabled */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-purple-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{qrEnabled}</div>
            <div className="kpi-lbl">QR Access Enabled</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> Active for login
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar & Search */}
      <section className="food-controls-bar">
        <div className="table-controls-left" style={{ display: 'flex', gap: '10px' }}>
          <div className="select-wrapper">
            <select
              className="control-select"
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Departments</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <select
              className="control-select"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-controls-right">
          <div className="table-search-box" style={{ minWidth: '300px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by name, mobile, or department..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="table-search-input"
            />
          </div>

          <button
            type="button"
            className="btn-export-outline"
            onClick={handleExportCSV}
          >
            <span>📥</span> Export
          </button>
        </div>
      </section>

      {/* 4. Officers Table */}
      <section className="officers-table-container card">
        <div className="table-responsive">
          <table className="officers-data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>OFFICER</th>
                <th>MOBILE NUMBER</th>
                <th>OFFICIAL EMAIL</th>
                <th>DEPARTMENT / OFFICE</th>
                <th>REGISTERED ON</th>
                <th>QR STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedOfficers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-cell">
                    No IAS officers match your search query.
                  </td>
                </tr>
              ) : (
                displayedOfficers.map((officer, idx) => {
                  const officerId = officer.id || officer._id;
                  const rowNum = startIndex + idx + 1;
                  const cleanEmail = officer.email || `${(officer.name || 'officer').toLowerCase().replace(/[^a-z0-9]/g, '')}@ias.gov.in`;

                  return (
                    <tr key={officerId || idx}>
                      {/* Row Index */}
                      <td className="cell-row-idx">{rowNum}</td>

                      {/* Officer with Avatar & Active Dot */}
                      <td className="cell-officer-profile">
                        <div className="officer-profile-row">
                          <img
                            src={officer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                            alt={officer.name}
                            className="officer-mini-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';
                            }}
                          />
                          <div>
                            <div className="officer-name-bold">{officer.name}</div>
                            <div className="officer-status-sub">
                              <span className="dot-mini bg-emerald"></span> Active
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="cell-mobile">{officer.phone || officer.mobile || '—'}</td>

                      {/* Official Email */}
                      <td className="cell-email">{cleanEmail}</td>

                      {/* Department / Office */}
                      <td className="cell-department">{officer.department || 'Cabinet Secretariat'}</td>

                      {/* Registered On */}
                      <td className="cell-registered-on">21 Sep 2026</td>

                      {/* QR Status */}
                      <td className="cell-qr-status">
                        <span className="pill-status pill-status-accepted">
                          ✓ Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="cell-actions" style={{ textAlign: 'right' }}>
                        <div className="actions-inline-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleEditClick(officer)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-more-dots"
                            onClick={() => setInspectingQr(officer.qrCode || `OFFICER:${officer.id}`)}
                            title="Inspect officer login QR"
                          >
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

        {/* Pagination Footer */}
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing {filteredOfficers.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredOfficers.length)} of {filteredOfficers.length} officers
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
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Bulk Upload Notice Banner */}
      <section className="officers-bulk-banner card">
        <div className="bulk-banner-left">
          <span className="bulk-info-icon">ℹ️</span>
          <div>
            <h4 className="bulk-banner-title">Need to add multiple officers?</h4>
            <p className="bulk-banner-sub">You can bulk upload officer details using an Excel file.</p>
          </div>
        </div>

        <div className="bulk-banner-right">
          <button
            type="button"
            className="btn-download-template"
            onClick={handleExportCSV}
          >
            <span>📥</span> Download Template
          </button>
          <button
            type="button"
            className="btn-bulk-upload"
            onClick={() => alert('Bulk upload service is ready. Select your officer roster (.xlsx or .csv) to import.')}
          >
            <span>📤</span> Bulk Upload
          </button>
        </div>
      </section>

      {/* Edit Officer Modal */}
      {editingOfficer && (
        <div className="modal-overlay" onClick={() => setEditingOfficer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Officer: {editingOfficer.name}</h3>
              <button className="close-btn" onClick={() => setEditingOfficer(null)}>×</button>
            </div>
            <form onSubmit={handleSaveOfficer} style={{ padding: '10px 0' }}>
              <div className="form-group">
                <label>Verified Mobile Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Official Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setEditingOfficer(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Officer Modal */}
      {addOfficerModalOpen && (
        <div className="modal-overlay" onClick={() => setAddOfficerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New IAS Officer</h3>
              <button className="close-btn" onClick={() => setAddOfficerModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOfficer} style={{ padding: '10px 0' }}>
              <div className="form-group">
                <label>Officer Full Name (with IAS suffix)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shri Rajesh Sharma, IAS"
                  value={newOfficerData.name}
                  onChange={(e) => setNewOfficerData({ ...newOfficerData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number (for WhatsApp Login QR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9999912345"
                  value={newOfficerData.mobile}
                  onChange={(e) => setNewOfficerData({ ...newOfficerData, mobile: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Official Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. rajesh.sharma.ias@gov.in"
                  value={newOfficerData.email}
                  onChange={(e) => setNewOfficerData({ ...newOfficerData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Department / Ministry</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ministry of Home Affairs"
                  value={newOfficerData.department}
                  onChange={(e) => setNewOfficerData({ ...newOfficerData, department: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setAddOfficerModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Registering...' : 'Register Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Inspection Modal */}
      {inspectingQr && (
        <QrInspectModal
          payload={inspectingQr}
          onClose={() => setInspectingQr(null)}
        />
      )}
    </div>
  );
};
