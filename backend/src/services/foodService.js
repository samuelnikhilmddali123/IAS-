const dataStore = require('../storage/dataStore');
const Food = require('../models/Food');
const mongoose = require('mongoose');

const getAvailableFood = async (filter = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const query = { isAvailable: true };
      if (filter.category && filter.category !== 'all') {
        query.category = new RegExp('^' + filter.category + '$', 'i');
      }
      if (filter.isVeg !== undefined) {
        query.isVeg = String(filter.isVeg) === 'true';
      }
      const mongoFoods = await Food.find(query);
      if (mongoFoods && mongoFoods.length > 0) return mongoFoods;
    } catch (e) {
      console.warn('MongoDB food query fallback:', e.message);
    }
  }
  return dataStore.getFoods({ ...filter, isAvailable: true });
};

const getAllFood = async (filter = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const mongoFoods = await Food.find();
      if (mongoFoods && mongoFoods.length > 0) return mongoFoods;
    } catch (e) {
      console.warn('MongoDB getAllFood fallback:', e.message);
    }
  }
  return dataStore.getFoods(filter);
};

const getFoodById = async (id) => {
  return dataStore.getFoodById(id);
};

const addFood = async (foodData) => {
  const { name, price, category } = foodData;
  if (!name || price === undefined || !category) {
    const error = new Error('Name, price and category (Breakfast/Lunch/Dinner/Snacks) are required');
    error.statusCode = 400;
    throw error;
  }

  // If MongoDB connected, try Mongoose
  if (mongoose.connection.readyState === 1) {
    try {
      await Food.create({
        name: foodData.name,
        description: foodData.description || '',
        portion: foodData.portion || 'Standard Serving',
        price: Number(foodData.price),
        category: foodData.category,
        subCategory: foodData.subCategory || 'General',
        isVeg: foodData.isVeg !== undefined ? Boolean(foodData.isVeg) : true,
        availableQuantity: Number(foodData.availableQuantity) || 50,
        image: foodData.image || '',
        isAvailable: true
      });
    } catch (e) {
      console.warn('MongoDB food add fallback:', e.message);
    }
  }

  return dataStore.saveFood(foodData);
};

const updateFood = async (id, updates) => {
  if (mongoose.connection.readyState === 1) {
    try {
      await Food.findByIdAndUpdate(id, updates);
    } catch (e) {}
  }
  const updated = dataStore.updateFood(id, updates);
  if (!updated) {
    const error = new Error('Food item not found');
    error.statusCode = 404;
    throw error;
  }
  return updated;
};

const deleteFood = async (id) => {
  if (mongoose.connection.readyState === 1) {
    try {
      await Food.findByIdAndDelete(id);
    } catch (e) {}
  }
  const deleted = dataStore.deleteFood(id);
  if (!deleted) {
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
