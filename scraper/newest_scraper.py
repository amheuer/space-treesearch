#!/usr/bin/env python3
"""
Produce JSON keyed by PMCID, with only:
  title, authors, year, journal, references (list of PMCIDs)

Reference PMCID extraction rule:
  - For each <ref> in the PMC XML, look for any ext-link / a tag with href containing '/pmc/articles/PMC\d+'
    and extract the PMC\d+ substring (take the last occurrence).
  - If none found, as a last resort search the textual content of the <ref> for 'PMC\d+' and use that.
  - Otherwise skip the reference.

"""

import os
import re
import time
import json
import requests
import pandas as pd
from bs4 import BeautifulSoup
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()
NCBI_API_KEY = os.getenv("NCBI_API_KEY")

# Config - edit these as needed
INPUT_CSV = "SB_publication_PMC.csv"
OUTPUT_JSON = "pmc_papers.json"
EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PMC-Minimal-Scraper/1.0)"}
SLEEP_BETWEEN = 0.34   # be polite to NCBI

PMCID_RE = re.compile(r"(PMC\d+)", re.I)
PMC_LINK_RE = re.compile(r"/pmc/articles/(PMC\d+)", re.I)
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"'<>;]+")

# ---------- helpers ----------
def efetch_pmc_xml(pmcid: str):
    params = {"db": "pmc", "id": pmcid, "retmode": "xml"}
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    try:
        r = requests.get(EFETCH, params=params, headers=HEADERS, timeout=30)
        r.raise_for_status()
        return r.text
    except Exception:
        return None

def parse_metadata_from_xml(xml_text: str):
    soup = BeautifulSoup(xml_text, "lxml-xml")
    # title
    title = None
    ttag = soup.find("article-title")
    if ttag:
        title = " ".join(ttag.stripped_strings)
    # authors
    authors = []
    for contrib in soup.find_all("contrib", attrs={"contrib-type": "author"}):
        name_tag = contrib.find("name")
        if name_tag:
            surname = name_tag.find("surname")
            givens = name_tag.find("given-names")
            parts = []
            if surname and surname.string:
                parts.append(surname.string.strip())
            if givens and givens.string:
                parts.append(givens.string.strip())
            if parts:
                authors.append(", ".join(parts))
            else:
                # fallback to any text
                s = " ".join(contrib.stripped_strings)
                if s:
                    authors.append(s)
    # journal
    journal = None
    jtag = soup.find("journal-title")
    if jtag:
        journal = " ".join(jtag.stripped_strings)
    # year
    year = None
    pubdate = soup.find("pub-date")
    if pubdate:
        y = pubdate.find("year")
        if y and y.string:
            year = y.string.strip()
    if not year:
        # search small header area for a 4-digit year
        header_text = soup.get_text(" ", strip=True)[:1000]
        m = re.search(r"(19|20)\d{2}", header_text)
        if m:
            year = m.group(0)
    return title, authors, year, journal

def extract_pmcids_from_ref_node(ref_node):
    """
    Given a <ref> node (bs4 element), return a list of PMCID strings found via links or text.
    Strategy:
      1) look for <ext-link> or <a> with href containing '/pmc/articles/PMC\d+' (case-insensitive).
         If found, extract the PMC\d+ (take the last match in the href).
      2) else, search the text of the ref for 'PMC\d+' and extract all matches.
    Return unique list in order (may be empty).
    """
    found = []
    # 1) ext-link / a tags
    for tag in ref_node.find_all(["ext-link", "a"], href=True):
        href = tag.get("href") or ""
        # common forms: /pmc/articles/PMC1234567/, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/
        m = PMC_LINK_RE.search(href)
        if m:
            pmc = m.group(1).upper()
            if pmc not in found:
                found.append(pmc)
            # continue scanning to find any additional PMC links in this ref
    # 2) if none found via links, search textual content for 'PMC\d+'
    if not found:
        text = " ".join(ref_node.stripped_strings)
        for m in PMCID_RE.finditer(text):
            pmc = m.group(1).upper()
            if pmc not in found:
                found.append(pmc)
    return found

# ---------- main ----------
def main():
    if not os.path.exists(INPUT_CSV):
        raise FileNotFoundError(f"CSV not found: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)
    # detect URL and title columns
    url_col = None
    title_col = None
    for c in df.columns:
        if df[c].astype(str).str.contains("http", case=False, na=False).any():
            url_col = c
        if "title" in c.lower():
            title_col = c
    if url_col is None:
        raise ValueError("Could not detect a URL column in the CSV. Ensure the CSV includes the article link.")

    results = {}
    rows = list(df.itertuples(index=False))
    for row in tqdm(rows, desc="rows"):
        # convert to dict-like
        rowd = row._asdict() if hasattr(row, "_asdict") else dict(zip(df.columns, row))
        url = str(rowd[url_col])
        csv_title = str(rowd[title_col]) if title_col else None

        # extract PMCID from the URL (require PMCID presence)
        m = PMCID_RE.search(url)
        if not m:
            # normalize malformed forms by searching for PMC... anywhere in the URL
            m2 = re.search(r"(PMC\d+)", url, re.I)
            if not m2:
                # skip entries that don't have a PMCID in the link
                continue
            pmcid = m2.group(1).upper()
        else:
            pmcid = m.group(1).upper()

        # fetch XML from NCBI efetch
        xml = efetch_pmc_xml(pmcid)
        if not xml:
            # skip if we couldn't fetch xml
            time.sleep(SLEEP_BETWEEN)
            continue

        # parse metadata
        title, authors, year, journal = parse_metadata_from_xml(xml)
        if not title and csv_title:
            title = csv_title

        # parse ref nodes and extract PMCID links
        soup = BeautifulSoup(xml, "lxml-xml")
        ref_nodes = soup.find_all("ref")
        pmc_refs = []
        for ref in ref_nodes:
            pmcs_in_ref = extract_pmcids_from_ref_node(ref)
            for p in pmcs_in_ref:
                if p not in pmc_refs:
                    pmc_refs.append(p)
        # final object only contains the requested fields
        results[pmcid] = {
            "title": title if title else None,
            "authors": authors if authors else [],
            "year": year if year else None,
            "journal": journal if journal else None,
            "references": pmc_refs
        }
        # polite pause
        time.sleep(SLEEP_BETWEEN)

    # write minimal JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(results)} items to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()

