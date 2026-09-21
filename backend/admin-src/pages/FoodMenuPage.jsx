import React, { useState } from 'react';

export const FoodMenuPage = ({
  foods,
  onOpenAddFood,
  onToggleAvailability,
  onDeleteFood,
  onUpdateFoodPrice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dietFilter, setDietFilter] = useState('ALL'); // ALL, VEG, NONVEG

  const categories = ['ALL', 'Meals', 'Tiffins', 'Beverages', 'Snacks', 'Sweets', 'Specials'];

  const filteredFoods = foods.filter((food) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (food.name || '').toLowerCase().includes(q);
      const matchCat = (food.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      if ((food.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Diet filter
    if (dietFilter === 'VEG' && !food.isVeg) return false;
    if (dietFilter === 'NONVEG' && food.isVeg) return false;

    return true;
  });

  const handleEditPrice = (food) => {
    const newPrice = prompt(`Enter new price (₹) for ${food.name}:`, food.price);
    if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
      onUpdateFoodPrice(food.id || food._id, parseFloat(newPrice));
    }
  };

  return (
    <div className="page-food-menu">
      <div className="section-header">
        <div>
          <h2>Food Menu Catalog & Pricing</h2>
          <p>Configure items, toggle availability, update pricing, and add canteen specials</p>
        </div>
        <button className="btn-primary" onClick={onOpenAddFood}>
          <span>+</span> Add Food Item
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Category Chips */}
          <div className="filters-row">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'ALL' ? '🍽️ All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Search and Veg Toggle */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`filter-btn ${dietFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setDietFilter('ALL')}
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
              >
                All Diets
              </button>
              <button
                type="button"
                className={`filter-btn ${dietFilter === 'VEG' ? 'active' : ''}`}
                onClick={() => setDietFilter('VEG')}
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
              >
                🟢 Pure Veg
              </button>
              <button
                type="button"
                className={`filter-btn ${dietFilter === 'NONVEG' ? 'active' : ''}`}
                onClick={() => setDietFilter('NONVEG')}
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
              >
                🔴 Non-Veg
              </button>
            </div>

            <input
              type="text"
              className="form-control"
              placeholder="🔍 Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '200px', padding: '6px 10px', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Food Items Table */}
      <div className="card">
        <div className="card-header">
          <h3>
            Menu Items ({filteredFoods.length} of {foods.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Changes sync instantly to Customer Mobile App
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th>Price</th>
                <th>Meal Slot</th>
                <th>Diet</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFoods.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No food items match the current filters.
                  </td>
                </tr>
              ) : (
                filteredFoods.map((food) => {
                  const isAvailable = food.isAvailable !== false;
                  return (
                    <tr key={food.id || food._id}>
                      <td>
                        <div className="food-meta">
                          <img
                            src={food.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=100&q=80'}
                            alt={food.name}
                            className="food-thumb"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=100&q=80';
                            }}
                          />
                          <div>
                            <div className="food-title">{food.name}</div>
                            <div className="food-sub">{food.subCategory || food.category} • {food.preparationTime || '15 mins'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{food.category}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '800', fontSize: '15px' }}>₹{food.price}</span>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => handleEditPrice(food)}
                            title="Edit Price"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${food.mealSlot || 'lunch'}`}>
                          {food.mealSlot || 'all-day'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${food.isVeg ? 'badge-veg' : 'badge-nonveg'}`}>
                          {food.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            color: isAvailable ? '#15803d' : '#dc2626',
                            background: isAvailable ? '#dcfce7' : '#fee2e2',
                            borderColor: isAvailable ? '#86efac' : '#fca5a5',
                          }}
                          onClick={() => onToggleAvailability(food.id || food._id)}
                        >
                          {isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleEditPrice(food)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}
                            onClick={() => onDeleteFood(food.id || food._id, food.name)}
                          >
                            Delete
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
      </div>
    </div>
  );
};
