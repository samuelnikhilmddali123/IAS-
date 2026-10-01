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
            required: false,
            lowercase: true,
            trim: true,
            default: ""
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

        passwordUniquenessFingerprint: {
            type: String,
            default: null
        },

        pin: {
            type: String,
            default: "123456"
        },

        avatar: {
            type: String,
            default: ""
        },

        designation: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        department: {
            type: String,
            default: ""
        },

        officerId: {
            type: String,
            default: ""
        },

        // Personal & Family Profile Details
        dob: {
            type: String,
            default: ""
        },

        marriageDate: {
            type: String,
            default: ""
        },

        importantDates: {
            type: String,
            default: ""
        },

        childrenCount: {
            type: String,
            default: ""
        },

        childrenDetails: {
            type: String,
            default: ""
        },

        siblings: {
            type: String,
            default: ""
        },

        dietaryPreferences: {
            type: String,
            default: ""
        },

        emergencyContact: {
            type: String,
            default: ""
        },

        bloodGroup: {
            type: String,
            default: ""
        },

        homeAddress: {
            type: String,
            default: ""
        },

        role: {
            type: String,
            default: "user"
        },

        isOfficial: {
            type: Boolean,
            default: false
        },

        pinLoggedInAt: {
            type: Date,
            default: null
        },

        pinExpiresAt: {
            type: Date,
            default: null
        },

        // Lifetime Login QR Access Fields
        lifetimeQrId: {
            type: String,
            default: "",
            index: true
        },

        lifetimeQrPayload: {
            type: String,
            default: ""
        },

        lifetimeQrDataUrl: {
            type: String,
            default: ""
        },

        lifetimeQrImage: {
            type: String,
            default: ""
        },

        lifetimeQrTokenHash: {
            type: String,
            default: "",
            index: true
        },

        qrRevoked: {
            type: Boolean,
            default: false
        },

        qrRevokedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.passwordUniquenessFingerprint;
                delete ret.lifetimeQrTokenHash;
                return ret;
            }
        }
    }
);

userSchema.index({ phone: 1 });

module.exports = mongoose.model("User", userSchema);
