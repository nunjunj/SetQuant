import pandas as pd
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

TARGET_URL = "https://market.sec.or.th/public/idisc/th/Viewmore/r59-2?DateType=1&DateFrom=20251001&DateTo=20251223"
CSV_FILENAME = "latest_sec_data.csv"

def run_scraper_and_save():
    print("Launching browser...")
    
    options = Options()
    # options.add_argument("--headless") 
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get(TARGET_URL)
        print("Waiting for table to render...")
        time.sleep(5)
        
        table_html = driver.find_element(By.TAG_NAME, "table").get_attribute('outerHTML')
        df = pd.read_html(table_html)[0]
        print(f"Rows fetched: {len(df)}")

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
        
        def convert_thai_date(date_str):
            try:
                day, month, thai_year = date_str.split('/')
                return f"{int(thai_year)-543}-{month}-{day}"
            except: return None
        df['trade_date'] = df['trade_date'].apply(convert_thai_date)
        
        df['filing_date'] = df['trade_date']

        final_df = df[['symbol', 'name', 'position', 'security_type', 'trade_date', 'volume', 'price', 'transaction_type', 'filing_date']]

        print(f"Saving to {CSV_FILENAME}...")
        final_df.to_csv(CSV_FILENAME, index=False, encoding='utf-8-sig')
        print("File saved successfully.")
        
        print("Data preview:")
        print(final_df.head(5).to_string(index=False))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    run_scraper_and_save()