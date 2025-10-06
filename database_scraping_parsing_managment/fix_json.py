import json

# --- CONFIGURATION ---
# 1. Set the name of your broken input file.
malformed_file_path = 'ai_json.json' 

# 2. Set the name for the new, corrected output file.
corrected_file_path = 'fixed_summary_vector.json'
# ---------------------


# A dictionary to hold all the merged data
merged_data = {}

print(f"Attempting to read and fix '{malformed_file_path}'...")

try:
    with open(malformed_file_path, 'r', encoding='utf-8') as f:
        # Read the entire file content into a single string
        raw_text = f.read()

    # If the file is empty or just whitespace, stop.
    if not raw_text.strip():
        print("File is empty. No action taken.")
        exit()

    # Create a JSONDecoder instance to parse objects one at a time
    decoder = json.JSONDecoder()
    
    # Start scanning from the beginning of the string
    position = 0

    # Loop until we've scanned the entire string
    while position < len(raw_text):
        try:
            # Find the start of the next JSON object, skipping any whitespace
            obj_start = raw_text.find('{', position)
            if obj_start == -1:
                # No more JSON objects found
                break

            # Use raw_decode to parse one object and find where it ends
            # It returns the Python object and the index of the character after the object
            python_obj, end_index = decoder.raw_decode(raw_text[obj_start:])
            
            # Merge the newly found object into our main dictionary
            merged_data.update(python_obj)
            
            # Move the position marker to the end of the object we just processed
            position = obj_start + end_index

        except json.JSONDecodeError:
            # This can happen if there's trailing text that isn't valid JSON.
            # We'll stop here, having processed all valid objects.
            print(f"Warning: Encountered non-JSON data at the end of the file. Stopping parse.")
            break
            
    # Write the clean, merged data to the new file
    with open(corrected_file_path, 'w', encoding='utf-8') as f_out:
        json.dump(merged_data, f_out, indent=4, ensure_ascii=False)

    print(f"✅ Success! All JSON objects have been merged into '{corrected_file_path}'.")

except FileNotFoundError:
    print(f"Error: The file '{malformed_file_path}' was not found.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")