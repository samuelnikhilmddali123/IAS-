const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  addFood,
  getAllFood,
  getAvailableFood,
  getFoodById,
  updateFood,
  deleteFood
} = require('../services/foodService');

const router = express.Router();

// Public: Get menu foods (supports ?category=breakfast|lunch|dinner|snacks, ?isVeg=true, ?search=...)
router.get('/', async (req, res) => {
  try {
    const filter = {
      category: req.query.category,
      subCategory: req.query.subCategory,
      isVeg: req.query.isVeg,
      search: req.query.search
    };
    const food = await getAvailableFood(filter);
    res.json({
      success: true,
      count: food.length,
      food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get all foods (including unavailable)
router.get('/admin', async (req, res) => {
  try {
    const food = await getAllFood();
    res.json({
      success: true,
      count: food.length,
      food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single food by ID
router.get('/:id', async (req, res) => {
  try {
    const food = await getFoodById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }
    res.json({ success: true, food });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add new food item (Used by Admin Dashboard)
router.post('/', async (req, res) => {
  try {
    const food = await addFood(req.body);
    res.status(201).json({
      success: true,
      message: 'Food item added successfully',
      food
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Update food item (edit price, image, toggle availability)
router.put('/:id', async (req, res) => {
  try {
    const food = await updateFood(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Food item updated successfully',
      food
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete food item
router.delete('/:id', async (req, res) => {
  try {
    await deleteFood(req.params.id);
    res.json({
      success: true,
      message: 'Food item deleted successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
});

// Upload food image (Base64 or multipart)
router.post('/upload', async (req, res) => {
  try {
    const { imageBase64, imageName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = (imageName && imageName.includes('.')) ? imageName.split('.').pop() : 'jpg';
    const fileName = 'dish-' + Date.now() + '.' + ext;
    const filePath = path.join(uploadsDir, fileName);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const host = req.get('host') || 'localhost:5001';
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${host}/uploads/${fileName}`;

    res.json({
      success: true,
      imageUrl,
      fileName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
