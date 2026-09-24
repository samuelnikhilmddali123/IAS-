import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export function NewOrderModal({ isOpen, onClose, onCreateOrder }) {
  const [orderType, setOrderType] = useState('Dine In');
  const [tableNo, setTableNo] = useState('Table 7');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([
    { qty: 1, name: 'Chicken Biryani' }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { qty: 1, name: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newId = (Math.floor(Math.random() * 900) + 1050).toString();
    const newOrder = {
      id: newId,
      timeAgo: 'Just now',
      type: orderType,
      table: orderType === 'Dine In' ? tableNo : null,
      items: items.filter(i => i.name.trim() !== ''),
      note: note.trim() || null,
      status: 'new'
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Create New Kitchen Order (KOT)</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Order Type</label>
              <select
                className="form-select"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="Dine In">Dine In</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>

            {orderType === 'Dine In' && (
              <div className="form-group">
                <label className="form-label">Table Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  placeholder="e.g. Table 8"
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label">Order Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                style={{ background: 'none', border: 'none', color: '#16201c', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ width: '60px' }}
                  value={item.qty}
                  onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Dish name (e.g. Butter Chicken)"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  required
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Kitchen Notes / Special Instructions</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Less spicy, Extra ketchup..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-reject"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="add-order-btn"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Send to KOT Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
