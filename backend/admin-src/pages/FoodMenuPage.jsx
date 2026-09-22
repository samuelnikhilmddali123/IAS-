import React, { useState } from 'react';
import '../styles/admin.css';

export const FoodMenuPage = ({
  foods = [],
  onOpenAddFood,
  onToggleAvailability,
  onDeleteFood,
  onUpdateFoodPrice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [slotTab, setSlotTab] = useState('ALL'); // 'ALL', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // 'ALL', 'IN_STOCK', 'OUT_OF_STOCK'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  // Live KPI Calculations from actual foods
  const totalItems = foods.length;
  const vegItems = foods.filter((f) => f.isVeg !== false).length;
  const nonVegItems = foods.filter((f) => f.isVeg === false).length;
  const beverageOrSnacksItems = foods.filter((f) => {
    const c = (f.category || '').toLowerCase();
    const s = (f.mealSlot || '').toLowerCase();
    return c === 'beverages' || c === 'snacks' || s === 'snacks';
  }).length;

  const vegPct = totalItems > 0 ? Math.round((vegItems / totalItems) * 100) : 0;
  const nonVegPct = totalItems > 0 ? Math.round((nonVegItems / totalItems) * 100) : 0;
  const bevPct = totalItems > 0 ? Math.round((beverageOrSnacksItems / totalItems) * 100) : 0;

  // Filter logic
  const filteredFoods = foods.filter((food) => {
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (food.name || '').toLowerCase().includes(q);
      const matchCat = (food.category || '').toLowerCase().includes(q);
      const matchDesc = (food.description || food.portion || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }

    // Slot Tab
    if (slotTab !== 'ALL') {
      const slot = (food.mealSlot || '').toLowerCase();
      const cat = (food.category || '').toLowerCase();
      if (slotTab === 'BREAKFAST' && slot !== 'breakfast' && cat !== 'breakfast') return false;
      if (slotTab === 'LUNCH' && slot !== 'lunch' && cat !== 'lunch') return false;
      if (slotTab === 'DINNER' && slot !== 'dinner' && cat !== 'dinner') return false;
      if (slotTab === 'SNACKS' && slot !== 'snacks' && cat !== 'snacks' && cat !== 'beverages') return false;
    }

    // Category dropdown filter
    if (categoryFilter !== 'ALL') {
      if ((food.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // Availability filter
    if (availabilityFilter === 'IN_STOCK' && food.isAvailable === false) return false;
    if (availabilityFilter === 'OUT_OF_STOCK' && food.isAvailable !== false) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedFoods = filteredFoods.slice(startIndex, startIndex + itemsPerPage);

  const startEditPrice = (food) => {
    setEditingPriceId(food.id || food._id);
    setEditPriceVal(food.price || 0);
  };

  const saveEditPrice = (foodId) => {
    const p = parseFloat(editPriceVal);
    if (!isNaN(p) && p >= 0) {
      onUpdateFoodPrice(foodId, p);
    }
    setEditingPriceId(null);
  };

  return (
    <div className="page-food-menu-redesign">
      {/* 1. Header Banner with Quote, Culinary Image & Add Button */}
      <section className="food-menu-header-banner">
        <div className="menu-header-left">
          <h1 className="menu-page-title">Food Menu & Dishes</h1>
          <p className="menu-page-sub">
            Manage daily items categorized by Breakfast, Lunch, Dinner, and Snacks
          </p>
        </div>

        <div className="menu-header-right">
          <div className="culinary-quote-box">
            <span className="culinary-quote-text">“Good food fuels greater service.”</span>
            <div className="hero-quote-bar">
              <span className="bar-orange"></span>
              <span className="bar-green"></span>
            </div>
          </div>

          <div className="header-culinary-img-wrap">
            <img
              src="/admin/assets/food_menu_banner.jpg"
              alt="Kitchen Buffet"
              className="header-culinary-img"
            />
          </div>

          <button
            type="button"
            className="btn-add-food-main"
            onClick={onOpenAddFood}
          >
            <span className="plus-sign">+</span>
            <span>Add New Food Item</span>
          </button>
        </div>
      </section>

      {/* 2. Top 4 KPI Stat Cards */}
      <section className="food-kpi-grid">
        {/* KPI 1: Total Food Items */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-mint">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2v8a3 3 0 0 1-3 3h-1v9h-2v-9h-1a3 3 0 0 1-3-3V2"></path>
              <line x1="12" y1="2" x2="12" y2="7"></line>
              <line x1="8" y1="2" x2="8" y2="7"></line>
              <line x1="16" y1="2" x2="16" y2="7"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{totalItems}</div>
            <div className="kpi-lbl">Total Food Items</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> +3 added this week
            </div>
          </div>
        </div>

        {/* KPI 2: Veg Items */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-amber-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10s10-4.48 10-10"></path>
              <path d="M12 2v10l8 4"></path>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{vegItems}</div>
            <div className="kpi-lbl">Veg Items</div>
            <div className="kpi-note text-emerald">
              <span className="dot-mini bg-emerald"></span> {vegPct}% of menu
            </div>
          </div>
        </div>

        {/* KPI 3: Non-Veg Items */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-rose-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M9 12a3 3 0 0 0 6 0"></path>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{nonVegItems}</div>
            <div className="kpi-lbl">Non-Veg Items</div>
            <div className="kpi-note text-rose">
              <span className="dot-mini bg-rose"></span> {nonVegPct}% of menu
            </div>
          </div>
        </div>

        {/* KPI 4: Beverages / Others */}
        <div className="food-kpi-card">
          <div className="kpi-icon-square bg-purple-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </div>
          <div className="kpi-body">
            <div className="kpi-val">{beverageOrSnacksItems}</div>
            <div className="kpi-lbl">Beverages / Others</div>
            <div className="kpi-note text-rose">
              <span className="dot-mini bg-rose"></span> {bevPct}% of menu
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filters & Controls Row */}
      <section className="food-controls-bar">
        {/* Left Segmented Tab Pills */}
        <div className="slot-tabs-group">
          <button
            type="button"
            className={`slot-tab-pill ${slotTab === 'ALL' ? 'active' : ''}`}
            onClick={() => { setSlotTab('ALL'); setCurrentPage(1); }}
          >
            All Items
          </button>
          <button
            type="button"
            className={`slot-tab-pill ${slotTab === 'BREAKFAST' ? 'active' : ''}`}
            onClick={() => { setSlotTab('BREAKFAST'); setCurrentPage(1); }}
          >
            Breakfast
          </button>
          <button
            type="button"
            className={`slot-tab-pill ${slotTab === 'LUNCH' ? 'active' : ''}`}
            onClick={() => { setSlotTab('LUNCH'); setCurrentPage(1); }}
          >
            Lunch
          </button>
          <button
            type="button"
            className={`slot-tab-pill ${slotTab === 'DINNER' ? 'active' : ''}`}
            onClick={() => { setSlotTab('DINNER'); setCurrentPage(1); }}
          >
            Dinner
          </button>
          <button
            type="button"
            className={`slot-tab-pill ${slotTab === 'SNACKS' ? 'active' : ''}`}
            onClick={() => { setSlotTab('SNACKS'); setCurrentPage(1); }}
          >
            Snacks / Beverages
          </button>
        </div>

        {/* Right Filter Dropdowns & Search */}
        <div className="table-controls-right">
          <div className="select-wrapper">
            <select
              className="control-select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Categories</option>
              <option value="meals">Meals</option>
              <option value="tiffins">Tiffins</option>
              <option value="beverages">Beverages</option>
              <option value="snacks">Snacks</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select
              className="control-select"
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Availability: All</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div className="table-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="table-search-input"
            />
          </div>
        </div>
      </section>

      {/* 4. Dishes Table */}
      <section className="food-table-container card">
        <div className="table-responsive">
          <table className="food-dishes-table food-data-table">
            <thead>
              <tr>
                <th>DISH DETAILS</th>
                <th>CATEGORY</th>
                <th>PORTION / DESCRIPTION</th>
                <th>PRICE (₹)</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedFoods.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-cell" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No food items match your filter criteria.
                  </td>
                </tr>
              ) : (
                displayedFoods.map((food) => {
                  const foodId = food.id || food._id;
                  const isAvailable = food.isAvailable !== false;
                  const slotStr = (food.mealSlot || food.category || 'General').toLowerCase();

                  let slotClass = 'pill-slot-lunch';
                  if (slotStr.includes('dinner')) slotClass = 'pill-slot-dinner';
                  if (slotStr.includes('breakfast')) slotClass = 'pill-slot-breakfast';
                  if (slotStr.includes('snack') || slotStr.includes('bev')) slotClass = 'pill-slot-snacks';

                  return (
                    <tr key={foodId}>
                      {/* Dish Details */}
                      <td className="cell-dish-details">
                        <div className="dish-details-row dish-cell-wrapper">
                          <img
                            src={food.imageUrl || food.image || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&h=100&fit=crop&q=80'}
                            alt={food.name}
                            className="dish-square-thumb dish-table-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&h=100&fit=crop&q=80';
                            }}
                          />
                          <div className="dish-text-meta">
                            <span className="dish-name-bold">{food.name}</span>
                            <div className="dish-sub-info dish-cuisine-sub">
                              <span>{food.subCategory || food.category || 'Special'}</span>
                              <span className="dot-divider">•</span>
                              <span className={food.isVeg !== false ? 'tag-veg' : 'tag-nonveg'}>
                                {food.isVeg !== false ? '🟢 Veg' : '🔴 Non-Veg'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="cell-category">
                        <span className={`pill-slot ${slotClass}`}>
                          {food.mealSlot ? food.mealSlot.charAt(0).toUpperCase() + food.mealSlot.slice(1) : (food.category || 'General')}
                        </span>
                      </td>

                      {/* Portion / Description */}
                      <td className="cell-portion">
                        {food.portion || food.description || 'Full Portion'}
                      </td>

                      {/* Price (₹) with inline quick edit */}
                      <td className="cell-price">
                        {editingPriceId === foodId ? (
                          <div className="inline-edit-price-box">
                            <input
                              type="number"
                              className="edit-price-input"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn-save-price"
                              onClick={() => saveEditPrice(foodId)}
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <span className="price-bold">₹{food.price}</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="cell-stock cell-stock-count">
                        {food.stock || 40}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="cell-status">
                        <button
                          type="button"
                          className={`btn-stock-status btn-stock-toggle ${isAvailable ? 'in-stock' : 'out-of-stock out-stock'}`}
                          onClick={() => onToggleAvailability(foodId)}
                          title="Click to toggle availability"
                        >
                          <span className="status-icon">{isAvailable ? '✓' : '✕'}</span>
                          <span>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="cell-actions" style={{ textAlign: 'right' }}>
                        <div className="actions-inline-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => startEditPrice(food)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={() => onDeleteFood(foodId, food.name)}
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

        {/* 5. Pagination Footer */}
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing {filteredFoods.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredFoods.length)} of {filteredFoods.length} items
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
    </div>
  );
};
