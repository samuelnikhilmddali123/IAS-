import zipfile
import xml.etree.ElementTree as ET
import json
import re

with zipfile.ZipFile('Amrut Rates.xlsx') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for elem in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            t = ''.join([t_elem.text or '' for t_elem in elem.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')])
            shared_strings.append(t)
    
    def parse_sheet_cells(sheet_file):
        tree = ET.fromstring(z.read(sheet_file))
        rows = []
        for row in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            r_idx = int(row.get('r'))
            cells = {}
            for cell in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                ref = cell.get('r')
                col = ''.join([c for c in ref if c.isalpha()])
                t = cell.get('t')
                v = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit() and int(val) < len(shared_strings):
                    val = shared_strings[int(val)]
                cells[col] = val.strip()
            rows.append((r_idx, cells))
        return rows

    veg_rows = parse_sheet_cells('xl/worksheets/sheet1.xml')
    gen_rows = parse_sheet_cells('xl/worksheets/sheet2.xml')
    nonveg_rows = parse_sheet_cells('xl/worksheets/sheet3.xml')

def clean_price(p_str, default_p=0):
    if not p_str or not p_str.strip():
        return default_p
    p_str = p_str.replace('/-', '').replace('-', '.').replace(' ', '')
    if p_str.count('.') > 1:
        parts = p_str.split('.')
        p_str = ''.join(parts[:-1]) + '.' + parts[-1]
    try:
        val = float(p_str)
        return int(val) if val.is_integer() else val
    except:
        m = re.search(r'\d+', p_str)
        return int(m.group()) if m else default_p

def clean_name(n):
    n = n.strip()
    # Replace multiple spaces
    n = re.sub(r'\s+', ' ', n)
    # Fix common abbreviations / typos
    fixes = {
        'sweet corn soup': 'Sweet Corn Soup',
        'Veg manchow': 'Veg Manchow Soup',
        'Veg hot & sour': 'Veg Hot & Sour Soup',
        'Lemon coriander soup': 'Lemon Coriander Soup',
        'Cream of mushroom': 'Cream of Mushroom Soup',
        'Veg corn soup': 'Veg Corn Soup',
        'Green salad': 'Fresh Green Salad',
        'Onion pakoda': 'Crispy Onion Pakoda',
        'French fries': 'Golden French Fries',
        'Veg rolls-10': 'Crispy Veg Rolls (10 pcs)',
        'Veg lollipops-10': 'Veg Lollipops (10 pcs)',
        'Veg cutlets-10': 'Crispy Veg Cutlets (10 pcs)',
        'Veg fingers-10': 'Veg Crispy Fingers (10 pcs)',
        'Potto cheese balls-10': 'Potato Cheese Balls (10 pcs)',
        'Aloo tiki-10': 'Aloo Tikki (10 pcs)',
        'Har bhar kabab-10': 'Hara Bhara Kabab (10 pcs)',
        'Veg satay': 'Paneer Veg Satay Skewers',
        'Boiled corn': 'Steamed Sweet Corn',
        'Corn rolls-10': 'Crispy Corn Rolls (10 pcs)',
        'Veg manchuria': 'Veg Manchurian',
        'Crispy veg': 'Crispy Fried Veggies',
        'Crispy corn': 'Crispy Fried Corn',
        'GOBI Manchuria': 'Gobi Manchurian',
        'GOBI -65': 'Gobi 65',
        'GOBI chilli': 'Chilli Gobi',
        'Baby corn Manchuria': 'Baby Corn Manchurian',
        'Baby corn -65': 'Baby Corn 65',
        'Baby corn chilli': 'Chilli Baby Corn',
        'Crispy baby corn': 'Crispy Golden Baby Corn',
        'Golden fried baby corn': 'Golden Fried Baby Corn',
        'Mushroom Manchuria': 'Mushroom Manchurian',
        'Mushroom-65': 'Mushroom 65',
        'Mushroom chilli': 'Chilli Mushroom',
        'Loose mushroom': 'Loose Crispy Mushroom',
        'Mushroom pakoda': 'Mushroom Pakoda',
        'Butter Garlic mushroom': 'Butter Garlic Mushroom',
        'Paneer rolls-10': 'Paneer Spring Rolls (10 pcs)',
        'Paneer Manchuria': 'Paneer Manchurian',
        'Paneer-65': 'Paneer 65',
        'Paneer chilli': 'Chilli Paneer',
        'Crispy paneer': 'Crispy Paneer Bites',
        'Paneer stick-10': 'Paneer Sticks (10 pcs)',
        'Honey lemon paneer': 'Honey Lemon Glazed Paneer',
        'Masala omelet': 'Spicy Masala Omelette',
        'cheese omlet': 'Cheese Loaded Omelette',
        'Egg-65': 'Egg 65',
        'Veg noodles': 'Veg Hakka Noodles',
        'Egg noodles': 'Egg Stir-Fried Noodles',
        'Schezwan noodles': 'Veg Schezwan Noodles',
        'plain rice': 'Steamed Plain Rice',
        'jeera rice': 'Fragrant Jeera Rice',
        'Biryani rice': 'Kuska Biryani Rice',
        'veg fried rice': 'Veg Fried Rice',
        'egg fried rice': 'Egg Fried Rice',
        'paneer fried rice': 'Paneer Fried Rice',
        'curd rice': 'Tempered Curd Rice',
        'Daal fry': 'Dal Fry',
        'Daal dhadka': 'Yellow Dal Tadka',
        'Daal makani': 'Dal Makhani',
        'Plain Palak': 'Homestyle Palak Curry',
        'aloo palak': 'Aloo Palak Curry',
        'Palak paneer': 'Palak Paneer',
        'Chenna masal': 'Punjabi Chana Masala',
        'Aloo chenna masala': 'Aloo Chana Masala',
        'Mushroom curry': 'Mushroom Masala Curry',
        'Aloo mater curry': 'Aloo Matar Masala',
        'Kadai veg curry': 'Kadai Veg Curry',
        'Mixed veg curry': 'Mixed Veg Curry',
        'Tomato cashews curry': 'Tomato Kaju Cashew Curry',
        'Malai kofta': 'Shahi Malai Kofta',
        'Paneer butter masala': 'Paneer Butter Masala',
        'Methi Chaman': 'Kashmiri Methi Chaman',
        'Kadai paneer curry': 'Kadai Paneer Masala',
        'egg burji': 'Egg Bhurji (Scrambled)',
        'Egg curry': 'Homestyle Egg Curry',
        'egg palak': 'Egg Palak Curry',
        'Water-250ML': 'Mineral Water (250ml)',
        'Water-500ML': 'Mineral Water (500ml)',
        'Water-1L': 'Mineral Water (1 Litre)',
        'thums up': 'Thums Up (Cold Can/Bottle)',
        'spirit': 'Sprite (Chilled)',
        'coke': 'Coca-Cola (Chilled)',
        'fanta': 'Fanta Orange (Chilled)',
        'maaza': 'Maaza Mango Drink',
        'pulpy orange': 'Minute Maid Pulpy Orange',
        'sweet laasi': 'Punjabi Sweet Lassi',
        'Swiss Goli soda': 'Swiss Goli Soda (Flavoured)',
        'diet coke': 'Diet Coke Can',
        'KINLEY SODA': 'Kinley Soda (Sparkling)',
        'Lemon soda': 'Fresh Lemon Soda',
        'Butter milk': 'Spiced Masala Buttermilk',
        'Pulka': 'Soft Phulka Roti',
        'Chapati': 'Wheat Chapati',
        'Parota': 'Malabar Parotta',
        'Butter pulka': 'Ghee / Butter Phulka',
        'Tandoori Roti': 'Tandoori Roti',
        'Tandoori Butter Roti': 'Tandoori Butter Roti',
        'Tandoori Naan': 'Tandoori Naan',
        'Tandoori butter Naan': 'Tandoori Butter Naan',
        'Tandoori garlic Naan': 'Tandoori Garlic Naan',
        'Kalmi kabab-(2 pieces)': 'Kalmi Kabab (2 pcs)',
        'Chicken tikka-(5 pieces)': 'Chicken Tikka (5 pcs)',
        'Harali tikka-(5 pieces)': 'Hariyali Chicken Tikka (5 pcs)',
        'Malai tikka-(5 pieces)': 'Murgh Malai Tikka (5 pcs)',
        'Achari tikka-(5 pieces)': 'Achari Chicken Tikka (5 pcs)',
        'Tandoori full joint-(1 piece )': 'Tandoori Chicken Joint (1 pc)',
        'Tandoori Half': 'Tandoori Chicken (Half)',
        'Tandoori full': 'Tandoori Chicken (Full)',
        'CHOCOBAR': 'Kwality Wall’s Chocobar',
        'VANILLA CUP': 'Vanilla Ice Cream Cup',
        'BUTTER SCOTCH CUP': 'Butterscotch Ice Cream Cup',
        'silver buffet': 'Silver Grand Dining Buffet',
        'gold buffet': 'Gold Executive Buffet Spread',
        'platinum buffet': 'Platinum Royal VIP Buffet',
        'Staff buffet': 'Special Staff Dining Buffet',
        'chicken sweet corn': 'Chicken Sweet Corn Soup',
        'chicken manchow': 'Chicken Manchow Soup',
        'chicken hot & sour': 'Chicken Hot & Sour Soup',
        'cream of chicken': 'Cream of Chicken Soup',
        'Chicken lemon coriander soup': 'Chicken Lemon Coriander Soup',
        'chicken noodels': 'Chicken Hakka Noodles',
        'schezwan chicken noodels': 'Schezwan Chicken Noodles',
        'mixed non veg noodels': 'Mixed Non-Veg Noodles (Chicken & Egg)',
        'methi chicken curry': 'Methi Chicken Curry',
        'butter chicken curry': 'Butter Chicken Masala',
        'kadai chicken curry': 'Kadai Chicken Curry',
        'afghani chicken curry': 'Afghani Chicken Gravy',
        'maharani chicken curry': 'Maharani Chicken Curry',
        'Kolhapuri chicken curry': 'Kolhapuri Chicken Curry',
        'malai chicken curry': 'Murgh Malai Chicken Curry',
        'punjabi chicken curry': 'Punjabi Dhaba Chicken Curry',
        'kaju chicken curry': 'Kaju Cashew Chicken Curry',
        'sp chicken curry': 'Special Andhra Chicken Curry',
        'Chilli chicken': 'Chilli Chicken Dry',
        'chicken kallimirchi-Bones': 'Chicken Kali Mirchi (Bone-in)',
        'Paper chicken': 'Pepper Chicken Dry',
        'Dum chicken curry': 'Dum Chicken Masala',
        'Chicken-65': 'Chicken 65',
        'Chicken manchuria': 'Chicken Manchurian',
        'natukodi curry': 'Country Chicken Natukodi Curry',
        'Chicken-555': 'Crispy Chicken 555',
        'natukodi fry': 'Country Chicken Natukodi Fry',
        'Chicken majestic': 'Hyderabad Chicken Majestic',
        'mutton curry': 'Tender Mutton Curry',
        'Crispy chicken': 'Crispy Fried Chicken',
        'mutton fry': 'Spicy Mutton Fry',
        'Rajadhani chicken': 'Rajadhani Special Chicken',
        'mutton keema curry': 'Mutton Keema Masala',
        'Lemon chicken': 'Tangy Lemon Chicken',
        'Dragon chicken': 'Fiery Dragon Chicken',
        'Loose chicken': 'Crispy Loose Chicken',
        'Chicken garlic /ginger': 'Garlic Ginger Chicken',
        'Schezwan chicken': 'Schezwan Chicken',
        'Chicken fried rice': 'Chicken Fried Rice',
        'chicken pakoda': 'Crispy Chicken Pakoda',
        'Schezwan chicken fried rice': 'Schezwan Chicken Fried Rice',
        'Cashew chicken': 'Kaju Cashew Chicken',
        'Mixed NON VEG fried rice': 'Mixed Non-Veg Fried Rice',
        'Chicken drumsticks-4': 'Crispy Chicken Drumsticks (4 pcs)',
        'Prawns fried rice': 'Prawns Fried Rice',
        'Chicken wings-6': 'Spicy Chicken Wings (6 pcs)',
        'Chicken lallipop-6': 'Chicken Lollipop (6 pcs)',
        'Amrut chicken': 'Amrut Signature Chicken Special',
        'Goa chicken': 'Goan Style Chicken Curry',
        'Chicken gulazara': 'Chicken Gulzara Special',
        'Cream chicken': 'Creamy Rich Malai Chicken',
        'Salt & pepper chicken': 'Salt & Pepper Chicken Dry',
        'chicken dum biryani-3(pcs)': 'Chicken Dum Biryani (3 pcs)',
        'chicken fry biryani': 'Chicken Fry Piece Biryani',
        'sp chicken biryani': 'Special Boneless Chicken Biryani',
        'chicken wings biryani-3(pcs)': 'Chicken Wings Biryani (3 pcs)',
        'Apollo crispy fish': 'Crispy Apollo Fish',
        'mutton dum biryani': 'Hyderabadi Mutton Dum Biryani',
        'Chilli Apollo fish': 'Chilli Apollo Fish',
        'mutton fry biryani': 'Mutton Fry Piece Biryani',
        'Apollo fry': 'Apollo Fish Fry',
        'sp mutton biryani': 'Special Mutton Biryani',
        'mutton keema biryani': 'Mutton Keema Biryani',
        'Apollo fish curry': 'Apollo Fish Masala Curry',
        'fish biryani': 'Seafood Fish Dum Biryani',
        'Loose prawns': 'Crispy Loose Prawns',
        'prawns biryani': 'Tiger Prawns Biryani',
        'Chilli prawns': 'Chilli Prawns',
        'Prawns-65': 'Crispy Prawns 65',
        'Prawns curry': 'Coastal Prawns Masala Curry',
        'Crunchy chicken': 'Crunchy Crusted Chicken',
        'Thread chicken': 'Crispy Thread Wrapped Chicken',
        'Dream nut chicken': 'Dream Nut Cashew Chicken',
        'Apollo chicken': 'Apollo Chicken Spl'
    }
    return fixes.get(n, n.title())

# Let's verify prices for items without explicit price in excel
default_prices = {
    'Goa chicken': 320,
    'Chicken gulazara': 320,
    'Cream chicken': 320,
    'Salt & pepper chicken': 300,
    'Crunchy chicken': 300,
    'Thread chicken': 320,
    'Dream nut chicken': 320,
    'Apollo chicken': 300
}

raw_items = []

# 1. Veg
for r_idx, c in veg_rows:
    code_l, name_l, price_l = c.get('B', ''), c.get('C', ''), c.get('D', '')
    if name_l and name_l.strip():
        raw_items.append({'code': code_l, 'name': name_l, 'price': clean_price(price_l, default_prices.get(name_l.strip(), 150)), 'sheet': 'Veg', 'side': 'left'})
    
    code_r, name_r, price_r = c.get('F', ''), c.get('G', ''), c.get('H', '')
    if name_r and name_r.strip():
        raw_items.append({'code': code_r, 'name': name_r, 'price': clean_price(price_r, default_prices.get(name_r.strip(), 200)), 'sheet': 'Veg', 'side': 'right'})

# 2. Gen
for r_idx, c in gen_rows:
    code_l, name_l, price_l = c.get('B', ''), c.get('C', ''), c.get('D', '')
    if name_l and name_l.strip():
        raw_items.append({'code': code_l, 'name': name_l, 'price': clean_price(price_l, 20), 'sheet': 'Gen', 'side': 'left'})
    
    code_r, name_r, price_r = c.get('E', ''), c.get('F', ''), c.get('G', '')
    if name_r and name_r.strip():
        raw_items.append({'code': code_r, 'name': name_r, 'price': clean_price(price_r, 30), 'sheet': 'Gen', 'side': 'right'})

# 3. NonVeg
for r_idx, c in nonveg_rows:
    code_l, name_l, price_l = c.get('A', ''), c.get('B', ''), c.get('C', '')
    if name_l and name_l.strip():
        raw_items.append({'code': code_l, 'name': name_l, 'price': clean_price(price_l, default_prices.get(name_l.strip(), 300)), 'sheet': 'NonVeg', 'side': 'left'})
    
    code_r, name_r, price_r = c.get('E', ''), c.get('F', ''), c.get('G', '')
    if name_r and name_r.strip():
        raw_items.append({'code': code_r, 'name': name_r, 'price': clean_price(price_r, default_prices.get(name_r.strip(), 350)), 'sheet': 'NonVeg', 'side': 'right'})

print(f"Total raw items collected: {len(raw_items)}")
seen_names = set()
unique_items = []
for it in raw_items:
    c_name = clean_name(it['name'])
    if c_name not in seen_names:
        seen_names.add(c_name)
        unique_items.append({
            'code': it['code'],
            'raw_name': it['name'],
            'name': c_name,
            'price': it['price'],
            'sheet': it['sheet']
        })

print(f"Total unique items: {len(unique_items)}")
for i, it in enumerate(unique_items, 1):
    print(f"{i:3d}. Code: {it['code']:4s} | {it['name']:38s} | Rs. {it['price']:4d} | Sheet: {it['sheet']}")
