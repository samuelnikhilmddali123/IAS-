const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const imagesDir = path.join(__dirname, '../public/ias images');

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\.png|\.jpg|\.jpeg/gi, '')
    .replace(/-\s*\d+(\s*\(?\w*\)?)?/gi, '')
    .replace(/\([^)]*\)/gi, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

const DISH_IMAGE_MAP = {
  // Soups
  'tomato soup': 'Tomato soup.png',
  'sweet corn veg soup': 'sweet corn soup.png',
  'sweet corn soup': 'sweet corn soup.png',
  'veg corn soup': 'Veg corn soup.png',
  'veg manchow soup': 'Veg manchow.png',
  'veg manchow': 'Veg manchow.png',
  'veg hot & sour soup': 'Veg hot & sour.png',
  'veg hot and sour soup': 'Veg hot & sour.png',
  'veg hot & sour': 'Veg hot & sour.png',
  'lemon coriander soup': 'Lemon coriander soup.png',
  'cream of mushroom soup': 'Cream of mushroom.png',
  'cream of mushroom': 'Cream of mushroom.png',
  'chicken sweet corn soup': 'chicken sweet corn.png',
  'chicken hot & sour soup': 'chicken hot & sour.png',
  'chicken manchow soup': 'chicken manchow.png',
  'chicken lemon coriander soup': 'Chicken lemon coriander soup.png',
  'cream of chicken soup': 'cream of chicken.png',

  // Starters & Snacks
  'crispy onion pakoda': 'Onion pakoda.png',
  'onion pakoda': 'Onion pakoda.png',
  'golden french fries': 'French fries.png',
  'french fries': 'French fries.png',
  'crispy veg spring rolls': 'Veg rolls-10.png',
  'crispy veg rolls': 'Veg rolls-10.png',
  'crispy veg rolls (10 pcs)': 'Veg rolls-10.png',
  'veg rolls': 'Veg rolls-10.png',
  'veg cutlets': 'Veg cutlets-10.png',
  'crispy veg cutlets (10 pcs)': 'Veg cutlets-10.png',
  'potato cheese balls': 'Potto cheese balls-10.png',
  'potato cheese balls (10 pcs)': 'Potto cheese balls-10.png',
  'potto cheese balls': 'Potto cheese balls-10.png',
  'aloo tikki': 'Aloo tiki-10.png',
  'aloo tikki (10 pcs)': 'Aloo tiki-10.png',
  'hara bhara kabab': 'Har bhar kabab-10.png',
  'hara bhara kabab (10 pcs)': 'Har bhar kabab-10.png',
  'har bhar kabab': 'Har bhar kabab-10.png',
  'steamed sweet corn': 'Boiled corn.png',
  'boiled corn': 'Boiled corn.png',
  'crispy sweet corn': 'Crispy corn.png',
  'crispy fried corn': 'Crispy corn.png',
  'crispy corn': 'Crispy corn.png',
  'crispy corn rolls': 'Corn rolls-10.png',
  'crispy corn rolls (10 pcs)': 'Corn rolls-10.png',
  'corn rolls': 'Corn rolls-10.png',
  'crispy baby corn': 'Crispy baby corn.png',
  'crispy baby corn 65': 'Baby corn -65.png',
  'crispy golden baby corn': 'Golden fried baby corn.png',
  'baby corn 65': 'Baby corn -65.png',
  'baby corn manchurian': 'Baby corn Manchuria.png',
  'chilli baby corn': 'Baby corn chilli.png',
  'golden fried baby corn': 'Golden fried baby corn.png',
  'gobi manchurian': 'GOBI Manchuria.png',
  'chilli gobi': 'GOBI chilli.png',
  'gobi 65': 'GOBI -65.png',
  'veg manchurian': 'Veg manchuria.png',
  'crispy fried veggies': 'Crispy veg.png',
  'crispy veg': 'Crispy veg.png',
  'veg crispy fingers': 'Veg fingers-10.png',
  'veg crispy fingers (10 pcs)': 'Veg fingers-10.png',
  'veg fingers': 'Veg fingers-10.png',
  'veg lollipops': 'Veg lollipops-10.png',
  'paneer veg satay skewers': 'Veg satay.png',
  'veg satay': 'Veg satay.png',
  'fresh green garden salad': 'Green salad.png',
  'green salad': 'Green salad.png',

  // Paneer & Mushroom Starters
  'crispy paneer bites': 'Crispy paneer.png',
  'crispy paneer': 'Crispy paneer.png',
  'paneer 65': 'Paneer-65.png',
  'chilli paneer': 'Paneer chilli.png',
  'paneer manchurian': 'Paneer Manchuria.png',
  'honey lemon glazed paneer': 'Honey lemon paneer.png',
  'honey lemon paneer': 'Honey lemon paneer.png',
  'paneer spring rolls': 'Paneer rolls-10.png',
  'paneer spring rolls (10 pcs)': 'Paneer rolls-10.png',
  'paneer rolls': 'Paneer rolls-10.png',
  'paneer sticks': 'Paneer stick-10.png',
  'paneer stick': 'Paneer stick-10.png',
  'butter garlic mushroom': 'Butter Garlic mushroom.png',
  'crispy loose mushroom': 'Loose mushroom.png',
  'loose mushroom': 'Loose mushroom.png',
  'mushroom 65': 'Mushroom-65.png',
  'chilli mushroom': 'Mushroom chilli.png',
  'mushroom manchurian': 'Mushroom Manchuria.png',
  'mushroom pakoda': 'Mushroom pakoda.png',

  // Non-Veg Chicken Starters
  'chicken 65': 'Chicken-65.png',
  'chilli chicken': 'Chilli chicken.png',
  'chilli chicken dry': 'Chilli chicken.png',
  'chicken manchurian': 'Chicken manchuria.png',
  'crispy chicken 555': 'Chicken-555.png',
  'chicken 555': 'Chicken-555.png',
  'crispy chicken': 'Crispy chicken.png',
  'crispy fried chicken': 'Crispy chicken.png',
  'crunchy chicken': 'Crunchy chicken.png',
  'crispy loose chicken': 'Loose chicken.png',
  'loose chicken': 'Loose chicken.png',
  'apollo chicken': 'Apollo chicken.png',
  'chicken lollipop': 'Chicken lallipop-6.png',
  'chicken lollipop (6 pcs)': 'Chicken lallipop-6.png',
  'chicken drumsticks': 'Chicken drumsticks-4.png',
  'crispy chicken drumsticks (4 pcs)': 'Chicken drumsticks-4.png',
  'spicy chicken wings': 'Chicken wings-6.png',
  'spicy chicken wings (6 pcs)': 'Chicken wings-6.png',
  'chicken wings': 'Chicken wings-6.png',
  'hyderabad chicken majestic': 'Chicken majestic.png',
  'chicken majestic': 'Chicken majestic.png',
  'ginger garlic chicken': 'Chicken garlic ginger.png',
  'chicken garlic ginger': 'Chicken garlic ginger.png',
  'chicken pakoda': 'chicken pakoda.png',
  'crispy chicken pakoda': 'chicken pakoda.png',
  'cream chicken': 'Cream chicken.png',
  'fiery dragon chicken': 'Dragon chicken.png',
  'dragon chicken': 'Dragon chicken.png',
  'dream nut chicken': 'Dream nut chicken.png',
  'lemon chicken': 'Lemon chicken.png',
  'tangy lemon chicken': 'Lemon chicken.png',
  'kaju cashew chicken': 'Cashew chicken.png',
  'cashew chicken': 'Cashew chicken.png',
  'pepper chicken dry': 'chicken kallimirchi-Bones.png',
  'salt & pepper chicken dry': 'Salt & pepper chicken.png',
  'salt and pepper chicken': 'Salt & pepper chicken.png',
  'crispy thread wrapped chicken': 'Thread chicken.png',
  'thread chicken': 'Thread chicken.png',
  'chicken gulzara special': 'Chicken gulazara.png',
  'amrut special chicken': 'Amrut chicken.png',
  'rajadhani special chicken': 'Rajadhani chicken.png',

  // Seafood & Mutton Starters
  'crispy apollo fish': 'Apollo crispy fish.png',
  'apollo fish fry': 'Apollo fry.png',
  'apollo fry': 'Apollo fry.png',
  'chilli apollo fish': 'Chilli Apollo  fish.png',
  'crispy loose prawns': 'Loose prawns.png',
  'loose prawns': 'Loose prawns.png',
  'crispy prawns 65': 'Prawns-65.png',
  'prawns 65': 'Prawns-65.png',
  'chilli prawns': 'Chilli prawns.png',
  'spicy mutton fry': 'mutton fry.png',
  'mutton fry': 'mutton fry.png',

  // Tandoor & Kebabs
  'tandoori chicken half': 'Tandoori Half.png',
  'tandoori chicken (half)': 'Tandoori Half.png',
  'tandoori half': 'Tandoori Half.png',
  'tandoori chicken full': 'Tandoori full.png',
  'tandoori chicken (full)': 'Tandoori full.png',
  'tandoori full': 'Tandoori full.png',
  'tandoori chicken joint (1 pc)': 'Tandoori full joint-(1 piece ).png',
  'tandoori full joint': 'Tandoori full joint-(1 piece ).png',
  'chicken tikka': 'Chicken tikka-(5 pieces).png',
  'achari chicken tikka': 'Achari tikka-(5 pieces).png',
  'achari chicken tikka (5 pcs)': 'Achari tikka-(5 pieces).png',
  'hariyali chicken tikka': 'Harali tikka-(5 pieces).png',
  'murgh malai tikka': 'Malai tikka-(5 pieces).png',
  'murgh malai tikka (5 pcs)': 'Malai tikka-(5 pieces).png',
  'kalmi kabab': 'Kalmi kabab-(2 pieces).png',
  'kalmi kabab (2 pcs)': 'Kalmi kabab-(2 pieces).png',

  // Main Course - Veg Curries
  'yellow dal tadka': 'Daal dhadka.png',
  'dal tadka': 'Daal dhadka.png',
  'dal fry': 'Daal fry.png',
  'dal makhani': 'Daal makani.png',
  'palak paneer': 'Palak paneer.png',
  'paneer butter masala': 'Paneer butter masala.png',
  'kadai paneer masala': 'Kadai paneer curry.png',
  'kadai paneer': 'Kadai paneer curry.png',
  'kadai veg curry': 'Kadai veg curry.png',
  'mixed veg curry': 'Mixed veg curry.png',
  'shahi malai kofta': 'Malai kofta.png',
  'malai kofta': 'Malai kofta.png',
  'kashmiri methi chaman': 'Methi Chaman.png',
  'methi chaman': 'Methi Chaman.png',
  'aloo chana masala': 'Aloo chenna masala.png',
  'aloo matar masala': 'Aloo mater curry.png',
  'aloo mutter curry': 'Aloo mater curry.png',
  'aloo palak curry': 'aloo palak.png',
  'aloo palak': 'aloo palak.png',
  'punjabi chana masala': 'Chenna masal.png',
  'chana masala': 'Chenna masal.png',
  'homestyle plain palak curry': 'Plain Palak.png',
  'homestyle palak curry': 'Plain Palak.png',
  'plain palak': 'Plain Palak.png',
  'tomato kaju cashew curry': 'Tomato cashews curry.png',
  'tomato cashew curry': 'Tomato cashews curry.png',
  'mushroom masala curry': 'Mushroom curry.png',
  'mushroom curry': 'Mushroom curry.png',

  // Main Course - Non-Veg Curries
  'chicken kali mirchi (bone-in)': 'chicken kallimirchi-Bones.png',
  'chicken kali mirchi': 'chicken kallimirchi-Bones.png',
  'kallimirchi chicken': 'chicken kallimirchi-Bones.png',
  'murgh malai chicken curry': 'malai chicken curry.png',
  'tender mutton curry': 'mutton curry.png',
  'butter chicken masala': 'butter chicken curry.png',
  'butter chicken': 'butter chicken curry.png',
  'kadai chicken curry': 'kadai chicken curry.png',
  'afghani chicken gravy': 'afghani chicken curry.png',
  'dum chicken masala': 'Dum chicken curry.png',
  'kaju cashew chicken curry': 'kaju chicken curry.png',
  'kolhapuri chicken curry': 'Kolhapuri chicken curry.png',
  'maharani chicken curry': 'maharani chicken curry.png',
  'creamy rich malai chicken': 'malai chicken curry.png',
  'methi chicken curry': 'methi chicken curry.png',
  'punjabi chicken curry': 'punjabi chicken curry.png',
  'country chicken natukodi curry': 'natukodi curry.png',
  'country chicken natukodi fry': 'natukodi fry.png',
  'goan style chicken curry': 'Goa chicken.png',
  'special chicken curry': 'sp chicken curry.png',
  'sp chicken curry': 'sp chicken curry.png',
  'mutton curry': 'mutton curry.png',
  'mutton keema curry': 'mutton keema curry.png',
  'mutton keema masala': 'mutton keema curry.png',
  'apollo fish curry': 'Apollo fish curry.png',
  'apollo fish masala curry': 'Apollo fish curry.png',
  'coastal prawns masala curry': 'Prawns curry.png',
  'prawns curry': 'Prawns curry.png',

  // Eggs
  'egg bhurji': 'egg burji.png',
  'egg bhurji (scrambled)': 'egg burji.png',
  'homestyle egg curry': 'Egg curry.png',
  'egg curry': 'Egg curry.png',
  'egg 65': 'Egg-65.png',
  'egg palak curry': 'egg palak.png',
  'egg palak': 'egg palak.png',
  'cheese omelette': 'cheese omlet.png',
  'cheese loaded omelette': 'cheese omlet.png',
  'cheese omlet': 'cheese omlet.png',
  'masala omelette': 'Masala omelet.png',
  'masala omelet': 'Masala omelet.png',

  // Biryanis & Rice
  'hyderabadi chicken dum biryani': 'chicken dum biryani-3(pcs).png',
  'chicken dum biryani': 'chicken dum biryani-3(pcs).png',
  'chicken fry piece biryani': 'chicken fry biryani.png',
  'spicy chicken wings biryani': 'chicken wings biryani-3(pcs).png',
  'special boneless chicken biryani': 'sp chicken biryani.png',
  'special chicken biryani': 'sp chicken biryani.png',
  'special mutton biryani': 'sp mutton biryani.png',
  'mutton dum biryani': 'mutton dum biryani.png',
  'mutton fry biryani': 'mutton fry biryani.png',
  'mutton keema biryani': 'mutton keema biryani.png',
  'seafood fish dum biryani': 'fish biryani.png',
  'fish biryani': 'fish biryani.png',
  'tiger prawns biryani': 'prawns biryani.png',
  'prawns biryani': 'prawns biryani.png',
  'kuska biryani rice': 'Biryani rice.png',
  'biryani rice': 'Biryani rice.png',
  'steamed basmati rice': 'plain rice.png',
  'plain rice': 'plain rice.png',
  'fragrant jeera rice': 'jeera rice.png',
  'jeera rice': 'jeera rice.png',
  'tempered curd rice': 'curd rice.png',
  'curd rice': 'curd rice.png',

  // Noodles & Fried Rice
  'veg fried rice': 'veg fried rice.png',
  'paneer fried rice': 'paneer fried rice.png',
  'egg fried rice': 'egg fried rice.png',
  'chicken fried rice': 'Chicken fried rice.png',
  'schezwan chicken fried rice': 'Schezwan chicken fried rice.png',
  'mixed non-veg fried rice': 'Mixed NON VEG fried rice.png',
  'prawns fried rice': 'Prawns fried rice.png',
  'veg hakka noodles': 'Veg noodles.png',
  'veg noodles': 'Veg noodles.png',
  'veg schezwan noodles': 'Schezwan noodles.png',
  'schezwan noodles': 'Schezwan noodles.png',
  'egg hakka noodles': 'Egg noodles.png',
  'egg noodles': 'Egg noodles.png',
  'chicken hakka noodles': 'chicken noodels.png',
  'chicken noodles': 'chicken noodels.png',
  'schezwan chicken noodles': 'schezwan chicken noodels.png',
  'mixed non-veg noodles': 'mixed non veg noodels.png',

  // Breads
  'soft phulka roti': 'Pulka.png',
  'ghee / butter phulka': 'Pulka.png',
  'pulka': 'Pulka.png',
  'phulka': 'Pulka.png',
  'chapati': 'Chapati.png',
  'malabar parotta': 'Parota.png',
  'parota': 'Parota.png',
  'tandoori roti': 'Tandoori Roti.png',
  'tandoori butter roti': 'Tandoori Butter Roti.png',
  'tandoori naan': 'Tandoori Naan.png',
  'tandoori butter naan': 'Tandoori butter Naan.png',
  'tandoori garlic naan': 'Tandoori garlic Naan.png',

  // Beverages & Desserts
  'coca-cola': 'coke.png',
  'coca-cola (chilled)': 'coke.png',
  'coke': 'coke.png',
  'diet coke': 'diet coke.png',
  'thums up': 'thums up.png',
  'thums up (cold can/bottle)': 'thums up.png',
  'sprite': 'spirit.png',
  'sprite (chilled)': 'spirit.png',
  'spirit': 'spirit.png',
  'fanta': 'fanta.png',
  'maaza': 'maaza.png',
  'maaza mango drink': 'maaza.png',
  'minute maid pulpy orange': 'pulpy orange.png',
  'pulpy orange': 'pulpy orange.png',
  'swiss goli soda': 'Swiss Goli soda.png',
  'swiss goli soda (flavoured)': 'Swiss Goli soda.png',
  'fresh lemon soda': 'Lemon soda.png',
  'lemon soda': 'Lemon soda.png',
  'kinley soda': 'KINLEY   SODA.png',
  'spiced masala buttermilk': 'Butter milk.png',
  'butter milk': 'Butter milk.png',
  'sweet lassi': 'sweet laasi.png',
  'punjabi sweet lassi': 'sweet laasi.png',
  'sweet laasi': 'sweet laasi.png',
  'mineral water (1 litre)': 'Water-1L.png',
  'mineral water (1l)': 'Water-1L.png',
  'mineral water (500ml)': 'Water-500ML.png',
  'mineral water (250ml)': 'Water-250ML.png',
  'water-1l': 'Water-1L.png',
  'water-500ml': 'Water-500ML.png',
  'water-250ml': 'Water-250ML.png',
  'vanilla ice cream cup': 'VANILLA CUP.png',
  'vanilla cup': 'VANILLA CUP.png',
  'butterscotch ice cream cup': 'BUTTER SCOTCH CUP.png',
  'butter scotch cup': 'BUTTER SCOTCH CUP.png',
  'chocobar': 'CHOCOBAR.png',
  'chocobar ice cream': 'CHOCOBAR.png'
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully.');

  const Food = mongoose.model('Food', new mongoose.Schema({
    id: String,
    name: String,
    category: String,
    subCategory: String,
    image: String,
    price: Number,
    isVeg: Boolean
  }, { strict: false }));

  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

  const exactFileMap = new Map();
  const normalizedFileMap = new Map();

  for (const file of files) {
    const baseWithoutExt = file.replace(/\.[^/.]+$/, '').trim().toLowerCase();
    exactFileMap.set(baseWithoutExt, file);
    normalizedFileMap.set(normalizeName(file), file);
  }

  const allFoods = await Food.find({});
  console.log(`Found ${allFoods.length} foods in MongoDB database.`);

  let updatedCount = 0;
  let alreadyUpToDate = 0;
  let unmatchedList = [];

  for (const food of allFoods) {
    const rawName = (food.name || '').trim();
    const foodNameLower = rawName.toLowerCase();
    const foodNameNorm = normalizeName(rawName);

    let matchedFile = null;

    if (DISH_IMAGE_MAP[foodNameLower]) {
      matchedFile = DISH_IMAGE_MAP[foodNameLower];
    } else if (exactFileMap.has(foodNameLower)) {
      matchedFile = exactFileMap.get(foodNameLower);
    } else if (normalizedFileMap.has(foodNameNorm)) {
      matchedFile = normalizedFileMap.get(foodNameNorm);
    } else {
      for (const [key, val] of Object.entries(DISH_IMAGE_MAP)) {
        if (foodNameLower.includes(key) || key.includes(foodNameLower) || foodNameNorm.includes(normalizeName(key))) {
          matchedFile = val;
          break;
        }
      }
    }

    if (!matchedFile) {
      for (const [fNorm, fName] of normalizedFileMap.entries()) {
        if (fNorm.includes(foodNameNorm) || foodNameNorm.includes(fNorm)) {
          matchedFile = fName;
          break;
        }
      }
    }

    if (matchedFile && fs.existsSync(path.join(imagesDir, matchedFile))) {
      const imagePath = `/ias-images/${encodeURIComponent(matchedFile)}`;
      if (food.image !== imagePath) {
        food.image = imagePath;
        await food.save();
        updatedCount++;
        console.log(`[UPDATED] "${food.name}" => ${matchedFile}`);
      } else {
        alreadyUpToDate++;
      }
    } else {
      unmatchedList.push({ name: food.name, current: food.image });
      console.log(`[UNMATCHED] No image found for: "${food.name}"`);
    }
  }

  console.log('==============================================');
  console.log(`TOTAL FOODS: ${allFoods.length}`);
  console.log(`UPDATED: ${updatedCount}`);
  console.log(`ALREADY UP-TO-DATE: ${alreadyUpToDate}`);
  console.log(`UNMATCHED: ${unmatchedList.length}`);
  console.log('==============================================');

  // Sync foods.json
  const foodsJsonPath = path.join(__dirname, '../data/foods.json');
  if (fs.existsSync(foodsJsonPath)) {
    try {
      const raw = fs.readFileSync(foodsJsonPath, 'utf8');
      let localFoods = JSON.parse(raw);
      if (Array.isArray(localFoods)) {
        for (const food of localFoods) {
          const rawName = (food.name || '').trim();
          const foodNameLower = rawName.toLowerCase();
          const foodNameNorm = normalizeName(rawName);

          let matchedFile = DISH_IMAGE_MAP[foodNameLower] || exactFileMap.get(foodNameLower) || normalizedFileMap.get(foodNameNorm);
          if (!matchedFile) {
            for (const [key, val] of Object.entries(DISH_IMAGE_MAP)) {
              if (foodNameLower.includes(key) || key.includes(foodNameLower)) {
                matchedFile = val;
                break;
              }
            }
          }
          if (matchedFile) {
            food.image = `/ias-images/${encodeURIComponent(matchedFile)}`;
          }
        }
        fs.writeFileSync(foodsJsonPath, JSON.stringify(localFoods, null, 2), 'utf8');
        console.log(`Synced ${localFoods.length} items to data/foods.json`);
      }
    } catch (err) {
      console.warn('Could not sync foods.json:', err.message);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
