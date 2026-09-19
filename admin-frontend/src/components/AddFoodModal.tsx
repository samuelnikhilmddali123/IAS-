import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

export const AddFoodModal: React.FC = () => {
  const {
    API_BASE,
    isAddFoodModalOpen,
    editingFoodItem,
    closeAddFoodModal,
    showToast,
    refreshAllData,
  } = useAdmin();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('lunch');
  const [subCategory, setSubCategory] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [qty, setQty] = useState<number>(50);
  const [portion, setPortion] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState(
    'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=150&q=80'
  );

  useEffect(() => {
    if (editingFoodItem) {
      setName(editingFoodItem.name || '');
      setCategory((editingFoodItem.category || 'lunch').toLowerCase());
      setSubCategory(editingFoodItem.subCategory || '');
      setPrice(editingFoodItem.price || '');
      setQty(editingFoodItem.availableQuantity ?? 50);
      setPortion(editingFoodItem.portion || '');
      setIsVeg(editingFoodItem.isVeg ?? true);
      setImage(editingFoodItem.image || '');
      setImagePreview(
        editingFoodItem.image ||
          'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=150&q=80'
      );
    } else {
      setName('');
      setCategory('breakfast');
      setSubCategory('');
      setPrice('');
      setQty(50);
      setPortion('');
      setIsVeg(true);
      setImage('');
      setImagePreview(
        'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=150&q=80'
      );
    }
  }, [editingFoodItem, isAddFoodModalOpen]);

  if (!isAddFoodModalOpen) return null;

  const handleImageUrlChange = (url: string) => {
    setImage(url);
    setImagePreview(
      url ||
        'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=150&q=80'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      try {
        const res = await fetch(`${API_BASE}/api/foods/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, imageName: file.name }),
        });
        const data = await res.json();
        if (data.success && data.imageUrl) {
          setImage(data.imageUrl);
          showToast('Image uploaded successfully');
        }
      } catch (err) {
        console.error('Image upload failed, using local preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const foodData = {
      name,
      category,
      subCategory,
      price: Number(price),
      availableQuantity: Number(qty),
      portion,
      isVeg,
      image: image || imagePreview,
    };

    try {
      if (editingFoodItem) {
        await fetch(`${API_BASE}/api/foods/${editingFoodItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foodData),
        });
        showToast('Food item updated successfully');
      } else {
        await fetch(`${API_BASE}/api/foods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foodData),
        });
        showToast('New food item added to menu');
      }
      closeAddFoodModal();
      await refreshAllData();
    } catch (err) {
      showToast('Error saving food item');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{editingFoodItem ? 'Edit Food Item' : 'Add New Food Item'}</h3>
          <button className="close-btn" onClick={closeAddFoodModal}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Dish Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Masala Dosa, Paneer Butter Masala"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Meal Slot / Category *</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snacks">Snacks / Beverages</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sub-Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. South Indian, Healthy"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                className="form-control"
                placeholder="40"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label>Available Quantity</label>
              <input
                type="number"
                className="form-control"
                placeholder="50"
                min="0"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Portion / Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 2 pcs with Sambar & Chutney"
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Dietary Type</label>
              <select
                className="form-control"
                value={isVeg ? 'true' : 'false'}
                onChange={(e) => setIsVeg(e.target.value === 'true')}
              >
                <option value="true">🟢 Vegetarian</option>
                <option value="false">🔴 Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Dish Image URL</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://images.unsplash.com/..."
              value={image}
              onChange={(e) => handleImageUrlChange(e.target.value)}
            />
            <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Or upload image file:{' '}
              <input type="file" accept="image/*" onChange={handleFileUpload} />
            </div>
            <img id="image-preview" className="img-preview" src={imagePreview} alt="Preview" />
          </div>

          <div
            className="form-group"
            style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}
          >
            <button type="button" className="btn-outline" onClick={closeAddFoodModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Food Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
