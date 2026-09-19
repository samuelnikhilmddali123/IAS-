const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        subCategory: {
            type: String,
            trim: true
        },

        isVeg: {
            type: Boolean,
            default: true
        },

        portion: {
            type: String,
            trim: true
        },

        image: {
            type: String,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        availableQuantity: {
            type: Number,
            required: true,
            min: 0
        },

        isAvailable: {
            type: Boolean,
            default: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Food", foodSchema);