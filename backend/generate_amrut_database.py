import json
import re

# Load parsed unique items from parse_excel
import build_amrut_menu

unique_items = build_amrut_menu.unique_items

# High Quality Curated Food Images
IMAGE_MAP = {
    # Soups
    'tomato soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    'sweet corn': 'https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=600&q=80',
    'manchow': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
    'hot & sour': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'lemon coriander': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    'mushroom soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    'chicken soup': 'https://images.unsplash.com/photo-1578020190125-f4f7c18bc9cb?auto=format&fit=crop&w=600&q=80',
    
    # Salads & Quick Bites
    'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    'pakoda': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    'french fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    'rolls': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
    'cutlet': 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=600&q=80',
    'cheese balls': 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=600&q=80',
    'tikki': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    'kabab': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    'corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
    'manchurian': 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80',
    'gobi': 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
    'mushroom': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    'paneer starter': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    'omelette': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    'egg starter': 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80',
    
    # Chinese & Noodles
    'noodles': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
    'jeera rice': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80',
    'plain rice': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80',
    'curd rice': 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=600&q=80',
    
    # Veg Curries
    'dal': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    'palak paneer': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    'chana masala': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    'paneer butter masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    'veg curry': 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=600&q=80',
    'kofta': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
    
    # Beverages & Drinks
    'water': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    'soft drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    'lassi': 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=600&q=80',
    'soda': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    'buttermilk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    
    # Breads & Tandoori
    'roti': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
    'naan': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    'parotta': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
    'tandoori chicken': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    'chicken tikka': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    
    # Ice Cream & Desserts
    'ice cream': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
    'buffet': 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80',
    
    # Chicken Starters
    'chilli chicken': 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    'chicken 65': 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
    'chicken wings': 'https://images.unsplash.com/photo-1527477321055-436158a257a5?auto=format&fit=crop&w=600&q=80',
    'chicken lollipop': 'https://images.unsplash.com/photo-1524182576066-1be9610755ec?auto=format&fit=crop&w=600&q=80',
    'chicken starter': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    
    # Non-Veg Curries
    'butter chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    'chicken curry': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=80',
    'mutton curry': 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=600&q=80',
    'mutton keema': 'https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=600&q=80',
    
    # Seafood
    'fish fry': 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=600&q=80',
    'fish curry': 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=600&q=80',
    'prawns': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    
    # Biryani
    'chicken biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    'mutton biryani': 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80',
    'fish biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    'prawns biryani': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80'
}

def resolve_image(name, is_veg):
    name_l = name.lower()
    if 'soup' in name_l:
        if 'chicken' in name_l: return IMAGE_MAP['chicken soup']
        if 'tomato' in name_l: return IMAGE_MAP['tomato soup']
        if 'sweet corn' in name_l or 'corn' in name_l: return IMAGE_MAP['sweet corn']
        if 'manchow' in name_l: return IMAGE_MAP['manchow']
        if 'hot & sour' in name_l: return IMAGE_MAP['hot & sour']
        if 'lemon coriander' in name_l: return IMAGE_MAP['lemon coriander']
        if 'mushroom' in name_l: return IMAGE_MAP['mushroom soup']
        return IMAGE_MAP['tomato soup']
    
    if 'biryani' in name_l:
        if 'mutton' in name_l: return IMAGE_MAP['mutton biryani']
        if 'prawn' in name_l: return IMAGE_MAP['prawns biryani']
        if 'fish' in name_l: return IMAGE_MAP['fish biryani']
        return IMAGE_MAP['chicken biryani']
    
    if 'mutton' in name_l:
        if 'keema' in name_l: return IMAGE_MAP['mutton keema']
        return IMAGE_MAP['mutton curry']
    
    if 'prawn' in name_l:
        return IMAGE_MAP['prawns']
    
    if 'fish' in name_l or 'apollo' in name_l and 'chicken' not in name_l:
        return IMAGE_MAP['fish fry']
    
    if 'tikka' in name_l or 'kalmi' in name_l:
        return IMAGE_MAP['chicken tikka']
    if 'tandoori' in name_l:
        if 'roti' in name_l or 'naan' in name_l: return IMAGE_MAP['naan']
        return IMAGE_MAP['tandoori chicken']
    
    if 'butter chicken' in name_l:
        return IMAGE_MAP['butter chicken']
    if 'chicken curry' in name_l or 'natukodi' in name_l or 'dum chicken' in name_l or 'afghani' in name_l:
        return IMAGE_MAP['chicken curry']
    if 'wings' in name_l:
        return IMAGE_MAP['chicken wings']
    if 'lollipop' in name_l:
        return IMAGE_MAP['chicken lollipop']
    if '65' in name_l:
        if 'chicken' in name_l: return IMAGE_MAP['chicken 65']
        if 'gobi' in name_l: return IMAGE_MAP['gobi']
        if 'paneer' in name_l: return IMAGE_MAP['paneer starter']
    if 'chilli chicken' in name_l:
        return IMAGE_MAP['chilli chicken']
    if 'chicken' in name_l and not is_veg:
        return IMAGE_MAP['chicken starter']
    
    if 'noodles' in name_l:
        return IMAGE_MAP['noodles']
    if 'fried rice' in name_l:
        return IMAGE_MAP['fried rice']
    if 'jeera rice' in name_l or 'kuska' in name_l:
        return IMAGE_MAP['jeera rice']
    if 'curd rice' in name_l:
        return IMAGE_MAP['curd rice']
    if 'plain rice' in name_l or 'rice' in name_l:
        return IMAGE_MAP['plain rice']
    
    if 'paneer butter' in name_l:
        return IMAGE_MAP['paneer butter masala']
    if 'palak paneer' in name_l or 'palak' in name_l:
        return IMAGE_MAP['palak paneer']
    if 'chana' in name_l:
        return IMAGE_MAP['chana masala']
    if 'dal' in name_l or 'daal' in name_l:
        return IMAGE_MAP['dal']
    if 'kofta' in name_l:
        return IMAGE_MAP['kofta']
    if 'paneer' in name_l:
        return IMAGE_MAP['paneer starter']
    if 'mushroom' in name_l:
        return IMAGE_MAP['mushroom']
    if 'gobi' in name_l:
        return IMAGE_MAP['gobi']
    if 'manchurian' in name_l or 'manchuria' in name_l:
        return IMAGE_MAP['manchurian']
    if 'corn' in name_l:
        return IMAGE_MAP['corn']
    if 'french fries' in name_l or 'finger' in name_l:
        return IMAGE_MAP['french fries']
    if 'cheese' in name_l or 'ball' in name_l:
        return IMAGE_MAP['cheese balls']
    if 'tikki' in name_l or 'cutlet' in name_l or 'roll' in name_l:
        return IMAGE_MAP['cutlet']
    if 'pakoda' in name_l or 'bhurji' in name_l:
        return IMAGE_MAP['pakoda']
    if 'omelet' in name_l:
        return IMAGE_MAP['omelette']
    if 'egg' in name_l:
        return IMAGE_MAP['egg starter']
    
    if 'water' in name_l:
        return IMAGE_MAP['water']
    if 'coke' in name_l or 'thums up' in name_l or 'sprite' in name_l or 'fanta' in name_l or 'maaza' in name_l:
        return IMAGE_MAP['soft drink']
    if 'lassi' in name_l:
        return IMAGE_MAP['lassi']
    if 'soda' in name_l:
        return IMAGE_MAP['soda']
    if 'butter milk' in name_l or 'buttermilk' in name_l:
        return IMAGE_MAP['buttermilk']
    if 'ice cream' in name_l or 'chocobar' in name_l or 'cup' in name_l:
        return IMAGE_MAP['ice cream']
    if 'buffet' in name_l:
        return IMAGE_MAP['buffet']
    if 'roti' in name_l or 'phulka' in name_l or 'chapati' in name_l:
        return IMAGE_MAP['roti']
    if 'naan' in name_l:
        return IMAGE_MAP['naan']
    if 'parotta' in name_l or 'parota' in name_l:
        return IMAGE_MAP['parotta']
    
    return IMAGE_MAP['veg curry'] if is_veg else IMAGE_MAP['chicken curry']

def determine_item_metadata(name, sheet, raw_price):
    name_l = name.lower()
    
    # Check isVeg
    non_veg_keywords = ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'omelet', 'omelette', 'natukodi', 'keema', 'non-veg', 'non veg']
    is_veg = True
    for kw in non_veg_keywords:
        if kw in name_l:
            is_veg = False
            break
    if sheet == 'NonVeg':
        is_veg = False
    
    # Determine Category (matching frontend CategoryId: 'breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'south-indian', 'north-indian', 'healthy')
    category = 'lunch'
    sub_category = 'General'
    
    if 'water' in name_l or 'thums up' in name_l or 'coke' in name_l or 'sprite' in name_l or 'fanta' in name_l or 'maaza' in name_l or 'pulpy' in name_l or 'soda' in name_l or 'lassi' in name_l or 'buttermilk' in name_l:
        category = 'beverages'
        sub_category = 'Beverages'
    elif 'chocobar' in name_l or 'vanilla' in name_l or 'butterscotch' in name_l or 'ice cream' in name_l:
        category = 'snacks'
        sub_category = 'Desserts & Ice Cream'
    elif 'buffet' in name_l:
        category = 'lunch'
        sub_category = 'Grand Buffet'
    elif 'soup' in name_l:
        category = 'healthy' if is_veg else 'lunch'
        sub_category = 'Soups'
    elif 'roti' in name_l or 'naan' in name_l or 'phulka' in name_l or 'chapati' in name_l or 'parotta' in name_l or 'parota' in name_l:
        category = 'north-indian'
        sub_category = 'Breads & Roti'
    elif 'biryani' in name_l:
        category = 'lunch'
        sub_category = 'Biryani & Rice'
    elif 'fried rice' in name_l or 'noodles' in name_l:
        category = 'lunch'
        sub_category = 'Noodles & Fried Rice'
    elif 'tikka' in name_l or 'tandoori' in name_l or 'kabab' in name_l:
        category = 'dinner'
        sub_category = 'Tandoori & Kebabs'
    elif 'manchurian' in name_l or '65' in name_l or 'pakoda' in name_l or 'fry' in name_l and ('chicken' in name_l or 'fish' in name_l or 'mutton' in name_l or 'prawn' in name_l or 'crispy' in name_l or 'gobi' in name_l or 'corn' in name_l) or 'rolls' in name_l or 'fries' in name_l or 'lollipop' in name_l or 'wings' in name_l:
        category = 'snacks'
        sub_category = 'Starters & Appetizers'
    elif 'curry' in name_l or 'masala' in name_l or 'dal' in name_l or 'palak' in name_l or 'paneer' in name_l or 'chaman' in name_l or 'kofta' in name_l:
        category = 'lunch'
        sub_category = 'Curries & Gravies'
    elif 'rice' in name_l:
        category = 'south-indian' if 'curd' in name_l else 'lunch'
        sub_category = 'Rice Special'
    
    # Portions
    portion = "Standard Serving"
    if '(10 pcs)' in name or '-10' in name:
        portion = "10 Pieces Plate"
    elif '(6 pcs)' in name:
        portion = "6 Pieces Plate"
    elif '(5 pcs)' in name:
        portion = "5 Pieces Plate"
    elif '(4 pcs)' in name:
        portion = "4 Pieces Plate"
    elif '(3 pcs)' in name:
        portion = "3 Pieces with Basmati Rice"
    elif '(2 pcs)' in name:
        portion = "2 Pieces Plate"
    elif '(1 pc)' in name:
        portion = "1 Full Joint Piece"
    elif '(Half)' in name:
        portion = "Half Portion (2 Persons)"
    elif '(Full)' in name:
        portion = "Full Portion (3-4 Persons)"
    elif '250ml' in name:
        portion = "250ml Bottle"
    elif '500ml' in name:
        portion = "500ml Bottle"
    elif '1 Litre' in name:
        portion = "1 Litre Sealed Bottle"
    elif 'Can' in name or 'Bottle' in name:
        portion = "Chilled Bottle / Can"
    elif 'Buffet' in name:
        portion = "Unlimited Executive Spread"
    elif 'Soup' in name:
        portion = "1 Steaming Bowl (300ml)"
    elif 'Biryani' in name:
        portion = "Full Handi with Raita & Salan"
    elif 'Curry' in name or 'Masala' in name or 'Dal' in name:
        portion = "Serves 1-2 with Gravy"
    elif 'Noodles' in name or 'Fried Rice' in name:
        portion = "1 Wok Serving (Serves 1-2)"
    elif 'Roti' in name or 'Naan' in name or 'Phulka' in name or 'Chapati' in name or 'Parotta' in name:
        portion = "1 Piece Freshly Baked"
    
    # Description
    desc = f"Freshly prepared delicious {name.lower()} cooked to perfection with authentic canteen spices."
    if 'Biryani' in name:
        desc = f"Authentic slow-cooked aromatic basmati biryani with tender spices, caramelized onions, and rich flavours."
    elif 'Soup' in name:
        desc = f"Piping hot, nourishing soup infused with fresh herbs and aromatic culinary seasonings."
    elif 'Tandoori' in name or 'Tikka' in name:
        desc = f"Marinated in special spiced yoghurt and chargrilled in a traditional clay oven."
    elif 'Curry' in name or 'Masala' in name:
        desc = f"Rich and flavorful gravy simmered with traditional spices, perfect with hot rotis or rice."
    elif 'Noodles' in name or 'Fried Rice' in name:
        desc = f"Wok-tossed over high flame with crunchy vegetables and signature savoury sauces."
    elif 'Buffet' in name:
        desc = f"Premium all-inclusive grand dining buffet experience with wide selection of starters, mains & desserts."
    elif 'Beverages' in sub_category or 'Soda' in name or 'Water' in name:
        desc = f"Refreshing chilled beverage to accompany your meal."
    
    image = resolve_image(name, is_veg)
    
    return {
        'portion': portion,
        'description': desc,
        'isVeg': is_veg,
        'category': category,
        'subCategory': sub_category,
        'image': image
    }

final_foods = []
for idx, it in enumerate(unique_items, 1):
    meta = determine_item_metadata(it['name'], it['sheet'], it['price'])
    food_id = f"food-{idx:03d}"
    
    food_obj = {
        "id": food_id,
        "name": it['name'],
        "code": it['code'] if it['code'] else None,
        "description": meta['description'],
        "portion": meta['portion'],
        "price": it['price'],
        "isVeg": meta['isVeg'],
        "category": meta['category'],
        "subCategory": meta['subCategory'],
        "availableQuantity": 50,
        "isAvailable": True,
        "image": meta['image'],
        "rating": round(4.5 + (idx % 5) * 0.1, 1),
        "createdAt": "2026-09-28T10:00:00.000Z"
    }
    final_foods.append(food_obj)

print(f"Generated {len(final_foods)} total foods!")

# Save to backend/data/foods.json
with open('data/foods.json', 'w', encoding='utf-8') as f:
    json.dump(final_foods, f, indent=2, ensure_ascii=False)
print("Saved backend/data/foods.json successfully!")

# Write backend/seed_amrut.js
seed_js_content = f"""require("dotenv").config();
const mongoose = require("mongoose");
const Food = require("./src/models/Food");
const dataStore = require("./src/storage/dataStore");

const AMRUT_FOODS = {json.dumps(final_foods, indent=2, ensure_ascii=False)};

async function seedDatabase() {{
  const mongoUri = process.env.MONGODB_URI || "mongodb+srv://user:pass@cluster.mongodb.net/canteen";
  console.log("[SEED] Connecting to MongoDB...");
  
  try {{
    await mongoose.connect(mongoUri);
    console.log("[SEED] Connected to MongoDB successfully!");
    
    console.log("[SEED] Removing old foods...");
    await Food.deleteMany({{}});
    
    console.log(`[SEED] Inserting ${{AMRUT_FOODS.length}} authentic items from Amrut Rates.xlsx...`);
    const docs = AMRUT_FOODS.map(f => ({{
      name: f.name,
      description: f.description,
      portion: f.portion,
      price: f.price,
      isVeg: f.isVeg,
      category: f.category,
      subCategory: f.subCategory,
      availableQuantity: f.availableQuantity,
      isAvailable: f.isAvailable,
      image: f.image,
      rating: f.rating
    }}));
    
    await Food.insertMany(docs);
    console.log("[SEED] Successfully seeded MongoDB with authentic Amrut Rates items!");
  }} catch (err) {{
    console.warn("[SEED] MongoDB seeding error:", err.message);
  }} finally {{
    try {{
      await mongoose.disconnect();
    }} catch (e) {{}}
  }}

  console.log("[SEED] Updating local JSON dataStore foods.json...");
  const fs = require("fs");
  const path = require("path");
  fs.writeFileSync(path.join(__dirname, "data/foods.json"), JSON.stringify(AMRUT_FOODS, null, 2), "utf-8");
  console.log("[SEED] Local foods.json updated successfully!");
  console.log("=== ALL DONE ===");
}}

seedDatabase().then(() => process.exit(0)).catch(e => {{
  console.error(e);
  process.exit(1);
}});
"""

with open('seed_amrut.js', 'w', encoding='utf-8') as f:
    f.write(seed_js_content)
print("Saved backend/seed_amrut.js successfully!")

# Save to frontend/src/data/canteenData.ts
frontend_items = []
for f in final_foods:
    frontend_items.append({
        "id": f["id"],
        "name": f["name"],
        "portion": f["portion"],
        "price": f["price"],
        "isVeg": f["isVeg"],
        "category": f["category"],
        "subCategory": f["subCategory"],
        "image": f["image"],
        "rating": f["rating"]
    })

frontend_canteen_ts = f"""import {{ Category, MenuItem, MealTiming }} from '../types';

export const CATEGORIES: Category[] = [
  {{ id: 'all', label: 'All Menu', iconName: 'grid' }},
  {{ id: 'breakfast', label: 'Breakfast', iconName: 'sunny' }},
  {{ id: 'lunch', label: 'Lunch', iconName: 'restaurant' }},
  {{ id: 'dinner', label: 'Dinner', iconName: 'moon' }},
  {{ id: 'snacks', label: 'Starters & Snacks', iconName: 'cafe' }},
  {{ id: 'beverages', label: 'Beverages', iconName: 'wine' }},
  {{ id: 'healthy', label: 'Healthy & Soups', iconName: 'leaf' }},
  {{ id: 'south-indian', label: 'South Indian', iconName: 'nutrition' }},
  {{ id: 'north-indian', label: 'North Indian & Breads', iconName: 'flame' }},
];

export const MENU_ITEMS: MenuItem[] = {json.dumps(frontend_items, indent=2, ensure_ascii=False)};

export const MEAL_TIMINGS: MealTiming[] = [
  {{ name: 'Breakfast', hours: '07:30 AM - 10:30 AM', icon: 'sunny', isActive: true }},
  {{ name: 'Lunch', hours: '12:30 PM - 03:30 PM', icon: 'restaurant', isActive: true }},
  {{ name: 'Snacks & High Tea', hours: '04:30 PM - 06:30 PM', icon: 'cafe', isActive: true }},
  {{ name: 'Dinner', hours: '07:30 PM - 10:30 PM', icon: 'moon', isActive: true }},
];
"""

with open('../frontend/src/data/canteenData.ts', 'w', encoding='utf-8') as f:
    f.write(frontend_canteen_ts)
print("Saved frontend/src/data/canteenData.ts successfully!")
