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



module.exports = router;