#!/usr/bin/env python3
"""
util.py (PMC correction-link fixer + duplicates-aware title-verify + optional dedupe)

Behavior:
  1) Detect duplicate PMCID groups in the CSV (rows that share the same PMCID).
  2) For each duplicated PMCID group only:
       - fetch the linked paper's title (efetch XML preferred; fallback to HTML)
       - skip title-check if the page contains the correction phrase
       - if CSV title vs fetched title similarity < threshold: delete the row
  3) After duplicate-based deletions, perform the author-correction link fixes
     (look for "This corrects the article" and replace link with href inside box).
  4) Report everything in change_report.json.
  5) Default is dry-run (use --no-dry-run by omitting the flag to write CSV).

Usage:
  python util.py -i SB_publication_PMC.csv -o SB_publication_PMC_fixed.csv --dry-run
  python util.py -i SB_publication_PMC.csv -o SB_publication_PMC_fixed.csv --title-threshold 0.9

Notes:
 - This script only performs title-based deletion for rows in PMCID duplicate groups.
 - Adjust --title-threshold (0..1) if you want stricter or looser matching.
"""

import argparse
import json
import os
import re
import time
from urllib.parse import urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
from difflib import SequenceMatcher

# config
USER_AGENT = "Mozilla/5.0 (compatible; PMC-Link-Fixer/1.4)"
REQUEST_TIMEOUT = 20
SLEEP_BETWEEN = 0.34
REPORT_FILENAME = "change_report.json"
TARGET_PHRASE = "This corrects the article"
PMC_BASE = "https://pmc.ncbi.nlm.nih.gov"

PMCID_RE = re.compile(r"(PMC\d+)", re.I)
PMC_LINK_RE = re.compile(r"/pmc/articles/(PMC\d+)", re.I)


EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
NCBI_API_KEY = os.getenv("NCBI_API_KEY", None)



def is_http_url(s: str) -> bool:
    try:
        p = urlparse(s)
        return p.scheme in ("http", "https")
    except Exception:
        return False


def fetch_html(url: str):
    headers = {"User-Agent": USER_AGENT}
    try:
        r = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return r.text, r.status_code
    except Exception as e:
        return None, f"err:{e}"


def efetch_pmc_xml(pmcid: str):
    params = {"db": "pmc", "id": pmcid, "retmode": "xml"}
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    try:
        r = requests.get(EFETCH, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
        r.raise_for_status()
        return r.text
    except Exception:
        return None


#title extraction
def extract_title_from_pmc_xml(xml_text: str):
    try:
        soup = BeautifulSoup(xml_text, "lxml-xml")
        ttag = soup.find("article-title")
        if ttag:
            return " ".join(ttag.stripped_strings).strip()
    except Exception:
        pass
    return None


def extract_title_from_html(html: str):
    soup = BeautifulSoup(html, "lxml")
    meta_keys = [
        ('meta', {'name': 'dc.Title'}),
        ('meta', {'name': 'DC.title'}),
        ('meta', {'name': 'citation_title'}),
        ('meta', {'property': 'og:title'}),
        ('meta', {'name': 'title'}),
    ]
    for tag_name, attrs in meta_keys:
        try:
            tag = soup.find(tag_name, attrs=attrs)
            if tag:
                content = tag.get("content") or tag.string
                if content:
                    return content.strip()
        except Exception:
            pass
    t = soup.find("title")
    if t and t.string:
        return t.string.strip()
    h1 = soup.find("h1")
    if h1:
        txt = " ".join(h1.stripped_strings)
        if txt:
            return txt.strip()
    return None


def page_contains_correction_phrase(html: str):
    if not html:
        return False
    return re.search(re.escape(TARGET_PHRASE), html, re.I) is not None


def extract_pmcid_from_url(url: str):
    if not isinstance(url, str):
        return None
    m = PMCID_RE.search(url)
    if m:
        return m.group(1).upper()
    m2 = PMC_LINK_RE.search(url)
    if m2:
        return m2.group(1).upper()
    return None


def fetch_title_for_url(url: str):
    """
    Return (title_or_None, html_text_or_None).
    Prefer efetch XML when PMCID present; fallback to fetching page HTML.
    """
    pmc = extract_pmcid_from_url(url)
    if pmc:
        xml = efetch_pmc_xml(pmc)
        if xml:
            title = extract_title_from_pmc_xml(xml)
            if title:
                return title, xml
    # fallback to fetching page HTML
    html, status = fetch_html(url)
    if html:
        title = extract_title_from_html(html)
        return title, html
    return None, None


def normalize_title(t: str):
    if not t:
        return ""
    t2 = re.sub(r"[^\w\s]", " ", t.lower())
    t2 = re.sub(r"\s+", " ", t2).strip()
    return t2


def titles_similar(a: str, b: str, threshold=0.90):
    if not a or not b:
        return False
    a_n = normalize_title(a)
    b_n = normalize_title(b)
    if not a_n or not b_n:
        return False
    ratio = SequenceMatcher(None, a_n, b_n).ratio()
    return ratio >= float(threshold)



def normalize_url_no_fragment(u: str):
    if not u:
        return ""
    p = urlparse(u)
    path = (p.path or "").rstrip("/")
    return f"{p.scheme}://{p.netloc}{path}".lower()


def resolve_pmc_href(href: str):
    if not href:
        return None
    href = href.strip()
    if href.startswith("/"):
        return PMC_BASE + href
    return href


def find_correction_href(html: str, base_url: str = None):
    if not html:
        return None, "no_html", None
    soup = BeautifulSoup(html, "lxml")
    phrase_re = re.compile(re.escape(TARGET_PHRASE), re.I)
    matched = [tag for tag in soup.find_all() if tag.get_text(" ", strip=True) and phrase_re.search(tag.get_text(" ", strip=True))]
    if not matched:
        return None, "phrase_not_found", None

    page_norm = normalize_url_no_fragment(base_url) if base_url else ""

    def candidates_from_element(el):
        cand = []
        for a in el.find_all("a", href=True):
            href = a.get("href", "").strip()
            if href.startswith("#"):
                continue
            resolved = resolve_pmc_href(href)
            if not resolved:
                continue
            if page_norm and normalize_url_no_fragment(resolved) == page_norm:
                continue
            cand.append((resolved, a))
        return cand

    for el in matched:
        cands = candidates_from_element(el)
        if cands:
            return cands[0][0], "first_candidate_inside", el.get_text(" ", strip=True)[:400]
        sib = el.find_next_sibling()
        steps = 0
        while sib and steps < 6:
            cands = candidates_from_element(sib)
            if cands:
                return cands[0][0], "first_candidate_in_sibling", (el.get_text(" ", strip=True) + " | " + sib.get_text(" ", strip=True))[:600]
            sib = sib.find_next_sibling()
            steps += 1
        parent = el.parent
        if parent:
            cands = candidates_from_element(parent)
            if cands:
                return cands[0][0], "first_candidate_in_parent", parent.get_text(" ", strip=True)[:600]

    return None, "phrase_found_no_valid_anchor", matched[0].get_text(" ", strip=True)[:400]



def fix_corrections(input_csv, output_csv, dry_run=True, delay=SLEEP_BETWEEN, title_threshold=0.90):
    df = pd.read_csv(input_csv, dtype=str)

    # detect url and title columns
    url_col = None
    title_col = None
    for c in df.columns:
        if df[c].astype(str).str.contains("http", case=False, na=False).any():
            url_col = c
        if "title" in c.lower() and title_col is None:
            title_col = c
    if url_col is None:
        raise ValueError("No URL-like column found in CSV.")

    report = {
        "input_csv": input_csv,
        "output_csv": output_csv,
        "url_column": url_col,
        "title_column": title_col,
        "duplicate_title_deletions": [],
        "correction_changes": [],
        "errors": []
    }

    # identify duplicated PMCID groups
    df["_PMCID"] = df[url_col].apply(extract_pmcid_from_url)
    # group only non-null PMCIDs
    pmc_counts = df["_PMCID"].value_counts()
    duplicated_pmcs = set(pmc_counts[pmc_counts > 1].index.tolist())

    if duplicated_pmcs:
        # iterate duplicate groups
        for pmc in tqdm(sorted(duplicated_pmcs), desc="checking duplicate PMCID groups"):
            group = df[df["_PMCID"] == pmc].copy()
            # for each row in this duplicate group, fetch actual title and compare to CSV title
            for idx, row in group.iterrows():
                csv_title = row[title_col] if title_col and isinstance(row[title_col], str) else ""
                url = row[url_col] if isinstance(row[url_col], str) else ""
                if not csv_title or not url:
                    # skip if missing essential data
                    continue

                # fetch minimal html to check correction phrase first
                html, status = fetch_html(url)
                if html is None:
                    report["errors"].append({
                        "row_index": int(idx),
                        "original_url": url,
                        "action": "fetch_failed_before_title_check",
                        "status": status
                    })
                    time.sleep(delay)
                    continue

                # skip title-check if this page is a correction page
                if page_contains_correction_phrase(html):
                    # record that we skipped this row for deletion
                    report.setdefault("skipped_title_check_due_to_correction", []).append({
                        "row_index": int(idx),
                        "original_url": url,
                        "pmcid": pmc
                    })
                    time.sleep(delay)
                    continue

                # fetch the authoritative title (efetch if PMCID present)
                fetched_title, fetched_html = fetch_title_for_url(url)
                if not fetched_title:
                    report["errors"].append({
                        "row_index": int(idx),
                        "original_url": url,
                        "action": "title_fetch_failed_for_duplicate_group",
                    })
                    time.sleep(delay)
                    continue

                similar = titles_similar(csv_title, fetched_title, threshold=title_threshold)
                if not similar:
                    # Delete this row (only within duplicated PMCID groups)
                    report["duplicate_title_deletions"].append({
                        "row_index": int(idx),
                        "original_url": url,
                        "pmcid": pmc,
                        "csv_title": csv_title,
                        "fetched_title": fetched_title,
                        "similarity_threshold": float(title_threshold),
                        "action": "deleted_title_mismatch_in_duplicate_group"
                    })
                    # drop the row from df
                    df.drop(index=idx, inplace=True)
                else:
                    # record match
                    report.setdefault("duplicate_title_ok", []).append({
                        "row_index": int(idx),
                        "original_url": url,
                        "pmcid": pmc,
                        "action": "title_matched"
                    })
                time.sleep(delay)
    else:
        # no duplicate pmcids found
        report["note"] = "no_duplicate_pmcids_found"

    # clean up helper column & reset index before proceeding
    df.drop(columns=["_PMCID"], inplace=True, errors="ignore")
    df = df.reset_index(drop=True)

    # perform author-correction link fixes on remaining rows 
    corr_changes = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="processing rows (corrections)"):
        url = row[url_col]
        if not isinstance(url, str) or not url.strip():
            continue

        html, status = fetch_html(url)
        if html is None:
            corr_changes.append({
                "row_index": int(idx),
                "original_url": url,
                "action": "fetch_failed",
                "status": status
            })
            time.sleep(delay)
            continue

        found_href, reason, snippet = find_correction_href(html, base_url=url)
        if found_href:
            if is_http_url(found_href) and normalize_url_no_fragment(found_href) != normalize_url_no_fragment(url):
                corr_changes.append({
                    "row_index": int(idx),
                    "original_url": url,
                    "corrected_url": found_href,
                    "reason": reason,
                    "snippet": snippet
                })
                df.at[idx, url_col] = found_href
            else:
                corr_changes.append({
                    "row_index": int(idx),
                    "original_url": url,
                    "action": "found_but_not_replaced",
                    "found": found_href,
                    "reason": reason,
                    "snippet": snippet
                })
        else:
            corr_changes.append({
                "row_index": int(idx),
                "original_url": url,
                "action": reason,
                "snippet": snippet
            })

        time.sleep(delay)

    report["correction_changes"] = corr_changes
    report["final_row_count"] = int(len(df))

    # write report
    with open(REPORT_FILENAME, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2, ensure_ascii=False)

    # write output csv if not dry-run
    if not dry_run:
        df.to_csv(output_csv, index=False)

    return report



def main_cli():
    parser = argparse.ArgumentParser(description='Fix author-correction links and (only for duplicated PMCID groups) delete rows whose CSV title differs from the linked paper title.')
    parser.add_argument("-i", "--input", required=True, help="Input CSV path")
    parser.add_argument("-o", "--output", required=False, default="fixed_output.csv", help="Output CSV path")
    parser.add_argument("--dry-run", action="store_true", help="Produce report only; do not write output CSV")
    parser.add_argument("--delay", type=float, default=SLEEP_BETWEEN, help="Seconds to sleep between requests")
    parser.add_argument("--title-threshold", type=float, default=0.90, help="Similarity threshold (0-1) to accept CSV title vs fetched title inside duplicate groups")
    args = parser.parse_args()

    report = fix_corrections(args.input, args.output, dry_run=args.dry_run, delay=args.delay, title_threshold=args.title_threshold)

    # print short summary
    summary = {
        "input_csv": report["input_csv"],
        "output_csv": report["output_csv"],
        "url_column": report["url_column"],
        "title_column": report["title_column"],
        "duplicate_title_deletions": len(report.get("duplicate_title_deletions", [])),
        "correction_changes": len(report.get("correction_changes", [])),
        "final_row_count": report.get("final_row_count")
    }
    print("Report summary:")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main_cli()

