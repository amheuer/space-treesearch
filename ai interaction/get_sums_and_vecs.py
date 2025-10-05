# Copyright 2025 Joshua Williams

import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import json
import time

# api configurations
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    raise ValueError("API key not found")

genai.configure(api_key=api_key)

model = genai.GenerativeModel("gemini-2.5-flash-lite")
vector_model = "gemini-embedding-001"

# loading in the csv file to read the urls
df = pd.read_csv("SB_publication_PMC_fixed.csv")

# set user-agent
headers = {
    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
}

# json filename
JSON = "ai_json.json"

results = {}

# gets id of the paper from the link
def get_id(link):
    split_link = link.split('/')
    for i in range(len(split_link)):
        if split_link[i].startswith("PMC"):
            id = split_link[i]
    return id

# call gemini api to get a summary given scraped information
def get_summary(text):
    prompt = f"Please provide a summary in around 500 characters and have 3 bullet points of the biggest takeways of the following text:\n\n{text}"
    summary = model.generate_content(prompt)
    return summary.text

# getting together all of the text to be handed over to the gemini api
def scrape_text(response, index):
    # create a BeautifulSoup object to parse the HTML
    soup = BeautifulSoup(response.content, 'html.parser')

    # key words to look for to create ai summary
    key_words = ["abstract", "summary", "result", "conclu"] 

    api_string = ""

    # find headers for the key words
    all_matching_headers = soup.find_all(
        'h2',
        string=lambda text: text and any(key in text.lower() for key in key_words)
    )

    all_matching_headers3 = soup.find_all(
        'h3',
        string=lambda text: text and any(key in text.lower() for key in key_words)
    )

    valid_headers = all_matching_headers + all_matching_headers3

    title = soup.select_one('title')
    if title:
        api_string = "Title: " + str(title.get_text(strip=True)) + "\n"
    else:
        api_string = "Title:\n"
        print("Title not found.")

    # print out progressive results 
    print(f'{index + 1}. {title.get_text(strip=True)}\n')

    if len(valid_headers) > 0:

        header_id_map = {}
        for header_tag in valid_headers:
            parent_section = header_tag.find_parent('section')

            if parent_section and parent_section.get('id'):
                # header text is what definitively contains the keywords at this point
                header_text = header_tag.string.strip()
                section_id = parent_section.get('id')

                # possibly useless
                header_id_map[header_text] = section_id
            else:
                print("no parents or ids")

        # to avoid overloading tokens, if the paper has two of the below sections, then it only gives one
        #   to the ai
        if "abstract" in header_id_map.keys() and "summary" in header_id_map.keys():
            del header_id_map["summary"]
        if "result" in header_id_map.keys() and "conclu" in header_id_map.keys():
            del header_id_map["conclu"]

        for header_text, header_id in header_id_map.items():
            # some sites have periods which cannot be properly parsed as is
            if '.' in header_id:
                header_id = header_id.replace('.', '\\.')

            # get the paragraphs just from the sections with the ids corresponding to the proper label
            #   and concatenate these into appropriate sections
            selector = f'section#{header_id} p'
            paragraphs = soup.select(selector)
            api_string += f"\n{header_text} Section:\n"
            
            if paragraphs:
                for p in paragraphs:
                    api_string += p.get_text(strip=True)
            else:
                print("no direct child p found")
    else:
        # if there are no sections then get the 10th-25th paragraphs to get a rough selection of the paper
        possible_paragraphs = soup.select("p")
        for i, para in enumerate(possible_paragraphs):
            if i > 10 and i < 25:
                para_text = para.get_text().strip()
                api_string = api_string + "\n" + para_text

    return api_string

def main():
    # batch variables
    current_batch_count = 0
    batch_ids = []
    batch_sums = []

    start_index = 0
    # with open(JSON, 'r', encoding='utf-8') as f:
    #     results = [json.loads(line) for line in f]
    #     start_index = len(results)

    print(f'start index: {start_index}')
    for i, link in enumerate(df['Link'], start=start_index):

        current_batch_count += 1

        id = get_id(link)
        batch_ids.append(id)

        # fetch the HTML content of the page
        response = requests.get(link, headers=headers)

        # if the page loads properly
        if response.status_code == 200:
            api_string = scrape_text(response, i)

            if api_string is None:
                continue

            summary = get_summary(api_string)

            batch_sums.append(summary)
            # 12 was chosen so that 
            if current_batch_count >= 12:

                global results

                result = genai.embed_content(
                    model=vector_model,
                    content=batch_sums,
                    task_type="RETRIEVAL_DOCUMENT"
                )
                vectors = result['embedding']

                for j in range(current_batch_count):
                    new_paper = {
                        batch_ids[j]: {
                            "summary": batch_sums[j],
                            "vector": vectors[j]
                        }
                    }
                    
                    results.update(new_paper)
                
                # reset batch variables
                current_batch_count = 0
                batch_ids = []
                batch_sums = []

                with open(JSON, "a", encoding="utf-8") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                    f.write('\n')

                # clear the results dict, since results are already saved to json
                results = {}

            # get token overflow after about 15 tpm
            if i % 12 == 0 and i != 0:
                time.sleep(60)

        else:
            print(f"Failed to retrieve page. Status code: {response.status_code}")

if __name__ == "__main__":
    main()
