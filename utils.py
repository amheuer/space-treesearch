#!/usr/bin/env python3
"""
util.py (PMC correction-link fixer)

Finds pages that contain the phrase "This corrects the article" and replaces
the CSV row URL with the href found in that correction box. If the href is
a relative path (starts with '/'), the script prepends:
    https://pmc.ncbi.nlm.nih.gov

Usage (dry-run recommended):
  python util.py -i SB_publication_PMC.csv -o SB_publication_PMC_fixed.csv --dry-run

Run without --dry-run to write the corrected CSV.

Outputs:
 - change_report.json (details of matches and changes)
 - optionally SB_publication_PMC_fixed.csv (if not --dry-run)
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

USER_AGENT = "Mozilla/5.0 (compatible; PMC-Link-Fixer/1.2)"
REQUEST_TIMEOUT = 20
SLEEP_BETWEEN = 0.3
REPORT_FILENAME = "change_report.json"
TARGET_PHRASE = "This corrects the article" 
PMC_BASE = "https://pmc.ncbi.nlm.nih.gov"

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

def normalize_url_no_fragment(u: str):
    if not u:
        return ""
    p = urlparse(u)
    # scheme://netloc + path (no fragment or query), strip trailing slash
    path = (p.path or "").rstrip("/")
    return f"{p.scheme}://{p.netloc}{path}".lower()

def resolve_pmc_href(href: str):
    """
    If href starts with '/', build canonical PMC URL using PMC_BASE.
    Otherwise return href as-is.
    """
    if not href:
        return None
    href = href.strip()
    if href.startswith("/"):
        return PMC_BASE + href
    return href

def find_correction_href(html: str, base_url: str = None):
    """
    Look for the element containing TARGET_PHRASE. From that element prefer:
      1) first <a href> whose resolved URL points to a different page and is not a fragment;
      2) otherwise search a few siblings and the parent similarly.
    When resolving relative hrefs we prepend https://pmc.ncbi.nlm.nih.gov for hrefs starting with '/'.
    Returns (resolved_href_or_None, reason, snippet)
    """
    if not html:
        return None, "no_html", None
    soup = BeautifulSoup(html, "lxml")
    phrase_re = re.compile(re.escape(TARGET_PHRASE), re.I)
    # Find elements containing the phrase in their visible text
    matched = [tag for tag in soup.find_all() if tag.get_text(" ", strip=True) and phrase_re.search(tag.get_text(" ", strip=True))]
    if not matched:
        return None, "phrase_not_found", None

    page_norm = normalize_url_no_fragment(base_url) if base_url else ""

    def candidates_from_element(el):
        cand = []
        for a in el.find_all("a", href=True):
            href = a.get("href", "").strip()
            # ignore pure fragments
            if href.startswith("#"):
                continue
            resolved = resolve_pmc_href(href)
            # if resolved lacks scheme, leave as-is (skip later if invalid)
            if not resolved:
                continue
            # skip anchors that resolve to same normalized page
            if page_norm and normalize_url_no_fragment(resolved) == page_norm:
                continue
            cand.append((resolved, a))
        return cand

    # Examine each matched element
    for el in matched:
        # 1) anchors inside el
        cands = candidates_from_element(el)
        if cands:
            # prefer anchors that include '/articles/PMC' (strong indicator)
            for resolved, _ in cands:
                if re.search(r"/articles/PMC\d+", resolved, re.I):
                    return resolved, "preferred_pmc_inside", el.get_text(" ", strip=True)[:400]
            # else take first candidate that differs from page
            return cands[0][0], "first_candidate_inside", el.get_text(" ", strip=True)[:400]

        # 2) check next siblings up to a few steps
        sib = el.find_next_sibling()
        steps = 0
        while sib and steps < 6:
            cands = candidates_from_element(sib)
            if cands:
                for resolved, _ in cands:
                    if re.search(r"/articles/PMC\d+", resolved, re.I):
                        return resolved, "preferred_pmc_in_sibling", (el.get_text(" ", strip=True) + " | " + sib.get_text(" ", strip=True))[:600]
                return cands[0][0], "first_candidate_in_sibling", (el.get_text(" ", strip=True) + " | " + sib.get_text(" ", strip=True))[:600]
            sib = sib.find_next_sibling()
            steps += 1

        # 3) check parent
        parent = el.parent
        if parent:
            cands = candidates_from_element(parent)
            if cands:
                for resolved, _ in cands:
                    if re.search(r"/articles/PMC\d+", resolved, re.I):
                        return resolved, "preferred_pmc_in_parent", parent.get_text(" ", strip=True)[:600]
                return cands[0][0], "first_candidate_in_parent", parent.get_text(" ", strip=True)[:600]

    # phrase found but no good anchors
    return None, "phrase_found_no_valid_anchor", matched[0].get_text(" ", strip=True)[:400]

def fix_corrections(input_csv, output_csv, dry_run=True, delay=SLEEP_BETWEEN):
    df = pd.read_csv(input_csv, dtype=str)
    # detect url column automatically
    url_col = None
    for c in df.columns:
        if df[c].astype(str).str.contains("http", case=False, na=False).any():
            url_col = c
            break
    if url_col is None:
        raise ValueError("No URL-like column found in CSV.")

    changes = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="processing rows"):
        url = row[url_col]
        if not isinstance(url, str) or not url.strip():
            continue

        html, status = fetch_html(url)
        if html is None:
            changes.append({
                "row_index": int(idx),
                "original_url": url,
                "action": "fetch_failed",
                "status": status
            })
            time.sleep(delay)
            continue

        found_href, reason, snippet = find_correction_href(html, base_url=url)
        if found_href:
            # ensure it's an HTTP/HTTPS url and different from the original page
            if is_http_url(found_href) and normalize_url_no_fragment(found_href) != normalize_url_no_fragment(url):
                changes.append({
                    "row_index": int(idx),
                    "original_url": url,
                    "corrected_url": found_href,
                    "reason": reason,
                    "snippet": snippet
                })
                df.at[idx, url_col] = found_href
            else:
                changes.append({
                    "row_index": int(idx),
                    "original_url": url,
                    "action": "found_but_not_replaced",
                    "found": found_href,
                    "reason": reason,
                    "snippet": snippet
                })
        else:
            changes.append({
                "row_index": int(idx),
                "original_url": url,
                "action": reason,
                "snippet": snippet
            })

        time.sleep(delay)

    report = {
        "input_csv": input_csv,
        "output_csv": output_csv,
        "url_column": url_col,
        "total_rows": int(len(df)),
        "num_changes": sum(1 for r in changes if r.get("corrected_url")),
        "num_fetch_failed": sum(1 for r in changes if r.get("action") == "fetch_failed"),
        "num_found_but_not_replaced": sum(1 for r in changes if r.get("action") == "found_but_not_replaced"),
        "num_phrase_found_no_valid_anchor": sum(1 for r in changes if r.get("action") == "phrase_found_no_valid_anchor"),
        "changes_detail": changes
    }

    with open(REPORT_FILENAME, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2, ensure_ascii=False)

    if not dry_run:
        df.to_csv(output_csv, index=False)

    return report

def main_cli():
    parser = argparse.ArgumentParser(description='Replace CSV links that are "author correction" pages by the link inside the correction box with phrase "This corrects the article".')
    parser.add_argument("-i", "--input", required=True, help="Input CSV path")
    parser.add_argument("-o", "--output", required=False, default="fixed_output.csv", help="Output CSV path")
    parser.add_argument("--dry-run", action="store_true", help="Produce report only; do not write output CSV")
    parser.add_argument("--delay", type=float, default=SLEEP_BETWEEN, help="Seconds to sleep between requests")
    args = parser.parse_args()

    report = fix_corrections(args.input, args.output, dry_run=args.dry_run, delay=args.delay)
    print("Report summary:")
    print(json.dumps({
        "input_csv": report["input_csv"],
        "output_csv": report["output_csv"],
        "url_column": report["url_column"],
        "total_rows": report["total_rows"],
        "num_changes": report["num_changes"],
        "num_fetch_failed": report["num_fetch_failed"],
        "num_found_but_not_replaced": report["num_found_but_not_replaced"],
        "num_phrase_found_no_valid_anchor": report["num_phrase_found_no_valid_anchor"]
    }, indent=2))

if __name__ == "__main__":
    main_cli()

