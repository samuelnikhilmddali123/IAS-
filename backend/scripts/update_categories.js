const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\.png|\.jpg|\.jpeg/gi, '')
    .replace(/-\s*\d+(\s*\(?\w*\)?)?/gi, '')
    .replace(/\([^)]*\)/gi, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

const CATEGORY_MAP = {
  // 1. Soups
  'soups': {
    id: 'soups',
    label: 'Soups',
    items: [
      { name: 'Tomato Soup', isVeg: true },
      { name: 'Sweet Corn Soup', isVeg: true },
      { name: 'Veg Manchow', isVeg: true },
      { name: 'Veg Hot & Sour', isVeg: true },
      { name: 'Lemon Coriander Soup', isVeg: true },
      { name: 'Cream of Mushroom', isVeg: true },
      { name: 'Veg Corn Soup', isVeg: true },
      { name: 'Chicken Sweet Corn', isVeg: false },
      { name: 'Chicken Manchow', isVeg: false },
      { name: 'Chicken Hot & Sour', isVeg: false },
      { name: 'Cream of Chicken', isVeg: false },
      { name: 'Chicken Lemon Coriander Soup', isVeg: false },
      // Variations
      { name: 'Chicken Sweet Corn Soup', isVeg: false },
      { name: 'Chicken Hot & Sour Soup', isVeg: false },
      { name: 'Chicken Manchow Soup', isVeg: false },
      { name: 'Cream of Chicken Soup', isVeg: false },
      { name: 'Veg Manchow Soup', isVeg: true },
      { name: 'Veg Hot & Sour Soup', isVeg: true },
      { name: 'Sweet Corn Veg Soup', isVeg: true },
      { name: 'Cream of Mushroom Soup', isVeg: true }
    ]
  },

  // 2. Salads
  'salads': {
    id: 'salads',
    label: 'Salads',
    items: [
      { name: 'Green Salad', isVeg: true },
      { name: 'Fresh Green Garden Salad', isVeg: true }
    ]
  },

  // 3. Veg Starters
  'veg-starters': {
    id: 'veg-starters',
    label: 'Veg Starters',
    items: [
      { name: 'Onion Pakoda', isVeg: true },
      { name: 'Crispy Onion Pakoda', isVeg: true },
      { name: 'French Fries', isVeg: true },
      { name: 'Golden French Fries', isVeg: true },
      { name: 'Veg Rolls', isVeg: true },
      { name: 'Crispy Veg Rolls (10 pcs)', isVeg: true },
      { name: 'Veg Lollipops', isVeg: true },
      { name: 'Veg Cutlets', isVeg: true },
      { name: 'Crispy Veg Cutlets (10 pcs)', isVeg: true },
      { name: 'Veg Fingers', isVeg: true },
      { name: 'Veg Crispy Fingers (10 pcs)', isVeg: true },
      { name: 'Potato Cheese Balls', isVeg: true },
      { name: 'Potato Cheese Balls (10 pcs)', isVeg: true },
      { name: 'Aloo Tikki', isVeg: true },
      { name: 'Aloo Tikki (10 pcs)', isVeg: true },
      { name: 'Hara Bhara Kebab', isVeg: true },
      { name: 'Hara Bhara Kabab (10 pcs)', isVeg: true },
      { name: 'Veg Satay', isVeg: true },
      { name: 'Boiled Corn', isVeg: true },
      { name: 'Steamed Sweet Corn', isVeg: true },
      { name: 'Corn Rolls', isVeg: true },
      { name: 'Crispy Corn Rolls (10 pcs)', isVeg: true },
      { name: 'Veg Manchuria', isVeg: true },
      { name: 'Veg Manchurian', isVeg: true },
      { name: 'Crispy Veg', isVeg: true },
      { name: 'Crispy Fried Veggies', isVeg: true },
      { name: 'Crispy Corn', isVeg: true },
      { name: 'Crispy Sweet Corn', isVeg: true },
      { name: 'Crispy Fried Corn', isVeg: true },
      { name: 'Gobi Manchuria', isVeg: true },
      { name: 'Gobi Manchurian', isVeg: true },
      { name: 'Gobi 65', isVeg: true },
      { name: 'Gobi Chilli', isVeg: true },
      { name: 'Chilli Gobi', isVeg: true },
      { name: 'Baby Corn Manchuria', isVeg: true },
      { name: 'Baby Corn Manchurian', isVeg: true },
      { name: 'Baby Corn 65', isVeg: true },
      { name: 'Baby Corn Chilli', isVeg: true },
      { name: 'Chilli Baby Corn', isVeg: true },
      { name: 'Crispy Baby Corn', isVeg: true },
      { name: 'Crispy Baby Corn 65', isVeg: true },
      { name: 'Golden Fried Baby Corn', isVeg: true },
      { name: 'Crispy Golden Baby Corn', isVeg: true },
      { name: 'Mushroom Manchuria', isVeg: true },
      { name: 'Mushroom Manchurian', isVeg: true },
      { name: 'Mushroom 65', isVeg: true },
      { name: 'Mushroom Chilli', isVeg: true },
      { name: 'Chilli Mushroom', isVeg: true },
      { name: 'Loose Mushroom', isVeg: true },
      { name: 'Loose Crispy Mushroom', isVeg: true },
      { name: 'Crispy Loose Mushroom', isVeg: true },
      { name: 'Mushroom Pakoda', isVeg: true },
      { name: 'Butter Garlic Mushroom', isVeg: true }
    ]
  },

  // 4. Paneer Starters
  'paneer-starters': {
    id: 'paneer-starters',
    label: 'Paneer Starters',
    items: [
      { name: 'Paneer Rolls', isVeg: true },
      { name: 'Paneer Spring Rolls (10 pcs)', isVeg: true },
      { name: 'Paneer Manchuria', isVeg: true },
      { name: 'Paneer Manchurian', isVeg: true },
      { name: 'Paneer 65', isVeg: true },
      { name: 'Paneer Chilli', isVeg: true },
      { name: 'Chilli Paneer', isVeg: true },
      { name: 'Crispy Paneer', isVeg: true },
      { name: 'Crispy Paneer Bites', isVeg: true },
      { name: 'Paneer Stick', isVeg: true },
      { name: 'Paneer Sticks', isVeg: true },
      { name: 'Honey Lemon Paneer', isVeg: true },
      { name: 'Honey Lemon Glazed Paneer', isVeg: true },
      { name: 'Paneer Veg Satay Skewers', isVeg: true }
    ]
  },

  // 5. Egg Starters
  'egg-starters': {
    id: 'egg-starters',
    label: 'Egg Starters',
    items: [
      { name: 'Masala Omelet', isVeg: false },
      { name: 'Masala Omelette', isVeg: false },
      { name: 'Cheese Omelet', isVeg: false },
      { name: 'Cheese Omelette', isVeg: false },
      { name: 'Cheese Loaded Omelette', isVeg: false },
      { name: 'Egg 65', isVeg: false },
      { name: 'Egg Bhurji', isVeg: false },
      { name: 'Egg Bhurji (Scrambled)', isVeg: false },
      { name: 'Homestyle Egg Curry', isVeg: false },
      { name: 'Egg Palak Curry', isVeg: false }
    ]
  },

  // 6. Chicken Starters
  'chicken-starters': {
    id: 'chicken-starters',
    label: 'Chicken Starters',
    items: [
      { name: 'Chilli Chicken', isVeg: false },
      { name: 'Chilli Chicken Dry', isVeg: false },
      { name: 'Pepper Chicken', isVeg: false },
      { name: 'Pepper Chicken Dry', isVeg: false },
      { name: 'Chicken 65', isVeg: false },
      { name: 'Chicken Manchuria', isVeg: false },
      { name: 'Chicken Manchurian', isVeg: false },
      { name: 'Chicken 555', isVeg: false },
      { name: 'Crispy Chicken 555', isVeg: false },
      { name: 'Chicken Majestic', isVeg: false },
      { name: 'Hyderabad Chicken Majestic', isVeg: false },
      { name: 'Crispy Chicken', isVeg: false },
      { name: 'Crispy Fried Chicken', isVeg: false },
      { name: 'Rajadhani Chicken', isVeg: false },
      { name: 'Rajadhani Special Chicken', isVeg: false },
      { name: 'Lemon Chicken', isVeg: false },
      { name: 'Tangy Lemon Chicken', isVeg: false },
      { name: 'Dragon Chicken', isVeg: false },
      { name: 'Fiery Dragon Chicken', isVeg: false },
      { name: 'Loose Chicken', isVeg: false },
      { name: 'Crispy Loose Chicken', isVeg: false },
      { name: 'Chicken Garlic/Ginger', isVeg: false },
      { name: 'Chicken Garlic Ginger', isVeg: false },
      { name: 'Garlic Ginger Chicken', isVeg: false },
      { name: 'Ginger Garlic Chicken', isVeg: false },
      { name: 'Schezwan Chicken', isVeg: false },
      { name: 'Chicken Pakoda', isVeg: false },
      { name: 'Crispy Chicken Pakoda', isVeg: false },
      { name: 'Cashew Chicken', isVeg: false },
      { name: 'Kaju Cashew Chicken', isVeg: false },
      { name: 'Chicken Drumsticks', isVeg: false },
      { name: 'Crispy Chicken Drumsticks (4 pcs)', isVeg: false },
      { name: 'Chicken Wings', isVeg: false },
      { name: 'Spicy Chicken Wings (6 pcs)', isVeg: false },
      { name: 'Chicken Lollipop', isVeg: false },
      { name: 'Chicken Lollipop (6 pcs)', isVeg: false },
      { name: 'Amrut Chicken', isVeg: false },
      { name: 'Amrut Special Chicken', isVeg: false },
      { name: 'Amrut Signature Chicken Special', isVeg: false },
      { name: 'Crunchy Chicken', isVeg: false },
      { name: 'Crunchy Crusted Chicken', isVeg: false },
      { name: 'Thread Chicken', isVeg: false },
      { name: 'Crispy Thread Wrapped Chicken', isVeg: false },
      { name: 'Dream Nut Chicken', isVeg: false },
      { name: 'Apollo Chicken', isVeg: false },
      { name: 'Cream Chicken', isVeg: false },
      { name: 'Salt & Pepper Chicken', isVeg: false },
      { name: 'Salt & Pepper Chicken Dry', isVeg: false },
      { name: 'Goa Chicken', isVeg: false },
      { name: 'Chicken Gulazara', isVeg: false },
      { name: 'Chicken Gulzara Special', isVeg: false }
    ]
  },

  // 7. Fish & Prawns Starters
  'fish-prawns-starters': {
    id: 'fish-prawns-starters',
    label: 'Fish & Prawns Starters',
    items: [
      { name: 'Apollo Crispy Fish', isVeg: false },
      { name: 'Crispy Apollo Fish', isVeg: false },
      { name: 'Chilli Apollo Fish', isVeg: false },
      { name: 'Apollo Fry', isVeg: false },
      { name: 'Apollo Fish Fry', isVeg: false },
      { name: 'Loose Prawns', isVeg: false },
      { name: 'Crispy Loose Prawns', isVeg: false },
      { name: 'Chilli Prawns', isVeg: false },
      { name: 'Prawns 65', isVeg: false },
      { name: 'Crispy Prawns 65', isVeg: false }
    ]
  },

  // 8. Chicken Curries
  'chicken-curries': {
    id: 'chicken-curries',
    label: 'Chicken Curries',
    items: [
      { name: 'Methi Chicken Curry', isVeg: false },
      { name: 'Butter Chicken Curry', isVeg: false },
      { name: 'Butter Chicken Masala', isVeg: false },
      { name: 'Kadai Chicken Curry', isVeg: false },
      { name: 'Afghani Chicken Curry', isVeg: false },
      { name: 'Afghani Chicken Gravy', isVeg: false },
      { name: 'Maharani Chicken Curry', isVeg: false },
      { name: 'Kolhapuri Chicken Curry', isVeg: false },
      { name: 'Malai Chicken Curry', isVeg: false },
      { name: 'Murgh Malai Chicken Curry', isVeg: false },
      { name: 'Creamy Rich Malai Chicken', isVeg: false },
      { name: 'Punjabi Chicken Curry', isVeg: false },
      { name: 'Punjabi Dhaba Chicken Curry', isVeg: false },
      { name: 'Kaju Chicken Curry', isVeg: false },
      { name: 'Kaju Cashew Chicken Curry', isVeg: false },
      { name: 'Special Chicken Curry', isVeg: false },
      { name: 'Special Andhra Chicken Curry', isVeg: false },
      { name: 'Chicken Kali Mirchi', isVeg: false },
      { name: 'Chicken Kali Mirchi (Bone-in)', isVeg: false },
      { name: 'Dum Chicken Curry', isVeg: false },
      { name: 'Dum Chicken Masala', isVeg: false },
      { name: 'Natukodi Curry', isVeg: false },
      { name: 'Country Chicken Natukodi Curry', isVeg: false },
      { name: 'Goan Style Chicken Curry', isVeg: false }
    ]
  },

  // 9. Mutton Curries
  'mutton-curries': {
    id: 'mutton-curries',
    label: 'Mutton Curries',
    items: [
      { name: 'Mutton Curry', isVeg: false },
      { name: 'Tender Mutton Curry', isVeg: false },
      { name: 'Mutton Fry', isVeg: false },
      { name: 'Spicy Mutton Fry', isVeg: false },
      { name: 'Mutton Keema Curry', isVeg: false },
      { name: 'Mutton Keema Masala', isVeg: false },
      { name: 'Natukodi Fry', isVeg: false },
      { name: 'Country Chicken Natukodi Fry', isVeg: false }
    ]
  },

  // 10. Fish & Prawns Curries
  'fish-prawns-curries': {
    id: 'fish-prawns-curries',
    label: 'Fish & Prawns Curries',
    items: [
      { name: 'Apollo Fish Curry', isVeg: false },
      { name: 'Apollo Fish Masala Curry', isVeg: false },
      { name: 'Prawns Curry', isVeg: false },
      { name: 'Coastal Prawns Masala Curry', isVeg: false }
    ]
  },

  // 11. Veg Main Course / Curries
  'veg-curries': {
    id: 'veg-curries',
    label: 'Veg Main Course / Curries',
    items: [
      { name: 'Dal Fry', isVeg: true },
      { name: 'Dal Tadka', isVeg: true },
      { name: 'Yellow Dal Tadka', isVeg: true },
      { name: 'Dal Makhani', isVeg: true },
      { name: 'Plain Palak', isVeg: true },
      { name: 'Homestyle Plain Palak Curry', isVeg: true },
      { name: 'Homestyle Palak Curry', isVeg: true },
      { name: 'Aloo Palak', isVeg: true },
      { name: 'Aloo Palak Curry', isVeg: true },
      { name: 'Palak Paneer', isVeg: true },
      { name: 'Chana Masala', isVeg: true },
      { name: 'Punjabi Chana Masala', isVeg: true },
      { name: 'Aloo Chana Masala', isVeg: true },
      { name: 'Mushroom Curry', isVeg: true },
      { name: 'Mushroom Masala Curry', isVeg: true },
      { name: 'Aloo Mutter Curry', isVeg: true },
      { name: 'Aloo Matar Masala', isVeg: true },
      { name: 'Kadai Veg Curry', isVeg: true },
      { name: 'Mixed Veg Curry', isVeg: true },
      { name: 'Tomato Cashew Curry', isVeg: true },
      { name: 'Tomato Kaju Cashew Curry', isVeg: true },
      { name: 'Malai Kofta', isVeg: true },
      { name: 'Shahi Malai Kofta', isVeg: true },
      { name: 'Paneer Butter Masala', isVeg: true },
      { name: 'Methi Chaman', isVeg: true },
      { name: 'Kashmiri Methi Chaman', isVeg: true },
      { name: 'Kadai Paneer Curry', isVeg: true },
      { name: 'Kadai Paneer Masala', isVeg: true }
    ]
  },

  // 12. Rice & Fried Rice – Veg
  'rice-veg': {
    id: 'rice-veg',
    label: 'Rice & Fried Rice – Veg',
    items: [
      { name: 'Plain Rice', isVeg: true },
      { name: 'Steamed Basmati Rice', isVeg: true },
      { name: 'Jeera Rice', isVeg: true },
      { name: 'Fragrant Jeera Rice', isVeg: true },
      { name: 'Biryani Rice', isVeg: true },
      { name: 'Kuska Biryani Rice', isVeg: true },
      { name: 'Veg Fried Rice', isVeg: true },
      { name: 'Paneer Fried Rice', isVeg: true },
      { name: 'Curd Rice', isVeg: true },
      { name: 'Tempered Curd Rice', isVeg: true }
    ]
  },

  // 13. Rice & Fried Rice – Non-Veg
  'rice-non-veg': {
    id: 'rice-non-veg',
    label: 'Rice & Fried Rice – Non-Veg',
    items: [
      { name: 'Chicken Fried Rice', isVeg: false },
      { name: 'Schezwan Chicken Fried Rice', isVeg: false },
      { name: 'Mixed Non-Veg Fried Rice', isVeg: false },
      { name: 'Prawns Fried Rice', isVeg: false },
      { name: 'Egg Fried Rice', isVeg: false }
    ]
  },

  // 14. Noodles
  'noodles': {
    id: 'noodles',
    label: 'Noodles',
    items: [
      { name: 'Veg Noodles', isVeg: true },
      { name: 'Veg Hakka Noodles', isVeg: true },
      { name: 'Schezwan Noodles', isVeg: true },
      { name: 'Veg Schezwan Noodles', isVeg: true },
      { name: 'Egg Noodles', isVeg: false },
      { name: 'Egg Hakka Noodles', isVeg: false },
      { name: 'Egg Stir-Fried Noodles', isVeg: false },
      { name: 'Chicken Noodles', isVeg: false },
      { name: 'Chicken Hakka Noodles', isVeg: false },
      { name: 'Schezwan Chicken Noodles', isVeg: false },
      { name: 'Mixed Non-Veg Noodles', isVeg: false }
    ]
  },

  // 15. Chicken Biryani
  'chicken-biryani': {
    id: 'chicken-biryani',
    label: 'Chicken Biryani',
    items: [
      { name: 'Chicken Dum Biryani', isVeg: false },
      { name: 'Hyderabadi Chicken Dum Biryani', isVeg: false },
      { name: 'Chicken Dum Biryani (3 pcs)', isVeg: false },
      { name: 'Chicken Fry Biryani', isVeg: false },
      { name: 'Chicken Fry Piece Biryani', isVeg: false },
      { name: 'Special Chicken Biryani', isVeg: false },
      { name: 'Special Boneless Chicken Biryani', isVeg: false },
      { name: 'Chicken Wings Biryani', isVeg: false },
      { name: 'Spicy Chicken Wings Biryani', isVeg: false },
      { name: 'Chicken Wings Biryani (3 pcs)', isVeg: false }
    ]
  },

  // 16. Mutton Biryani
  'mutton-biryani': {
    id: 'mutton-biryani',
    label: 'Mutton Biryani',
    items: [
      { name: 'Mutton Dum Biryani', isVeg: false },
      { name: 'Mutton Fry Biryani', isVeg: false },
      { name: 'Special Mutton Biryani', isVeg: false },
      { name: 'Mutton Keema Biryani', isVeg: false }
    ]
  },

  // 17. Fish & Prawns Biryani
  'fish-prawns-biryani': {
    id: 'fish-prawns-biryani',
    label: 'Fish & Prawns Biryani',
    items: [
      { name: 'Fish Biryani', isVeg: false },
      { name: 'Seafood Fish Dum Biryani', isVeg: false },
      { name: 'Prawns Biryani', isVeg: false },
      { name: 'Tiger Prawns Biryani', isVeg: false }
    ]
  },

  // 18. Tandoori / Kebabs
  'tandoori-kebabs': {
    id: 'tandoori-kebabs',
    label: 'Tandoori / Kebabs',
    items: [
      { name: 'Kalmi Kebab', isVeg: false },
      { name: 'Kalmi Kabab', isVeg: false },
      { name: 'Kalmi Kabab (2 pcs)', isVeg: false },
      { name: 'Chicken Tikka', isVeg: false },
      { name: 'Hariali Tikka', isVeg: false },
      { name: 'Hariyali Chicken Tikka', isVeg: false },
      { name: 'Malai Tikka', isVeg: false },
      { name: 'Murgh Malai Tikka', isVeg: false },
      { name: 'Murgh Malai Tikka (5 pcs)', isVeg: false },
      { name: 'Achari Tikka', isVeg: false },
      { name: 'Achari Chicken Tikka', isVeg: false },
      { name: 'Achari Chicken Tikka (5 pcs)', isVeg: false },
      { name: 'Tandoori Full Joint', isVeg: false },
      { name: 'Tandoori Chicken Joint (1 pc)', isVeg: false },
      { name: 'Tandoori Half', isVeg: false },
      { name: 'Tandoori Chicken (Half)', isVeg: false },
      { name: 'Tandoori Full', isVeg: false },
      { name: 'Tandoori Chicken (Full)', isVeg: false }
    ]
  },

  // 19. Indian Breads
  'indian-breads': {
    id: 'indian-breads',
    label: 'Indian Breads',
    items: [
      { name: 'Pulka', isVeg: true },
      { name: 'Soft Phulka Roti', isVeg: true },
      { name: 'Butter Pulka', isVeg: true },
      { name: 'Ghee / Butter Phulka', isVeg: true },
      { name: 'Chapati', isVeg: true },
      { name: 'Parota', isVeg: true },
      { name: 'Malabar Parotta', isVeg: true },
      { name: 'Tandoori Roti', isVeg: true },
      { name: 'Tandoori Butter Roti', isVeg: true },
      { name: 'Tandoori Naan', isVeg: true },
      { name: 'Tandoori Butter Naan', isVeg: true },
      { name: 'Tandoori Garlic Naan', isVeg: true }
    ]
  },

  // 20. Beverages
  'beverages': {
    id: 'beverages',
    label: 'Beverages',
    items: [
      { name: 'Water 250ml', isVeg: true },
      { name: 'Mineral Water (250ml)', isVeg: true },
      { name: 'Water 500ml', isVeg: true },
      { name: 'Mineral Water (500ml)', isVeg: true },
      { name: 'Water 1L', isVeg: true },
      { name: 'Mineral Water (1 Litre)', isVeg: true },
      { name: 'Thums Up', isVeg: true },
      { name: 'Thums Up (Cold Can/Bottle)', isVeg: true },
      { name: 'Sprite', isVeg: true },
      { name: 'Sprite (Chilled)', isVeg: true },
      { name: 'Coke', isVeg: true },
      { name: 'Coca-Cola (Chilled)', isVeg: true },
      { name: 'Fanta', isVeg: true },
      { name: 'Maaza', isVeg: true },
      { name: 'Maaza Mango Drink', isVeg: true },
      { name: 'Pulpy Orange', isVeg: true },
      { name: 'Minute Maid Pulpy Orange', isVeg: true },
      { name: 'Sweet Lassi', isVeg: true },
      { name: 'Punjabi Sweet Lassi', isVeg: true },
      { name: 'Swiss Goli Soda', isVeg: true },
      { name: 'Swiss Goli Soda (Flavoured)', isVeg: true },
      { name: 'Diet Coke', isVeg: true },
      { name: 'Kinley Soda', isVeg: true },
      { name: 'Lemon Soda', isVeg: true },
      { name: 'Fresh Lemon Soda', isVeg: true },
      { name: 'Buttermilk', isVeg: true },
      { name: 'Spiced Masala Buttermilk', isVeg: true }
    ]
  },

  // 21. Ice Cream / Desserts
  'desserts': {
    id: 'desserts',
    label: 'Ice Cream / Desserts',
    items: [
      { name: 'Chocobar', isVeg: true },
      { name: 'Chocobar Ice Cream', isVeg: true },
      { name: 'Vanilla Cup', isVeg: true },
      { name: 'Vanilla Ice Cream Cup', isVeg: true },
      { name: 'Butterscotch Cup', isVeg: true },
      { name: 'Butterscotch Ice Cream Cup', isVeg: true }
    ]
  },

  // 22. Buffet
  'buffet': {
    id: 'buffet',
    label: 'Buffet',
    items: [
      { name: 'Silver Buffet', isVeg: true },
      { name: 'Silver Grand Dining Buffet', isVeg: true },
      { name: 'Gold Buffet', isVeg: false },
      { name: 'Gold Executive Buffet Spread', isVeg: false },
      { name: 'Platinum Buffet', isVeg: false },
      { name: 'Platinum Royal VIP Buffet', isVeg: false },
      { name: 'Staff Buffet', isVeg: true },
      { name: 'Special Staff Dining Buffet', isVeg: true }
    ]
  }
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected.');

  const Food = mongoose.model('Food', new mongoose.Schema({
    id: String,
    name: String,
    category: String,
    subCategory: String,
    isVeg: Boolean,
    image: String,
    price: Number
  }, { strict: false }));

  // Create fast lookup by normalized item name
  const itemToCategoryMap = new Map();

  for (const [catKey, catData] of Object.entries(CATEGORY_MAP)) {
    for (const item of catData.items) {
      const norm = normalizeName(item.name);
      itemToCategoryMap.set(norm, {
        category: catKey,
        subCategory: catData.label,
        isVeg: item.isVeg
      });
      // also lower
      itemToCategoryMap.set(item.name.toLowerCase().trim(), {
        category: catKey,
        subCategory: catData.label,
        isVeg: item.isVeg
      });
    }
  }

  const allFoods = await Food.find({});
  console.log(`Processing ${allFoods.length} foods in database...`);

  let updated = 0;
  let unmatched = [];

  for (const food of allFoods) {
    const rawName = (food.name || '').trim();
    const nameLower = rawName.toLowerCase();
    const nameNorm = normalizeName(rawName);

    let match = itemToCategoryMap.get(nameLower) || itemToCategoryMap.get(nameNorm);

    if (!match) {
      // Substring search
      for (const [key, val] of itemToCategoryMap.entries()) {
        if (nameLower.includes(key) || key.includes(nameLower) || nameNorm.includes(key) || key.includes(nameNorm)) {
          match = val;
          break;
        }
      }
    }

    if (match) {
      food.category = match.category;
      food.subCategory = match.subCategory;
      food.isVeg = match.isVeg;
      await food.save();
      updated++;
      console.log(`[CATEGORIZED] "${food.name}" -> Category: [${match.category}] (${match.subCategory}), isVeg: ${match.isVeg}`);
    } else {
      unmatched.push(food.name);
      console.warn(`[UNMATCHED] "${food.name}"`);
    }
  }

  console.log('==================================================');
  console.log(`TOTAL PROCESSED: ${allFoods.length}`);
  console.log(`SUCCESSFULLY CATEGORIZED: ${updated}`);
  console.log(`UNMATCHED: ${unmatched.length}`);
  console.log('==================================================');

  // Also sync foods.json
  const foodsJsonPath = path.join(__dirname, '../data/foods.json');
  if (fs.existsSync(foodsJsonPath)) {
    try {
      const raw = fs.readFileSync(foodsJsonPath, 'utf8');
      let localFoods = JSON.parse(raw);
      if (Array.isArray(localFoods)) {
        for (const food of localFoods) {
          const rawName = (food.name || '').trim();
          const nameLower = rawName.toLowerCase();
          const nameNorm = normalizeName(rawName);

          let match = itemToCategoryMap.get(nameLower) || itemToCategoryMap.get(nameNorm);
          if (!match) {
            for (const [key, val] of itemToCategoryMap.entries()) {
              if (nameLower.includes(key) || key.includes(nameLower)) {
                match = val;
                break;
              }
            }
          }
          if (match) {
            food.category = match.category;
            food.subCategory = match.subCategory;
            food.isVeg = match.isVeg;
          }
        }
        fs.writeFileSync(foodsJsonPath, JSON.stringify(localFoods, null, 2), 'utf8');
        console.log(`Synced ${localFoods.length} items to data/foods.json`);
      }
    } catch (e) {
      console.warn('Could not sync foods.json:', e.message);
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error('Error updating categories:', e);
  process.exit(1);
});
