const dataStore = require('../storage/dataStore');
const Food = require('../models/Food');
const mongoose = require('mongoose');

function formatFoodDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: obj.id || String(obj._id),
    _id: obj._id,
    name: obj.name,
    description: obj.description || '',
    portion: obj.portion || 'Standard Serving',
    price: Number(obj.price) || 0,
    isVeg: Boolean(obj.isVeg),
    category: (obj.category || 'lunch').toLowerCase(),
    subCategory: obj.subCategory || 'General',
    availableQuantity: Number(obj.availableQuantity) || 50,
    isAvailable: obj.isAvailable !== undefined ? Boolean(obj.isAvailable) : true,
    image: obj.image || '',
    rating: Number(obj.rating) || 4.8,
    createdAt: obj.createdAt
  };
}

const getAvailableFood = async (filter = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const query = { isAvailable: true };
      if (filter.category && filter.category !== 'all') {
        query.category = new RegExp('^' + filter.category + '$', 'i');
      }
      if (filter.subCategory) {
        query.subCategory = new RegExp('^' + filter.subCategory + '$', 'i');
      }
      if (filter.isVeg !== undefined) {
        query.isVeg = String(filter.isVeg) === 'true';
      }
      if (filter.search) {
        const q = filter.search.trim();
        query.$or = [
          { name: new RegExp(q, 'i') },
          { description: new RegExp(q, 'i') }
        ];
      }

      const mongoFoods = await Food.find(query).sort({ createdAt: -1 });
      if (mongoFoods && mongoFoods.length > 0) {
        return mongoFoods.map(formatFoodDoc);
      }
    } catch (e) {
      console.warn('[FOOD] MongoDB food query fallback:', e.message);
    }
  }

  return dataStore.getFoods({ ...filter, isAvailable: true });
};

const getAllFood = async (filter = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const query = {};
      if (filter.category && filter.category !== 'all') {
        query.category = new RegExp('^' + filter.category + '$', 'i');
      }
      if (filter.subCategory) {
        query.subCategory = new RegExp('^' + filter.subCategory + '$', 'i');
      }
      if (filter.isVeg !== undefined) {
        query.isVeg = String(filter.isVeg) === 'true';
      }
      if (filter.isAvailable !== undefined) {
        query.isAvailable = String(filter.isAvailable) === 'true';
      }
      if (filter.search) {
        const q = filter.search.trim();
        query.$or = [
          { name: new RegExp(q, 'i') },
          { description: new RegExp(q, 'i') }
        ];
      }

      const mongoFoods = await Food.find(query).sort({ createdAt: -1 });
      if (mongoFoods && mongoFoods.length > 0) {
        return mongoFoods.map(formatFoodDoc);
      }
    } catch (e) {
      console.warn('[FOOD] MongoDB getAllFood fallback:', e.message);
    }
  }

  return dataStore.getFoods(filter);
};

const getFoodById = async (id) => {
  if (!id) return null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const food = await Food.findOne({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { id: id }
        ]
      });
      if (food) return formatFoodDoc(food);
    } catch (e) {
      console.warn('[FOOD] MongoDB getFoodById fallback:', e.message);
    }
  }

  return dataStore.getFoodById(id);
};

const addFood = async (foodData) => {
  const { name, price, category } = foodData;
  if (!name || price === undefined || !category) {
    const error = new Error('Name, price and category (Breakfast/Lunch/Dinner/Snacks) are required');
    error.statusCode = 400;
    throw error;
  }

  const foodObj = {
    id: foodData.id || ('food-' + Date.now()),
    name: foodData.name.trim(),
    description: foodData.description || '',
    portion: foodData.portion || 'Standard Serving',
    price: Number(foodData.price) || 0,
    category: (foodData.category || 'lunch').toLowerCase(),
    subCategory: foodData.subCategory || 'General',
    isVeg: foodData.isVeg !== undefined ? Boolean(foodData.isVeg) : true,
    availableQuantity: Number(foodData.availableQuantity) || 50,
    image: foodData.image || 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
    rating: Number(foodData.rating) || 4.8,
    isAvailable: foodData.isAvailable !== undefined ? Boolean(foodData.isAvailable) : true
  };

  let savedFood = null;

  // Primary: Save to MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      const mongoFood = await Food.create(foodObj);
      savedFood = formatFoodDoc(mongoFood);
    } catch (e) {
      console.warn('[FOOD] MongoDB addFood error:', e.message);
    }
  }

  // Dual-store synchronization
  const jsonFood = dataStore.saveFood(foodObj);
  return savedFood || jsonFood;
};

const updateFood = async (id, updates) => {
  if (!id) {
    const error = new Error('Food ID is required');
    error.statusCode = 400;
    throw error;
  }

  let updatedFood = null;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const mongoUpdated = await Food.findOneAndUpdate(
        {
          $or: [
            ...(isObjectId ? [{ _id: id }] : []),
            { id: id }
          ]
        },
        { $set: updates },
        { new: true }
      );
      if (mongoUpdated) {
        updatedFood = formatFoodDoc(mongoUpdated);
      }
    } catch (e) {
      console.warn('[FOOD] MongoDB updateFood warning:', e.message);
    }
  }

  const jsonUpdated = dataStore.updateFood(id, updates);
  if (!updatedFood && !jsonUpdated) {
    const error = new Error('Food item not found');
    error.statusCode = 404;
    throw error;
  }

  return updatedFood || jsonUpdated;
};

const deleteFood = async (id) => {
  if (!id) {
    const error = new Error('Food ID is required');
    error.statusCode = 400;
    throw error;
  }

  let deleted = false;

  if (mongoose.connection.readyState === 1) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const res = await Food.findOneAndDelete({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { id: id }
        ]
      });
      if (res) deleted = true;
    } catch (e) {
      console.warn('[FOOD] MongoDB deleteFood warning:', e.message);
    }
  }

  const jsonDeleted = dataStore.deleteFood(id);
  if (!deleted && !jsonDeleted) {
    const error = new Error('Food item not found');
    error.statusCode = 404;
    throw error;
  }

  return true;
};

module.exports = {
  getAvailableFood,
  getAllFood,
  getFoodById,
  addFood,
  updateFood,
  deleteFood
};
