const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        category: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        subCategory: {
            type: String,
            trim: true,
            default: "General"
        },

        isVeg: {
            type: Boolean,
            default: true
        },

        portion: {
            type: String,
            trim: true,
            default: "Standard Serving"
        },

        image: {
            type: String,
            trim: true,
            default: ""
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        rating: {
            type: Number,
            default: 4.8
        },

        availableQuantity: {
            type: Number,
            default: 50,
            min: 0
        },

        isAvailable: {
            type: Boolean,
            default: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: false
        }
    },
    {
        timestamps: true
    }
);

foodSchema.index({ category: 1, isAvailable: 1 });

module.exports = mongoose.model("Food", foodSchema);