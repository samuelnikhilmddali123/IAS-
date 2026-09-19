import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export const FoodMenuPage: React.FC = () => {
  const {
    API_BASE,
    allFoods,
    openAddFoodModal,
    openEditFoodModal,
    showToast,
    refreshAllData,
  } = useAdmin();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFoodAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await fetch(`${API_BASE}/api/foods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      showToast('Food stock status updated');
      await refreshAllData();
    } catch (e) {
      showToast('Failed to update status');
    }
  };

  const deleteFoodItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this food item?')) return;
    try {
      await fetch(`${API_BASE}/api/foods/${id}`, { method: 'DELETE' });
      showToast('Food item removed from canteen menu');
      await refreshAllData();
    } catch (e) {
      showToast('Failed to delete item');
    }
  };

  let filteredFoods = allFoods;
  if (activeFilter !== 'all') {
    filteredFoods = filteredFoods.filter(
      (f) => f.category && f.category.toLowerCase() === activeFilter
    );
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredFoods = filteredFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.subCategory && f.subCategory.toLowerCase().includes(q))
    );
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Food Menu & Dishes</h2>
          <p>Manage daily items categorized by Breakfast, Lunch, Dinner, and Snacks</p>
        </div>
        <button className="btn-primary" onClick={openAddFoodModal}>
          <span>+</span> Add New Food Item
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-row">
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
              MEAL SLOT:
            </span>
            <button
              className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn${activeFilter === 'breakfast' ? ' active' : ''}`}
              onClick={() => setActiveFilter('breakfast')}
            >
              Breakfast
            </button>
            <button
              className={`filter-btn${activeFilter === 'lunch' ? ' active' : ''}`}
              onClick={() => setActiveFilter('lunch')}
            >
              Lunch
            </button>
            <button
              className={`filter-btn${activeFilter === 'dinner' ? ' active' : ''}`}
              onClick={() => setActiveFilter('dinner')}
            >
              Dinner
            </button>
            <button
              className={`filter-btn${activeFilter === 'snacks' ? ' active' : ''}`}
              onClick={() => setActiveFilter('snacks')}
            >
              Snacks / Beverages
            </button>
          </div>
          <input
            type="text"
            placeholder="Search dishes..."
            className="form-control"
            style={{ width: '200px', padding: '6px 12px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Dish Details</th>
              <th>Category</th>
              <th>Portion</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFoods.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No food items found in this category.
                </td>
              </tr>
            ) : (
              filteredFoods.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="food-meta">
                      <img
                        src={
                          item.image ||
                          'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=150&q=80'
                        }
                        className="food-thumb"
                        alt={item.name}
                      />
                      <div>
                        <div className="food-title">{item.name}</div>
                        <div className="food-sub">
                          {item.subCategory || ''} • {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${item.category || 'lunch'}`}>{item.category}</span>
                  </td>
                  <td>{item.portion || 'Standard'}</td>
                  <td style={{ fontWeight: 700 }}>₹{item.price}</td>
                  <td>{item.availableQuantity || 0}</td>
                  <td>
                    <button
                      className="btn-outline"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: item.isAvailable ? '#15803d' : '#dc2626',
                      }}
                      onClick={() => toggleFoodAvailability(item.id, !item.isAvailable)}
                    >
                      {item.isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-outline"
                      style={{ padding: '4px 8px', marginRight: '6px' }}
                      onClick={() => openEditFoodModal(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: '4px 8px', color: '#dc2626' }}
                      onClick={() => deleteFoodItem(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
