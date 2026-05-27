import pandas as pd
import numpy as np
import time
import re
import os
from datetime import datetime, timedelta
from io import StringIO
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from sqlalchemy import create_engine, text

BASE_URL = "https://market.sec.or.th/public/idisc/th/Viewmore/r59-2?DateType=1&DateFrom={date_from}&DateTo={date_to}"

# Where the historical scrape begins. The end is always "today" (computed at
# runtime) so a scheduled job keeps capturing new filings without code edits.
HISTORY_START = "20240101"


def generate_date_chunks(start=HISTORY_START):
    """Yield (date_from, date_to) 6-month windows from `start` up to today.

    The SEC page times out on large date ranges, so we split into half-year
    chunks (Jan–Jun, Jul–Dec). End date is clamped to today.
    """
    start_dt = datetime.strptime(start, "%Y%m%d").date()
    today = datetime.now().date()

    chunks = []
    cur = start_dt
    while cur <= today:
        if cur.month <= 6:
            end = cur.replace(month=6, day=30)
        else:
            end = cur.replace(month=12, day=31)
        end = min(end, today)
        chunks.append((cur.strftime("%Y%m%d"), end.strftime("%Y%m%d")))
        cur = end + timedelta(days=1)
    return chunks

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise SystemExit("DATABASE_URL is not set. See .env.example.")

CSV_BACKUP_FILE = "sec_data_backup.csv"

def scrape_chunk(driver, date_from, date_to):
    """Scrape one date-range chunk and return a cleaned DataFrame (or None)."""
    url = BASE_URL.format(date_from=date_from, date_to=date_to)
    print(f"  Fetching {date_from} → {date_to} ...")
    driver.get(url)

    try:
        table_el = WebDriverWait(driver, 180).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))
        )
        table_html = table_el.get_attribute('outerHTML')
    except Exception as e:
        print(f"  No table found for {date_from}-{date_to}: {e}")
        return None

    dfs = pd.read_html(StringIO(table_html))
    if not dfs:
        print(f"  No data for {date_from}-{date_to}.")
        return None

    df = dfs[0]
    print(f"  Rows: {len(df)}")

    df.rename(columns={
        'ชื่อบริษัท': 'symbol',
        'ชื่อผู้บริหาร': 'name',
        'ความสัมพันธ์ *': 'position',
        'ประเภทหลักทรัพย์': 'security_type',
        'วันที่ได้มา/จำหน่าย': 'trade_date',
        'จำนวน': 'volume',
        'ราคา': 'price',
        'วิธีการได้มา/จำหน่าย': 'transaction_type'
    }, inplace=True)

    def clean_symbol(text):
        match = re.search(r'\(([^)]+)\)$', str(text))
        return match.group(1).strip() if match else str(text)[:20]

    df['symbol'] = df['symbol'].apply(clean_symbol)
    df['volume'] = pd.to_numeric(df['volume'].astype(str).str.replace(',', ''), errors='coerce').fillna(0).astype(int)
    df['price'] = pd.to_numeric(df['price'].astype(str).str.replace(',', ''), errors='coerce').fillna(0.0)

    def convert_thai_date(date_str):
        try:
            day, month, thai_year = date_str.split('/')
            return f"{int(thai_year)-543}-{month}-{day}"
        except Exception:
            return None

    df['trade_date'] = df['trade_date'].apply(convert_thai_date)
    df['filing_date'] = df['trade_date']
    df = df.replace({np.nan: None})
    return df[['symbol', 'name', 'position', 'security_type', 'trade_date', 'volume', 'price', 'transaction_type', 'filing_date']]


def scrape_and_clean_data(date_chunks=None):
    if date_chunks is None:
        date_chunks = generate_date_chunks()
    print("Starting extraction...")

    chunks = []
    for date_from, date_to in date_chunks:
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--disable-dev-shm-usage")
        options.page_load_strategy = "none"
        driver = webdriver.Chrome(options=options)
        try:
            chunk = scrape_chunk(driver, date_from, date_to)
            if chunk is not None:
                chunks.append(chunk)
        finally:
            driver.quit()

    if not chunks:
        print("No data scraped.")
        return None

    final_df = pd.concat(chunks, ignore_index=True).drop_duplicates()
    print(f"Total rows after merge: {len(final_df)}")
    final_df.to_csv(CSV_BACKUP_FILE, index=False, encoding='utf-8-sig')
    print(f"Backup saved to {CSV_BACKUP_FILE}")
    return final_df

def load_backup_data(CSV_FILE=CSV_BACKUP_FILE):
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.")
        return None

    print(f"Reading {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE)

    # Ensure data types match PostgreSQL schema
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce').fillna(0).astype(int)
    df['price'] = pd.to_numeric(df['price'], errors='coerce').fillna(0.0)
    
    # Handle NaNs for SQL compatibility
    df = df.replace({np.nan: None})
    
    # Verify column presence
    expected_cols = ['symbol', 'name', 'position', 'security_type', 'trade_date', 'volume', 'price', 'transaction_type', 'filing_date']
    df = df[expected_cols]

    print(f"Loaded {len(df)} rows from backup.")
    return df

def load_data_to_db(df, truncate=True):
    if df is None or df.empty:
        return

    print("Connecting to database...")
    engine = create_engine(DB_URL)

    with engine.begin() as conn:
        if truncate:
            print("Truncating table...")
            conn.execute(text("TRUNCATE TABLE sec_filings RESTART IDENTITY;"))

        print(f"Bulk inserting {len(df)} rows...")
        df.to_sql(
            'sec_filings',
            conn,
            if_exists='append',
            index=False,
            method='multi',
            chunksize=1000
        )

    print("Database sync complete.")

if __name__ == "__main__":
    # Full refresh: scrape the entire history up to today, then truncate + reload.
    # Idempotent and safe to run on a schedule — avoids the duplicate-row
    # accumulation an append-only incremental load would cause (sec_filings has
    # no unique key). A watermark-based incremental load is future work.
    data = scrape_and_clean_data()
    load_data_to_db(data, truncate=True)
