#!/usr/bin/env python3
"""
Merge two JSON files keyed by ID (e.g., PMCID).

Behavior:
 - Only merge entries from file2 if their ID already exists in file1.
 - Updates existing dictionaries in file1 with any new fields from file2.
 - Does NOT add new IDs from file2 that aren't in file1.
"""

import json
import os

file1_path = 'pmc_papers.json'            # base file (has correct IDs)
file2_path = 'ai_fixed.json'  # supplemental file
output_path = 'merged_data.json'

if not os.path.exists(file1_path) or not os.path.exists(file2_path):
    raise FileNotFoundError("One or both input files were not found.")

# Load both files
with open(file1_path, 'r', encoding='utf-8') as f1:
    data1 = json.load(f1)
print(f"File1 loaded: {len(data1)} entries")

with open(file2_path, 'r', encoding='utf-8') as f2:
    data2 = json.load(f2)
print(f"File2 loaded: {len(data2)} entries")

# Merge only overlapping IDs
merged_data = {}
merged_count = 0

for item_id, value_dict in data1.items():
    # Start with the base data
    merged_data[item_id] = value_dict.copy()

    # Merge only if the same ID exists in file2
    if item_id in data2:
        merged_data[item_id].update(data2[item_id])
        merged_count += 1

print(f"Merged {merged_count} overlapping entries (IDs present in both files).")

# Write the merged JSON
with open(output_path, 'w', encoding='utf-8') as f_out:
    json.dump(merged_data, f_out, indent=2, ensure_ascii=False)

print(f" Successfully merged files into '{output_path}'")
print(f"Total entries in output: {len(merged_data)}")

