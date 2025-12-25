import pandas as pd
import numpy as np
import time
import re
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from sqlalchemy import create_engine, text

TARGET_URL = "https://market.sec.or.th/public/idisc/th/Viewmore/r59-2?DateType=1&DateFrom=20240101&DateTo=20251231" 
DB_URL = os.getenv("DATABASE_URL")

if not DB_URL:
    print("No DATABASE_URL found. Using Localhost...")
    DB_URL = "postgresql://setquant_user:secret_password_123@localhost:5432/setquant_db"

CSV_BACKUP_FILE = "sec_data_backup.csv"

def scrape_and_clean_data():
    print("Starting extraction...")
    
    options = Options()
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get(TARGET_URL)
        time.sleep(10) 
        
        table_element = driver.find_element(By.TAG_NAME, "table")
        table_html = table_element.get_attribute('outerHTML')
        
        dfs = pd.read_html(table_html)
        if not dfs:
            print("No data found.")
            return None
            
        df = dfs[0]
        print(f"Rows extracted: {len(df)}")

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
            except:
                return None
                
        df['trade_date'] = df['trade_date'].apply(convert_thai_date)
        df['filing_date'] = df['trade_date']

        df = df.replace({np.nan: None})

        final_df = df[['symbol', 'name', 'position', 'security_type', 'trade_date', 'volume', 'price', 'transaction_type', 'filing_date']]
        
        final_df.to_csv(CSV_BACKUP_FILE, index=False, encoding='utf-8-sig')
        print(f"Backup saved to {CSV_BACKUP_FILE}")
        
        return final_df

    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        driver.quit()

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

def load_data_to_db(df):
    if df is None or df.empty:
        return

    print("Connecting to database...")
    engine = create_engine(DB_URL)

    with engine.begin() as conn:
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
    data = load_backup_data()
    load_data_to_db(data)
