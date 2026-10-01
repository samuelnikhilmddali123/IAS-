import urllib.request
import json

res = urllib.request.urlopen('http://localhost:5001/api/foods')
body = json.loads(res.read().decode('utf-8'))
foods = body.get('data') or body.get('foods') or body
print(f"Total foods returned by backend API: {len(foods)}")
print("\nFirst 10 items:")
for f in foods[:10]:
    print(f"  * {f['name']} - Rs. {f['price']} ({'VEG' if f['isVeg'] else 'NON-VEG'}) [{f.get('category')}]")
