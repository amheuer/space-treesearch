import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define file paths
// ES Modules don't have a global __dirname. This is the modern equivalent.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = __dirname; // Keep this for consistency with the original script's logic
const labeledDataPath = path.join(dataDir, 'merged_data_with_labels.json');
const keyedDataPath = path.join(dataDir, 'merged_data.json');
const unifiedDataPath = path.join(dataDir, 'unified_data.json');

try {
    // 1. Read the two JSON files
    console.log('Reading JSON files...');
    const labeledData = JSON.parse(fs.readFileSync(labeledDataPath, 'utf-8'));
    const keyedData = JSON.parse(fs.readFileSync(keyedDataPath, 'utf-8'));
    console.log('Files read successfully.');

    // 2. Create a lookup map from the labeled data (array) using the title as the key
    // This is more efficient than searching the array for every item.
    const labelMap = new Map();
    for (const item of labeledData) {
        if (item.title) {
            labelMap.set(item.title, item.label);
        }
    }
    console.log(`Created a lookup map with ${labelMap.size} entries.`);

    let matchCount = 0;
    let noMatchCount = 0;

    // 3. Iterate through the keyed data and add the 'label' field
    console.log('Merging data...');
    for (const pmcId in keyedData) {
        if (Object.hasOwnProperty.call(keyedData, pmcId)) {
            const publication = keyedData[pmcId];
            if (publication.title && labelMap.has(publication.title)) {
                // Found a match, add the label
                publication.label = labelMap.get(publication.title);
                matchCount++;
            } else {
                // No match found, you can decide how to handle this.
                // Here, we'll assign a null label and log it.
                publication.label = null;
                noMatchCount++;
                console.warn(`- No matching label found for title: "${publication.title}" (PMC ID: ${pmcId})`);
            }
        }
    }

    // 4. Save the unified data to a new file
    fs.writeFileSync(unifiedDataPath, JSON.stringify(keyedData, null, 2));

    console.log('\n--- Merge Complete ---');
    console.log(`Successfully merged ${matchCount} records.`);
    if (noMatchCount > 0) {
        console.warn(`${noMatchCount} records did not have a matching label.`);
    }
    console.log(`Unified data saved to: ${unifiedDataPath}`);

} catch (error) {
    console.error('An error occurred:', error.message);
    if (error.code === 'ENOENT') {
        console.error(`Please ensure both '${path.basename(labeledDataPath)}' and '${path.basename(keyedDataPath)}' exist in the same directory as the script.`);
    }
}
