const mongoose = require("mongoose");

let isDbConnected = false;

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/canteen";
    const isDefaultLocal = mongoUri.includes("127.0.0.1:27017") || mongoUri.includes("localhost:27017");

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        });
        isDbConnected = true;
        console.log("=======================================================");
        console.log("  DATABASE: MongoDB Connected Successfully!            ");
        console.log("  URI:      " + mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        console.log("=======================================================");
        return true;
    } catch (error) {
        isDbConnected = false;
        if (isDefaultLocal) {
            console.log("=======================================================");
            console.log("  DATABASE: Built-in Persistent Engine Active          ");
            console.log("  Status:   Local MongoDB service not running.         ");
            console.log("            Using backend/data/ JSON database engine.  ");
            console.log("            All users, orders & QR tokens are saved!   ");
            console.log("  Tip:      To use MongoDB, start local MongoDB or add ");
            console.log("            a MongoDB Atlas URI to backend/.env        ");
            console.log("=======================================================");
        } else {
            console.warn("MongoDB connection warning:", error.message);
            console.log("Operating in fallback mode using backend/data/ storage.");
        }
        return false;
    }
};

mongoose.connection.on("connected", () => {
    isDbConnected = true;
});

mongoose.connection.on("error", (err) => {
    console.error("MongoDB error event:", err.message);
});

mongoose.connection.on("disconnected", () => {
    isDbConnected = false;
});

module.exports = connectDB;

