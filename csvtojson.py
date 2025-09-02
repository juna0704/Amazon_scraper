import csv
import json

# Step 1: Set your file paths
csv_file_path = "amazon_products.csv"  # Your CSV file
json_file_path = "laptops.json"  # The JSON file to save

# Step 2: Read CSV and convert to a list of dictionaries
data = []
with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)  # Reads CSV rows as dictionaries
    for row in reader:
        # Optional: Convert empty strings to None
        row = {k: (v if v != "" else None) for k, v in row.items()}
        data.append(row)

# Step 3: Write data to JSON file
with open(json_file_path, "w", encoding='utf-8') as jsonfile:
    json.dump(data, jsonfile, indent=4, ensure_ascii=False)

print(f"✅ Successfully converted {csv_file_path} to {json_file_path}")
