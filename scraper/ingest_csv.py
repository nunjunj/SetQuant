import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import os

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise SystemExit("DATABASE_URL is not set. See .env.example.")

CSV_FILE = "latest_sec_data.csv"

def ingest_csv_to_db():
    print(f"Reading {CSV_FILE}...")
    
    if not os.path.exists(CSV_FILE):
        print("Error: CSV file not found.")
        return

    df = pd.read_csv(CSV_FILE)
    
    df = df.replace({np.nan: None})
    df['volume'] = pd.to_numeric(df['volume'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
    df['price'] = pd.to_numeric(df['price'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)

    print(f"Loaded {len(df)} rows. Cleaning DB first...")

    engine = create_engine(DB_URL)

    with engine.connect() as conn:
        print("Truncating table...")
        conn.execute(text("TRUNCATE TABLE sec_filings RESTART IDENTITY;"))
        conn.commit()
        print("Database ready.")

        print("Starting insertion...")
        
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                insert_query = text("""
                    INSERT INTO sec_filings 
                    (symbol, name, position, security_type, trade_date, volume, price, transaction_type, filing_date)
                    VALUES 
                    (:symbol, :name, :position, :security_type, :trade_date, :volume, :price, :transaction_type, :filing_date);
                """)

                conn.execute(insert_query, row.to_dict())
                success_count += 1
                conn.commit()

            except Exception as e:
                conn.rollback()
                print(f"Error on row {index} ({row.get('symbol')}): {e}")
                error_count += 1
        
    print("Process complete.")
    print(f"Successfully Added: {success_count}")
    print(f"Errors: {error_count}")

if __name__ == "__main__":
    ingest_csv_to_db()