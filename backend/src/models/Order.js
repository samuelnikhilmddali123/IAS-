const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: false
        },

        foodId: {
            type: String,
            default: ""
        },

        id: {
            type: String,
            default: ""
        },

        name: {
            type: String,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        total: {
            type: Number,
            default: 0
        },

        image: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },

        userId: {
            type: String,
            default: "guest"
        },

        userName: {
            type: String,
            default: "IAS Officer"
        },

        userPhone: {
            type: String,
            default: ""
        },

        userAvatar: {
            type: String,
            default: ""
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        subtotal: {
            type: Number,
            default: 0
        },

        discount: {
            type: Number,
            default: 0
        },

        tax: {
            type: Number,
            default: 0
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        grandTotal: {
            type: Number,
            default: 0
        },

        paymentMethod: {
            type: String,
            default: "online"
        },

        orderNote: {
            type: String,
            default: ""
        },

        mealSlot: {
            type: String,
            default: "General"
        },

        tokenNumber: {
            type: Number,
            default: () => Math.floor(10 + Math.random() * 90)
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PREPARING",
                "READY",
                "COMPLETED",
                "CANCELLED",
                "VALIDATED",
                "REJECTED"
            ],
            default: "PREPARING"
        },

        billNumber: {
            type: String,
            default: null
        },

        billGeneratedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ userPhone: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);