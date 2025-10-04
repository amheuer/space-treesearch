import requests
from bs4 import BeautifulSoup
import pandas as pd

df = pd.read_csv("SB_publication_PMC.csv")

for i, link in enumerate(df['Link']):

    # Set a User-Agent header to mimic a browser
    headers = {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    }

    key_words = ["abstract", "result", "conclusion", "discussion"]

    # Fetch the HTML content of the page
    response = requests.get(link, headers=headers)

    api_string = ""

    if response.status_code == 200:
        # Create a BeautifulSoup object to parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the article title (selector found via browser inspection)
        title = soup.select_one('title')
        
        # Find the abstract section
        all_matching_headers = soup.find_all(
            'h2',
            string=lambda text: text and any(key in text.lower() for key in key_words)
        )

        all_matching_headers3 = soup.find_all(
            'h3',
            string=lambda text: text and any(key in text.lower() for key in key_words)
        )

        combined_headers = all_matching_headers + all_matching_headers3

        if combined_headers == 0:
            print(f'row {i + 2} headers: {combined_headers}')
            continue

        if title:
            api_string = "Title: " + str(title.get_text(strip=True)) + "\n"
        else:
            print("Title not found.")

        header_id_map = {}

        for header_tag in combined_headers:
            parent_section = header_tag.find_parent('section')

            if parent_section and parent_section.get('id'):
                header_text = header_tag.string.strip()
                section_id = parent_section.get('id')

                header_id_map[header_text] = section_id
            else:
                print("no parents or ids")

        for key, value in header_id_map.items():
            selector = f'section#{value} p'

            paragraphs = soup.select(selector)
            api_string += f"\n{key} Section:\n"
            
            if paragraphs:
                for p in paragraphs:
                    api_string += p.get_text(strip=True)
            else:
                print("no direct child p found")

        # print(api_string)

    else:
        print(f"Failed to retrieve page. Status code: {response.status_code}")

