const fs = require('fs');
const path = require('path');

const foods = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'foods.json'), 'utf8'));

const categories = [
  { id: 'all', label: 'All Menu', iconName: 'grid' },
  { id: 'soups', label: 'Soups', iconName: 'leaf-outline' },
  { id: 'salads', label: 'Salads', iconName: 'leaf' },
  { id: 'veg-starters', label: 'Veg Starters', iconName: 'fast-food-outline' },
  { id: 'paneer-starters', label: 'Paneer Starters', iconName: 'restaurant' },
  { id: 'egg-starters', label: 'Egg Starters', iconName: 'nutrition' },
  { id: 'chicken-starters', label: 'Chicken Starters', iconName: 'flame' },
  { id: 'fish-prawns-starters', label: 'Fish & Prawns Starters', iconName: 'restaurant-outline' },
  { id: 'chicken-curries', label: 'Chicken Curries', iconName: 'flame' },
  { id: 'mutton-curries', label: 'Mutton Curries', iconName: 'restaurant' },
  { id: 'fish-prawns-curries', label: 'Fish & Prawns Curries', iconName: 'restaurant-outline' },
  { id: 'veg-curries', label: 'Veg Main Course / Curries', iconName: 'leaf' },
  { id: 'rice-veg', label: 'Rice & Fried Rice – Veg', iconName: 'nutrition' },
  { id: 'rice-non-veg', label: 'Rice & Fried Rice – Non-Veg', iconName: 'restaurant' },
  { id: 'noodles', label: 'Noodles', iconName: 'fast-food-outline' },
  { id: 'chicken-biryani', label: 'Chicken Biryani', iconName: 'flame' },
  { id: 'mutton-biryani', label: 'Mutton Biryani', iconName: 'flame' },
  { id: 'fish-prawns-biryani', label: 'Fish & Prawns Biryani', iconName: 'restaurant' },
  { id: 'tandoori-kebabs', label: 'Tandoori / Kebabs', iconName: 'flame' },
  { id: 'indian-breads', label: 'Indian Breads', iconName: 'cafe-outline' },
  { id: 'beverages', label: 'Beverages', iconName: 'wine-outline' },
  { id: 'desserts', label: 'Ice Cream / Desserts', iconName: 'sunny-outline' },
];

const mealTimings = [
  { name: 'Breakfast', hours: '08:00 AM - 10:30 AM', icon: 'sunny-outline', isActive: false },
  { name: 'Lunch', hours: '12:30 PM - 03:30 PM', icon: 'restaurant-outline', isActive: true },
  { name: 'Snacks', hours: '04:30 PM - 06:30 PM', icon: 'cafe-outline', isActive: false },
  { name: 'Dinner', hours: '07:30 PM - 10:30 PM', icon: 'moon-outline', isActive: false },
];

const tsContent = `import { Category, MenuItem, MealTiming } from '../types';

export const CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};

export const MEAL_TIMINGS: MealTiming[] = ${JSON.stringify(mealTimings, null, 2)};

export const MENU_ITEMS: MenuItem[] = ${JSON.stringify(foods, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'canteenData.ts'), tsContent, 'utf8');
console.log('Successfully updated frontend/src/data/canteenData.ts with ' + categories.length + ' categories, meal timings, and ' + foods.length + ' items');
