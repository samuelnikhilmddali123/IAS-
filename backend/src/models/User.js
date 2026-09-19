const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        password: {
            type: String,
            default: ""
        },

        pin: {
            type: String,
            default: "123456"
        },

        avatar: {
            type: String,
            default: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
        },

        designation: {
            type: String,
            default: "IAS Officer • Special Duty"
        },

        department: {
            type: String,
            default: "Cabinet Secretariat • Government of India"
        },

        officerId: {
            type: String,
            default: ""
        },

        role: {
            type: String,
            default: "user"
        }
    },
    {
        timestamps: true
    }
);

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);