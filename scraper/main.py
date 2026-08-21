import pandas as pd
import numpy as np
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

# A chunk that fails is retried with a fresh driver before the run is aborted.
CHUNK_MAX_ATTEMPTS = 3

# A reload that shrinks the table by more than this fraction is treated as a
# bad scrape and aborts (override with FORCE_RELOAD=1).
MIN_ROW_RATIO = 0.9


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


def convert_thai_date(date_str):
    """Convert a Thai Buddhist-era 'DD/MM/YYYY' string to ISO 'YYYY-MM-DD'.

    BE = CE + 543. Returns None for anything that does not parse cleanly or
    whose resulting Gregorian year falls outside 1990–2100 — callers must drop
    those rows rather than insert a null date.
    """
    if date_str is None:
        return None
    try:
        parts = str(date_str).strip().split('/')
        if len(parts) != 3:
            return None
        day, month, thai_year = (p.strip() for p in parts)
        day_i, month_i, year_i = int(day), int(month), int(thai_year) - 543
        if not (1990 <= year_i <= 2100):
            return None
        if not (1 <= month_i <= 12) or not (1 <= day_i <= 31):
            return None
        # Reject impossible day/month combinations (e.g. 31/02).
        datetime(year_i, month_i, day_i)
        return f"{year_i:04d}-{month_i:02d}-{day_i:02d}"
    except Exception:
        return None


DB_URL = os.getenv("DATABASE_URL")

CSV_BACKUP_FILE = "sec_data_backup.csv"


def require_db_url():
    if not DB_URL:
        raise SystemExit("DATABASE_URL is not set. See .env.example.")
    return DB_URL


def make_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-dev-shm-usage")
    options.page_load_strategy = "none"
    return webdriver.Chrome(options=options)


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

    # Coerce numerics, then drop rows that carry no usable trade economics.
    df['volume'] = pd.to_numeric(df['volume'].astype(str).str.replace(',', ''), errors='coerce')
    df['price'] = pd.to_numeric(df['price'].astype(str).str.replace(',', ''), errors='coerce')

    before = len(df)
    df = df[(df['volume'] > 0) & (df['price'] > 0)]
    dropped = before - len(df)
    if dropped:
        print(f"  Dropped {dropped} rows with non-positive/unparseable volume or price.")
    df = df.copy()
    df['volume'] = df['volume'].astype('int64')
    df['price'] = df['price'].astype(float)

    df['trade_date'] = df['trade_date'].apply(convert_thai_date)
    before = len(df)
    df = df[df['trade_date'].notna()]
    dropped = before - len(df)
    if dropped:
        print(f"  Dropped {dropped} rows with an unparseable trade_date.")

    df = df.copy()
    df['filing_date'] = df['trade_date']
    df = df.replace({np.nan: None})
    if df.empty:
        print(f"  No usable rows left for {date_from}-{date_to} after cleaning.")
        return None
    return df[['symbol', 'name', 'position', 'security_type', 'trade_date', 'volume', 'price', 'transaction_type', 'filing_date']]


def scrape_chunk_with_retries(date_from, date_to, max_attempts=CHUNK_MAX_ATTEMPTS):
    """Scrape one chunk, retrying with a fresh driver. Returns None on failure."""
    for attempt in range(1, max_attempts + 1):
        if attempt > 1:
            print(f"  Retry {attempt}/{max_attempts} for {date_from}-{date_to} ...")
        driver = None
        try:
            driver = make_driver()
            chunk = scrape_chunk(driver, date_from, date_to)
        except Exception as e:
            print(f"  Attempt {attempt} raised for {date_from}-{date_to}: {e}")
            chunk = None
        finally:
            if driver is not None:
                try:
                    driver.quit()
                except Exception:
                    pass
        if chunk is not None and not chunk.empty:
            return chunk
    return None


def scrape_and_clean_data(date_chunks=None):
    if date_chunks is None:
        date_chunks = generate_date_chunks()
    print("Starting extraction...")

    chunks = []
    for date_from, date_to in date_chunks:
        chunk = scrape_chunk_with_retries(date_from, date_to)
        if chunk is None:
            # Never truncate + reload from a partial scrape: a silently skipped
            # chunk would wipe that entire date range from the database.
            raise SystemExit(
                f"ABORT: chunk {date_from}-{date_to} failed after "
                f"{CHUNK_MAX_ATTEMPTS} attempts. No database write was made."
            )
        chunks.append(chunk)

    if not chunks:
        raise SystemExit("ABORT: no data scraped (zero chunks). No database write was made.")

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


def existing_row_count(conn):
    """Current row count of sec_filings, or 0 if the table does not exist yet."""
    exists = conn.execute(text("SELECT to_regclass('public.sec_filings')")).scalar()
    if exists is None:
        return 0
    return int(conn.execute(text("SELECT COUNT(*) FROM sec_filings")).scalar() or 0)


def load_data_to_db(df, truncate=True):
    if df is None or df.empty:
        raise SystemExit("ABORT: refusing to load an empty dataset into sec_filings.")

    db_url = require_db_url()
    print("Connecting to database...")
    engine = create_engine(db_url)

    force = os.getenv("FORCE_RELOAD") == "1"
    with engine.connect() as conn:
        current = existing_row_count(conn)
    print(f"Existing sec_filings rows: {current}; incoming rows: {len(df)}")

    if current > 0 and len(df) < MIN_ROW_RATIO * current:
        msg = (
            f"ABORT: incoming row count {len(df)} is below {MIN_ROW_RATIO:.0%} of the "
            f"existing {current} rows — this looks like a partial scrape. "
            f"Set FORCE_RELOAD=1 to override."
        )
        if not force:
            raise SystemExit(msg)
        print(f"WARNING (FORCE_RELOAD=1): {msg}")

    with engine.begin() as conn:
        if truncate and current > 0:
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
    require_db_url()
    data = scrape_and_clean_data()
    if data is None or data.empty:
        raise SystemExit("ABORT: scrape produced no rows. Database left untouched.")
    load_data_to_db(data, truncate=True)
