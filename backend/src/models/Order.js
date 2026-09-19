const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true
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
            required: true,
            min: 0
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
            required: true
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        discount: {
            type: Number,
            default: 0,
            min: 0
        },

        tax: {
            type: Number,
            default: 0,
            min: 0
        },

        grandTotal: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "VALIDATED",
                "REJECTED"
            ],
            default: "PENDING"
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

module.exports = mongoose.model("Order", orderSchema);