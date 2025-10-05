#!/usr/bin/env python3
"""
find_duplicates.py

Check for duplicate PMCIDs in a CSV file that contains PMC article links,
and print which rows each duplicate appears on.

Usage:
    python find_duplicates.py -i SB_publication_PMC.csv

Output (terminal):
 - Total rows
 - Unique PMCIDs
 - Number of duplicated PMCIDs
 - For each duplicated PMCID:
     PMCID: count
       rows: 12, 45, 78
       urls: https://..., https://..., https://...
"""

import argparse
import pandas as pd
import re
from pathlib import Path

def extract_pmcid(url: str):
    """Extract a PMCID (e.g., PMC1234567) from a URL or string."""
    if isinstance(url, str):
        m = re.search(r"(PMC\d+)", url, re.I)
        if m:
            return m.group(1).upper()
    return None

def main():
    parser = argparse.ArgumentParser(description="Find duplicate PMCIDs in a CSV file and show their row locations.")
    parser.add_argument("-i", "--input", required=True, help="Path to input CSV file")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"File not found: {input_path}")
        return

    # Load CSV
    try:
        df = pd.read_csv(input_path, dtype=str)
    except Exception as e:
        print(f"Failed to read CSV: {e}")
        return

    # Detect URL column (first column containing 'http' in any cell)
    url_col = None
    for c in df.columns:
        try:
            if df[c].astype(str).str.contains("http", case=False, na=False).any():
                url_col = c
                break
        except Exception:
            continue

    if not url_col:
        print("No column with URLs found in the CSV.")
        return

    # Extract PMCIDs and attach as a column
    df = df.reset_index(drop=False)  # keep original index in column 'index' (0-based)
    df.rename(columns={'index': '_orig_index'}, inplace=True)
    df["_PMCID"] = df[url_col].apply(extract_pmcid)

    total_rows = len(df)
    unique_pmcids = df["_PMCID"].nunique(dropna=True)

    # Find duplicate PMCIDs (those that appear more than once)
    dup_mask = df["_PMCID"].duplicated(keep=False) & df["_PMCID"].notna()
    dup_df = df[dup_mask].copy()
    dup_counts = dup_df["_PMCID"].value_counts()

    print(f"\nTotal rows: {total_rows}")
    print(f"Unique PMCIDs (non-null): {unique_pmcids}")
    print(f"Duplicated PMCIDs found: {len(dup_counts)}\n")

    if dup_counts.empty:
        print("No duplicate PMCIDs found.")
        return

    # For each duplicated PMCID, print count, row numbers (1-based), and the URL cell values
    for pmc_id, count in dup_counts.items():
        rows = dup_df[dup_df["_PMCID"] == pmc_id]
        # original CSV row numbers as 1-based (add 1 because pandas index starts at 0)
        row_numbers = (rows["_orig_index"] + 1).astype(int).tolist()
        urls = rows[url_col].astype(str).tolist()

        print(f"{pmc_id}: {count}")
        print(f"  rows: {', '.join(map(str, row_numbers))}")
        # print urls compactly (one per line with indentation)
        print("  urls:")
        for r_num, u in zip(row_numbers, urls):
            print(f"    {r_num}: {u}")
        print("")

if __name__ == "__main__":
    main()
























