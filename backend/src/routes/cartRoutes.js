const express = require("express");

const {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart
} = require("../services/cartService");

const userAuth = require("../middleware/userAuthMiddleware");

const router = express.Router();


/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: User shopping cart APIs
 */


/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add food to cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodId
 *               - quantity
 *             properties:
 *               foodId:
 *                 type: string
 *                 example: 68caa123456789abcdef1234
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Food added to cart successfully
 *       400:
 *         description: Invalid quantity or food unavailable
 *       401:
 *         description: Authentication token required
 *       404:
 *         description: Food not found
 */
router.post("/add", userAuth, async (req, res) => {
    try {
        const { foodId, quantity } = req.body;

        const cart = await addToCart(
            req.user.id,
            foodId,
            quantity
        );

        res.status(200).json({
            success: true,
            message: "Food added to cart successfully",
            cart
        });

    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
});


/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User cart retrieved successfully
 *       401:
 *         description: Authentication token required
 */
router.get("/", userAuth, async (req, res) => {
    try {
        const cart = await getCart(req.user.id);

        res.status(200).json({
            success: true,
            cart
        });

    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
});


/**
 * @swagger
 * /api/cart/update:
 *   put:
 *     summary: Update food quantity in cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodId
 *               - quantity
 *             properties:
 *               foodId:
 *                 type: string
 *                 example: 68caa123456789abcdef1234
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *       400:
 *         description: Invalid quantity or food unavailable
 *       401:
 *         description: Authentication token required
 *       404:
 *         description: Cart or food item not found
 */
router.put("/update", userAuth, async (req, res) => {
    try {
        const { foodId, quantity } = req.body;

        const cart = await updateCartItem(
            req.user.id,
            foodId,
            quantity
        );

        res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            cart
        });

    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
});


/**
 * @swagger
 * /api/cart/remove:
 *   delete:
 *     summary: Remove food from cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodId
 *             properties:
 *               foodId:
 *                 type: string
 *                 example: 68caa123456789abcdef1234
 *     responses:
 *       200:
 *         description: Food removed from cart successfully
 *       401:
 *         description: Authentication token required
 *       404:
 *         description: Cart or food item not found
 */
const handleRemoveFromCart = async (req, res) => {
    try {
        const foodId = req.params.foodId || (req.body && req.body.foodId) || req.query.foodId;

        const cart = await removeFromCart(
            req.user.id,
            foodId
        );

        res.status(200).json({
            success: true,
            message: "Food removed from cart",
            cart
        });

    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

router.delete("/remove", userAuth, handleRemoveFromCart);
router.delete("/remove/:foodId", userAuth, handleRemoveFromCart);



// In-memory duplicate order submission prevention (double-click safeguard)
const recentSubmissions = new Map();
function checkAndSetDuplicate(userId, items) {
    const now = Date.now();
    for (const [k, v] of recentSubmissions.entries()) {
        if (now - v > 10000) recentSubmissions.delete(k);
    }
    const fingerprint = items.map(i => `${i.foodId || i.id}:${i.quantity}`).sort().join('|');
    const key = `${userId}:${fingerprint}`;
    if (recentSubmissions.has(key) && (now - recentSubmissions.get(key) < 4000)) {
        return true;
    }
    recentSubmissions.set(key, now);
    return false;
}

// Strict backend cart validation
async function validateCartItems(rawItems) {
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        const err = new Error("Cart is empty. Please add food items to proceed.");
        err.statusCode = 400;
        throw err;
    }

    const mongoose = require("mongoose");
    const Food = require("../models/Food");
    const dataStore = require("../storage/dataStore");

    let foodsCatalog = [];
    if (mongoose.connection.readyState === 1) {
        try {
            foodsCatalog = await Food.find();
        } catch (e) {
            console.warn('[CART] Food catalog lookup warning:', e.message);
        }
    }
    if (!foodsCatalog || foodsCatalog.length === 0) {
        foodsCatalog = dataStore.getFoods ? dataStore.getFoods() : [];
    }

    const foodMap = new Map();
    foodsCatalog.forEach(f => {
        if (f.id) foodMap.set(String(f.id), f);
        if (f._id) foodMap.set(String(f._id), f);
        if (f.name) foodMap.set(f.name.toLowerCase().trim(), f);
    });

    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const raw of rawItems) {
        const idKey = String(raw.foodId || raw.id || (raw.food && (raw.food.id || raw.food._id)) || (raw.item && (raw.item.id || raw.item._id)) || '');
        const nameKey = String(raw.name || (raw.food && raw.food.name) || (raw.item && raw.item.name) || '').toLowerCase().trim();

        let food = null;
        if (idKey && foodMap.has(idKey)) {
            food = foodMap.get(idKey);
        } else if (nameKey && foodMap.has(nameKey)) {
            food = foodMap.get(nameKey);
        }

        if (!food) {
            const err = new Error(`Food item not found: ${raw.name || idKey || 'Unknown item'}`);
            err.statusCode = 404;
            throw err;
        }

        // Availability check
        if (food.isAvailable === false || (food.availableQuantity !== undefined && food.availableQuantity <= 0)) {
            const err = new Error(`Food item is currently unavailable: ${food.name}`);
            err.statusCode = 400;
            throw err;
        }

        // Quantity verification
        const qty = Number(raw.quantity);
        if (!qty || !Number.isInteger(qty) || qty < 1) {
            const err = new Error(`Invalid quantity for: ${food.name}`);
            err.statusCode = 400;
            throw err;
        }

        if (food.availableQuantity !== undefined && qty > food.availableQuantity) {
            const err = new Error(`Only ${food.availableQuantity} items available for: ${food.name}`);
            err.statusCode = 400;
            throw err;
        }

        // Backend-calculated price (never trust frontend totals)
        const unitPrice = Number(food.price) || 0;
        const itemTotal = qty * unitPrice;
        calculatedSubtotal += itemTotal;

        validatedItems.push({
            foodId: String(food._id || food.id),
            id: String(food._id || food.id),
            name: food.name,
            quantity: qty,
            price: unitPrice,
            total: itemTotal,
            image: food.image || raw.image || ''
        });
    }

    return {
        items: validatedItems,
        subtotal: calculatedSubtotal,
        totalAmount: calculatedSubtotal
    };
}

async function resolveAuthenticatedUser(req) {
    const authService = require('../services/authService');
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
        const err = new Error("User authentication required");
        err.statusCode = 401;
        throw err;
    }
    const user = await authService.getUserById(userId);
    if (!user) {
        const err = new Error("Authenticated officer profile not found in central database");
        err.statusCode = 404;
        throw err;
    }
    return user;
}

// ==========================================
// 1. CHECKOUT FLOW — SEND ORDER TO KITCHEN
// ==========================================
router.post('/checkout', userAuth, async (req, res) => {
    const orderService = require('../services/orderService');
    const cartService = require('../services/cartService');
    const printerService = require('../utils/printerService');

    try {
        const user = await resolveAuthenticatedUser(req);

        // Retrieve raw items from frontend payload or existing backend cart
        let rawItems = req.body.items;
        if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            const backendCart = await cartService.getCart(user.id);
            if (backendCart && backendCart.items && backendCart.items.length > 0) {
                rawItems = backendCart.items;
            }
        }

        // Validate cart and calculate totals strictly on backend
        const validated = await validateCartItems(rawItems);

        // Prevent duplicate orders (double click prevention)
        if (checkAndSetDuplicate(user.id, validated.items)) {
            return res.status(409).json({
                success: false,
                message: "A request for this order is already being processed. Please wait."
            });
        }

        const isPreOrder = req.body.orderType === 'PRE_ORDER' || Boolean(req.body.pickupTime);
        const orderType = isPreOrder ? 'PRE_ORDER' : 'INSTANT';
        const pickupTime = req.body.pickupTime || null;
        const pickupDate = req.body.pickupDate || (pickupTime ? new Date() : null);

        // Requirement 16: Mobile number must come from authenticated User database record
        const registeredMobile = user.phone || user.mobile || '';

        const orderPayload = {
            userId: String(user.id || user._id),
            userName: user.name || 'IAS Officer',
            userPhone: registeredMobile,
            items: validated.items,
            subtotal: validated.subtotal,
            totalAmount: validated.totalAmount,
            orderType,
            pickupDate,
            pickupTime,
            orderNote: (req.body.orderNote || '').trim(),
            paymentMethod: 'restaurant_qr',
            paymentStatus: 'UNPAID'
        };

        // Create & Save order using existing Order model (also emits KOT via Socket.IO to Kitchen)
        const order = await orderService.createOrder(orderPayload);

        // Print KOT to Thermal Printer
        printerService.printOrderBackend(order);

        // Clear Cart
        await cartService.clearCart(user.id);

        res.status(200).json({
            success: true,
            message: 'Order sent to kitchen successfully.',
            order
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to checkout order'
        });
    }
});

// ==========================================
// 2. GENERATE BILL FLOW
// ==========================================
router.post('/generate-bill', userAuth, async (req, res) => {
    const orderService = require('../services/orderService');
    const cartService = require('../services/cartService');
    const billService = require('../services/billService');
    const whatsappService = require('../services/whatsappService');

    try {
        const user = await resolveAuthenticatedUser(req);

        // Requirement 3 & 16: Strictly obtain registered mobile from database record.
        // Do NOT trust any phone number sent from frontend payload.
        const registeredMobile = (user.phone || user.mobile || '').trim();
        if (!registeredMobile || registeredMobile.replace(/\D/g, '').length < 10) {
            const err = new Error("Officer does not have a registered mobile number in the central database to receive the bill and Restaurant QR code.");
            err.statusCode = 400;
            throw err;
        }

        // Retrieve raw items from frontend payload or backend cart
        let rawItems = req.body.items;
        if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            const backendCart = await cartService.getCart(user.id);
            if (backendCart && backendCart.items && backendCart.items.length > 0) {
                rawItems = backendCart.items;
            }
        }

        // Validate cart and calculate totals strictly on backend
        const validated = await validateCartItems(rawItems);

        // Prevent duplicate orders
        if (checkAndSetDuplicate(user.id, validated.items)) {
            return res.status(409).json({
                success: false,
                message: "A request for this bill is already being processed. Please wait."
            });
        }

        const isPreOrder = req.body.orderType === 'PRE_ORDER' || Boolean(req.body.pickupTime);
        const orderType = isPreOrder ? 'PRE_ORDER' : 'INSTANT';
        const pickupTime = req.body.pickupTime || null;
        const pickupDate = req.body.pickupDate || (pickupTime ? new Date() : null);

        const orderPayload = {
            userId: String(user.id || user._id),
            userName: user.name || 'IAS Officer',
            userPhone: registeredMobile,
            items: validated.items,
            subtotal: validated.subtotal,
            totalAmount: validated.totalAmount,
            orderType,
            pickupDate,
            pickupTime,
            orderNote: (req.body.orderNote || '').trim(),
            paymentMethod: 'restaurant_qr',
            paymentStatus: 'UNPAID'
        };

        // Create order in MongoDB using existing Order model
        const order = await orderService.createOrder(orderPayload);

        // Generate proper bill using existing billService
        const bill = await billService.generateBill(order.id || order._id);

        // Explicitly set customer details from database record
        bill.customer = {
            name: user.name || 'IAS Officer',
            phone: registeredMobile,
            email: user.email || ''
        };
        bill.paymentStatus = 'UNPAID';

        // Fetch Restaurant UPI QR Code
        const { qrDataUrl } = await orderService.getRestaurantPaymentQr(bill.grandTotal, [order.id || order._id]);

        // Format clean, professional bill text matching Requirement 4 exact specification
        const billText = billService.formatBillReceipt({
            bill,
            restaurantName: process.env.RESTAURANT_NAME || 'IAS OFFICERS CANTEEN'
        });

        // Dispatch bill & Restaurant QR code to user's registered mobile number via existing WhatsApp service
        const sendResult = await whatsappService.sendBillMessage({
            to: registeredMobile,
            billText,
            qrDataUrl
        });

        // Requirement 17: If delivery fails, do not tell user bill sent successfully, do not clear cart, do not log out
        if (sendResult.status === 'FAILED') {
            const err = new Error(sendResult.error || "Failed to dispatch bill & Restaurant QR code to your registered mobile.");
            err.statusCode = 502;
            throw err;
        }

        // Clear Cart on confirmed success
        await cartService.clearCart(user.id);

        res.status(200).json({
            success: true,
            message: `Bill and Restaurant QR code sent to registered mobile (${registeredMobile}).`,
            bill,
            order,
            registeredMobile,
            whatsappDeliveryStatus: sendResult.status
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate and send bill'
        });
    }
});

module.exports = router;