require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const JSONStream = require('JSONStream');
const path = require('path');

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error("ERROR: Please set the GOOGLE_API_KEY environment variable.");
    process.exit(1);
}

// --- Configuration ---
const INPUT_FILE = "client/src/data/merged_data.json";
const OUTPUT_FILE = "client/src/data/merged_data_with_labels.json";
const MODEL_NAME = "gemini-2.0-flash-lite";
const CONCURRENT_REQUESTS = 50;

// --- Helper: Delay function ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper: Process a single paper with infinite retry ---
async function generateLabel(paper, index, total, retryCount = 0) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
            {
                contents: [{
                    parts: [{
                        text: `Summarize the following title in 6 words or less: "${paper.title || ""}"`
                    }]
                }]
            },
            {
                headers: {
                    'x-goog-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const label = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        paper.label = label;
        console.log(`✅ ${index + 1}/${total}. ${paper.title.substring(0, 50)}... → ${label}`);
        return paper;
    } catch (err) {
        const retryMsg = retryCount > 0 ? ` (retry ${retryCount})` : '';
        console.log(`⚠️  ${index + 1}/${total}. ${paper.title.substring(0, 50)}... → Error${retryMsg}, retrying in 1s...`);
        await delay(20000);
        return generateLabel(paper, index, total, retryCount + 1);
    }
}

// --- Helper: Process papers in chunks ---
async function processInChunks(papers, chunkSize) {
    const results = [];
    
    for (let i = 0; i < papers.length; i += chunkSize) {
        const chunk = papers.slice(i, i + chunkSize);
        console.log(`\nProcessing papers ${i + 1} to ${Math.min(i + chunkSize, papers.length)}...`);
        
        const chunkResults = await Promise.all(
            chunk.map((paper, idx) => generateLabel(paper, i + idx, papers.length))
        );
        
        results.push(...chunkResults);
    }
    
    return results;
}

// --- Main ---
async function generateLabels() {
    try {
        console.log(`Starting label generation from '${path.basename(INPUT_FILE)}'...`);
        
        // Load all papers
        const papers = await new Promise((resolve, reject) => {
            const list = [];
            fs.createReadStream(INPUT_FILE)
                .pipe(JSONStream.parse('*'))
                .on('data', (data) => list.push(data))
                .on('end', () => resolve(list))
                .on('error', reject);
        });
        
        console.log(`Found ${papers.length} papers. Processing ${CONCURRENT_REQUESTS} at a time...\n`);
        
        // Process all papers in chunks
        await processInChunks(papers, CONCURRENT_REQUESTS);
        
        // Save updated papers
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(papers, null, 4));
        console.log(`\n✅ Labels written to '${OUTPUT_FILE}'`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response?.data) {
            console.error('API Error:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

generateLabels();