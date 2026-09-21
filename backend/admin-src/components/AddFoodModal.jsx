import React, { useState } from 'react';

export const AddFoodModal = ({ isOpen, onClose, onAddFood }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Meals');
  const [subCategory, setSubCategory] = useState('North Indian');
  const [price, setPrice] = useState('');
  const [preparationTime, setPreparationTime] = useState('15 mins');
  const [mealSlot, setMealSlot] = useState('lunch');
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80');

  const [searchingImages, setSearchingImages] = useState(false);
  const [searchedImages, setSearchedImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSearchGoogleImages = async () => {
    if (!name.trim()) {
      alert('Please enter a dish name first to search images.');
      return;
    }
    setSearchingImages(true);
    try {
      const res = await fetch(`/search-officer?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.success && data.images && data.images.length > 0) {
        setSearchedImages(data.images);
      } else {
        alert('No online images found for this dish name.');
      }
    } catch (e) {
      alert('Error querying image search proxy.');
    } finally {
      setSearchingImages(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      alert('Name and price are required.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddFood({
        name: name.trim(),
        category,
        subCategory,
        price: parseFloat(price),
        preparationTime,
        mealSlot,
        isVeg,
        description: description.trim() || `${name.trim()} prepared fresh in government canteen style.`,
        image: imageUrl.trim() || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80'
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save food item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🍲 Add New Food Item</h3>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Dish Name *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Masala Dosa, Dal Makhani"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-outline"
                style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '12px' }}
                onClick={handleSearchGoogleImages}
                disabled={searchingImages}
                title="Search photo online"
              >
                {searchingImages ? 'Searching...' : '🔍 Search Photo'}
              </button>
            </div>
          </div>

          {searchedImages.length > 0 && (
            <div className="form-group">
              <label>Select Photo from Search Results:</label>
              <div className="search-images-grid">
                {searchedImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.thumbnail || img.original}
                    alt={img.title}
                    className={`search-image-item ${imageUrl === (img.original || img.thumbnail) ? 'selected' : ''}`}
                    onClick={() => setImageUrl(img.original || img.thumbnail)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Meals">Meals</option>
                <option value="Tiffins">Tiffins</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Sweets">Sweets</option>
                <option value="Specials">Specials</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-control"
                placeholder="60"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Meal Slot *</label>
              <select className="form-control" value={mealSlot} onChange={(e) => setMealSlot(e.target.value)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="all-day">All Day</option>
              </select>
            </div>
            <div className="form-group">
              <label>Prep Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="15 mins"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontWeight: '700', color: isVeg ? '#15803d' : '#dc2626' }}>
                {isVeg ? '🟢 Vegetarian Dish' : '🔴 Non-Vegetarian Dish'}
              </span>
            </label>
          </div>

          <div className="form-group">
            <label>Photo Image URL</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl ? (
              <img src={imageUrl} alt="Dish preview" className="img-preview" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save & Add Dish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
