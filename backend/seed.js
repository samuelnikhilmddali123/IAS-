require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./src/models/Admin");
const User = require("./src/models/User");
const Food = require("./src/models/Food");

const MENU_ITEMS = [
    // Breakfast Items
    {
        name: "Idli (2 pcs)",
        description: "Soft steamed rice cakes served with sambar and coconut chutney",
        portion: "2 pcs with Sambar & Chutney",
        price: 25,
        isVeg: true,
        category: "Breakfast",
        subCategory: "South Indian",
        availableQuantity: 50,
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Masala Dosa",
        description: "Crisp golden crepe stuffed with mildly spiced potato masala",
        portion: "Crispy with potato masala",
        price: 50,
        isVeg: true,
        category: "Breakfast",
        subCategory: "South Indian",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Upma",
        description: "Wholesome roasted semolina cooked with vegetables and mild spices",
        portion: "Served with Coconut Chutney",
        price: 30,
        isVeg: true,
        category: "Breakfast",
        subCategory: "Healthy",
        availableQuantity: 35,
        image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Pongal",
        description: "Traditional South Indian ghee pongal seasoned with pepper and cashews",
        portion: "Ghee Pongal with Medu Vada",
        price: 30,
        isVeg: true,
        category: "Breakfast",
        subCategory: "South Indian",
        availableQuantity: 30,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Medu Vada (2 pcs)",
        description: "Crispy fried lentil donuts served piping hot with chutney",
        portion: "Crispy lentil fritters with chutney",
        price: 30,
        isVeg: true,
        category: "Breakfast",
        subCategory: "South Indian",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Poha",
        description: "Fluffy flattened rice with roasted peanuts, curry leaves and mustard",
        portion: "Indori flattened rice with peanuts",
        price: 25,
        isVeg: true,
        category: "Breakfast",
        subCategory: "Healthy",
        availableQuantity: 35,
        image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80"
    },

    // Lunch Items
    {
        name: "South Indian Thali",
        description: "Traditional feast with steamed rice, sambar, rasam, kootu, curd and appalam",
        portion: "Rice, Sambar, Rasam, Poriyal, Curd, Appalam",
        price: 80,
        isVeg: true,
        category: "Lunch",
        subCategory: "South Indian",
        availableQuantity: 50,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "North Indian Thali",
        description: "Complete meal with 2 rotis, paneer sabzi, dal tadka, jeera rice and sweet",
        portion: "2 Roti, Dal, Paneer Sabzi, Rice, Gulab Jamun",
        price: 90,
        isVeg: true,
        category: "Lunch",
        subCategory: "North Indian",
        availableQuantity: 50,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Dal Rice",
        description: "Homestyle steamed basmati rice with aromatic tempered yellow lentils",
        portion: "Steamed basmati rice with Tadka Dal",
        price: 60,
        isVeg: true,
        category: "Lunch",
        subCategory: "Healthy",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Curd Rice",
        description: "Cooling tempered curd rice with mustard, ginger, pomegranate seeds",
        portion: "Tempered curd rice with mustard & ginger",
        price: 50,
        isVeg: true,
        category: "Lunch",
        subCategory: "Healthy",
        availableQuantity: 30,
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Paneer Butter Masala",
        description: "Soft cottage cheese cubes in rich tomato-cashew gravy with 2 butter rotis",
        portion: "Rich cottage cheese gravy with 2 Butter Rotis",
        price: 90,
        isVeg: true,
        category: "Lunch",
        subCategory: "North Indian",
        availableQuantity: 35,
        image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Chicken Curry",
        description: "Succulent chicken cooked in spicy homestyle aromatic gravy",
        portion: "Homestyle chicken curry with rice or roti",
        price: 110,
        isVeg: false,
        category: "Lunch",
        subCategory: "Non-Veg",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Veg Dum Biryani",
        description: "Long-grain fragrant basmati rice layered with vegetables, saffron and herbs",
        portion: "Fragrant basmati rice cooked with spices & raita",
        price: 85,
        isVeg: true,
        category: "Lunch",
        subCategory: "Healthy",
        availableQuantity: 45,
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Rajma Chawal",
        description: "Slow-cooked Punjabi style kidney bean curry served over hot basmati rice",
        portion: "Punjabi style kidney beans curry with steamed rice",
        price: 70,
        isVeg: true,
        category: "Lunch",
        subCategory: "North Indian",
        availableQuantity: 35,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80"
    },

    // Snacks Items
    {
        name: "Samosa (2 pcs)",
        description: "Golden crispy pastry crust with savory spiced potato and green peas filling",
        portion: "Crispy spiced potato pastry with mint chutney",
        price: 25,
        isVeg: true,
        category: "Snacks",
        subCategory: "North Indian",
        availableQuantity: 60,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Veg Cutlet",
        description: "Crispy crumbed vegetable patties packed with mashed veggies and spices",
        portion: "Crispy crumb-fried vegetable cutlet",
        price: 30,
        isVeg: true,
        category: "Snacks",
        subCategory: "Healthy",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "French Fries",
        description: "Classic salted crispy potato fingers served with tangy dip",
        portion: "Crispy golden potato fries",
        price: 35,
        isVeg: true,
        category: "Snacks",
        subCategory: "Snacks",
        availableQuantity: 50,
        image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Veg Grilled Sandwich",
        description: "Toasted multi-grain bread stuffed with cucumber, tomato, potato and cheese",
        portion: "Layered fresh vegetables with cheese",
        price: 45,
        isVeg: true,
        category: "Snacks",
        subCategory: "Healthy",
        availableQuantity: 30,
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Kachori (2 pcs)",
        description: "Crispy flaky round pastry stuffed with spicy moong dal mixture",
        portion: "Flaky pastry filled with spiced lentils",
        price: 30,
        isVeg: true,
        category: "Snacks",
        subCategory: "North Indian",
        availableQuantity: 35,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Pav Bhaji",
        description: "Buttery vegetable mash cooked with special spices, served with 2 warm buttered pavs",
        portion: "Spicy mashed vegetables with 2 buttered pavs",
        price: 50,
        isVeg: true,
        category: "Snacks",
        subCategory: "North Indian",
        availableQuantity: 40,
        image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80"
    },

    // Beverages
    {
        name: "Filter Coffee",
        description: "Authentic South Indian degree coffee brewed with chicory and frothy milk",
        portion: "Authentic South Indian chicory brew",
        price: 20,
        isVeg: true,
        category: "Beverages",
        subCategory: "South Indian",
        availableQuantity: 100,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80"
    },
    {
        name: "Masala Chai",
        description: "Hot comforting milk tea infused with cardamom, ginger, cloves and cinnamon",
        portion: "Spiced aromatic milk tea with cardamom",
        price: 15,
        isVeg: true,
        category: "Beverages",
        subCategory: "North Indian",
        availableQuantity: 100,
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80"
    }
];

const seed = async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/canteen";

    try {
        console.log(`Connecting to database at ${mongoUri}...`);
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to MongoDB successfully!");

        // 1. Seed Admin
        let admin = await Admin.findOne({ email: "admin@canteen.com" });
        if (!admin) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            admin = await Admin.create({
                name: "Canteen Admin",
                email: "admin@canteen.com",
                phone: "9876543210",
                password: hashedPassword
            });
            console.log("Created default Admin: admin@canteen.com / admin123");
        } else {
            console.log("Admin already exists: admin@canteen.com");
        }

        // 2. Seed User
        let user = await User.findOne({ email: "user@canteen.com" });
        if (!user) {
            const hashedPassword = await bcrypt.hash("user123", 10);
            user = await User.create({
                name: "Student User",
                email: "user@canteen.com",
                phone: "9876543211",
                password: hashedPassword
            });
            console.log("Created default User: user@canteen.com / user123");
        } else {
            console.log("User already exists: user@canteen.com");
        }

        // 3. Seed Food Items
        let addedCount = 0;
        let existingCount = 0;

        for (const item of MENU_ITEMS) {
            const existing = await Food.findOne({ name: item.name });
            if (!existing) {
                await Food.create({
                    ...item,
                    isAvailable: true,
                    createdBy: admin._id
                });
                addedCount++;
            } else {
                existingCount++;
            }
        }

        console.log(`Food seeding complete: ${addedCount} items added, ${existingCount} items already existed.`);
        console.log(`Total Food items in DB: ${await Food.countDocuments()}`);

        await mongoose.disconnect();
        console.log("Database disconnected. Seeding finished successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Seeding failed:", error.message);
        console.error("Please ensure MongoDB is running or provide a valid MONGODB_URI in backend/.env");
        process.exit(1);
    }
};

seed();
