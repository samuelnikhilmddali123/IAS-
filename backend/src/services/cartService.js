const Cart = require("../models/Cart");
const Food = require("../models/Food");

const addToCart = async (userId, foodId, quantity) => {
    if (!foodId || !quantity) {
        const error = new Error("Food ID and quantity are required");
        error.statusCode = 400;
        throw error;
    }
    if (quantity < 1) {
        const error = new Error("Quantity must be at least 1");
        error.statusCode = 400;
        throw error;
    }
    const food = await Food.findById(foodId);
    if (!food) {
        const error = new Error("Food not found");
        error.statusCode = 404;
        throw error;
    }
    if (!food.isAvailable || food.availableQuantity <= 0) {
        const error = new Error("Food is currently unavailable");
        error.statusCode = 400;
        throw error;
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = await Cart.create({ user: userId, items: [] });
    }
    const existingItem = cart.items.find(item => item.food.toString() === foodId);
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > food.availableQuantity) {
            const error = new Error(`Only ${food.availableQuantity} items available`);
            error.statusCode = 400;
            throw error;
        }
        existingItem.quantity = newQuantity;
    } else {
        if (quantity > food.availableQuantity) {
            const error = new Error(`Only ${food.availableQuantity} items available`);
            error.statusCode = 400;
            throw error;
        }
        cart.items.push({ food: foodId, quantity });
    }
    await cart.save();
    return await Cart.findById(cart._id).populate("items.food", "name category price availableQuantity isAvailable");
};

const getCart = async (userId) => {
    const cart = await Cart.findOne({ user: userId }).populate("items.food", "name category price availableQuantity isAvailable");
    if (!cart) {
        return { items: [], subtotal: 0, totalItems: 0 };
    }
    let subtotal = 0;
    let totalItems = 0;
    const items = cart.items.map(item => {
        const itemTotal = item.food.price * item.quantity;
        subtotal += itemTotal;
        totalItems += item.quantity;
        return { food: item.food, quantity: item.quantity, itemTotal };
    });
    return { cartId: cart._id, items, totalItems, subtotal };
};

const updateCartItem = async (userId, foodId, quantity) => {
    if (!foodId || quantity === undefined) {
        const error = new Error("Food ID and quantity are required");
        error.statusCode = 400;
        throw error;
    }
    if (quantity < 1) {
        const error = new Error("Quantity must be at least 1");
        error.statusCode = 400;
        throw error;
    }
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
    }
    const food = await Food.findById(foodId);
    if (!food) {
        const error = new Error("Food not found");
        error.statusCode = 404;
        throw error;
    }
    if (!food.isAvailable || food.availableQuantity <= 0) {
        const error = new Error("Food is currently unavailable");
        error.statusCode = 400;
        throw error;
    }
    if (quantity > food.availableQuantity) {
        const error = new Error(`Only ${food.availableQuantity} items available`);
        error.statusCode = 400;
        throw error;
    }
    const item = cart.items.find(item => item.food.toString() === foodId);
    if (!item) {
        const error = new Error("Food is not in the cart");
        error.statusCode = 404;
        throw error;
    }
    item.quantity = quantity;
    await cart.save();
    return await getCart(userId);
};

const removeFromCart = async (userId, foodId) => {
    if (!foodId) {
        const error = new Error("Food ID is required");
        error.statusCode = 400;
        throw error;
    }
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
    }
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => item.food.toString() !== foodId);
    if (cart.items.length === originalLength) {
        const error = new Error("Food is not in the cart");
        error.statusCode = 404;
        throw error;
    }
    await cart.save();
    return await getCart(userId);
};

const clearCart = async (userId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        return { items: [], subtotal: 0, totalItems: 0 };
    }
    cart.items = [];
    await cart.save();
    return await getCart(userId);
};

module.exports = { addToCart, getCart, updateCartItem, removeFromCart, clearCart };
