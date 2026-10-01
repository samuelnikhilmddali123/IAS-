import os
import shutil
from PIL import Image

src_dir = os.path.join('backend', 'public', 'ias images')
thumb_dir = os.path.join('backend', 'public', 'ias-thumbnails')
os.makedirs(thumb_dir, exist_ok=True)

dest_dirs = [
    os.path.join('frontend', 'public', 'ias-images'),
    os.path.join('frontend', 'public', 'ias images'),
    os.path.join('frontend', 'public', 'ias-thumbnails'),
    os.path.join('frontend', 'assets', 'ias-images'),
]

for d in dest_dirs:
    os.makedirs(d, exist_ok=True)

files = [f for f in os.listdir(src_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
print(f"Total images found to optimize: {len(files)}")

total_orig_size = 0
total_new_size = 0

for idx, filename in enumerate(files):
    src_path = os.path.join(src_dir, filename)
    orig_size = os.path.getsize(src_path)
    total_orig_size += orig_size

    try:
        with Image.open(src_path) as im:
            # Preserve aspect ratio, max width/height 600px (retina resolution for 250px food card)
            im.thumbnail((600, 600), Image.Resampling.LANCZOS)
            
            # Save optimized version in src_dir (in-place optimization)
            if filename.lower().endswith('.png'):
                # Optimize PNG with compression
                im.save(src_path, 'PNG', optimize=True, compress_level=8)
            else:
                if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
                    im = im.convert('RGB')
                im.save(src_path, 'JPEG', quality=85, optimize=True)

            # Also create .webp version in thumbnail and static folders
            base_name = os.path.splitext(filename)[0]
            webp_thumb_path = os.path.join(thumb_dir, f"{base_name}.webp")
            
            webp_im = im.convert('RGB') if im.mode in ('RGBA', 'LA', 'P') else im
            webp_im.save(webp_thumb_path, 'WEBP', quality=85, method=6)

            new_size = os.path.getsize(src_path)
            total_new_size += new_size

            # Sync to frontend directories
            for d in dest_dirs:
                shutil.copy2(src_path, os.path.join(d, filename))
                if os.path.exists(webp_thumb_path):
                    shutil.copy2(webp_thumb_path, os.path.join(d, f"{base_name}.webp"))

    except Exception as e:
        print(f"Error optimizing {filename}: {e}")

print(f"\nOptimization Complete!")
print(f"Original Total Size: {total_orig_size / (1024*1024):.2f} MB")
print(f"Optimized Total Size: {total_new_size / (1024*1024):.2f} MB")
print(f"Total Reduction: {(1 - total_new_size/total_orig_size)*100:.1f}%\n")
