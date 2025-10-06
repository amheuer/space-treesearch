import json



file1_path = 'pmc_papers.json'
file2_path = 'fixed_summary_vector.json'
output_path = 'merged_data.json'

try:
    with open(file1_path, 'r', encoding='utf-8') as f1:
        data1 = json.load(f1)
        print(len(data1))
    
    with open(file2_path, 'r', encoding='utf-8') as f2:
        data2 = json.load(f2)
        print(len(data2))

except FileNotFoundError as e:
    print(f"file not found")

merged_data = data1.copy()

for item_id, value_dict in data2.items():
    if item_id in merged_data:
        # if the id already exists, update its dictionary with new key-value pairs
        merged_data[item_id].update(value_dict)

with open(output_path, 'w', encoding='utf-8') as f_out:
    json.dump(merged_data, f_out, indent=2, ensure_ascii=False)

print(f"Successfully merged files into '{output_path}'!")
