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

print("=== ALL VEG ROWS ===")
for r_idx, c in veg_rows:
    print(f"Row {r_idx:2d}: {c}")

print("\n=== ALL GEN ROWS ===")
for r_idx, c in gen_rows:
    print(f"Row {r_idx:2d}: {c}")

print("\n=== ALL NON-VEG ROWS ===")
for r_idx, c in nonveg_rows:
    print(f"Row {r_idx:2d}: {c}")
