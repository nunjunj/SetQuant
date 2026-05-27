import os
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timezone
from sqlalchemy import create_engine, text

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise SystemExit("DATABASE_URL is not set. See .env.example.")

ENSURE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ceo_scores (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, symbol TEXT NOT NULL,
    total_bought_thb NUMERIC DEFAULT 0,
    total_sold_thb   NUMERIC DEFAULT 0,
    buy_return_pct   NUMERIC DEFAULT 0,
    sell_return_pct  NUMERIC DEFAULT 0,
    combined_return_pct NUMERIC DEFAULT 0,
    stock_1y_pct     NUMERIC DEFAULT 0,
    buy_count        INTEGER DEFAULT 0,
    sell_count       INTEGER DEFAULT 0,
    latest_action     TEXT    DEFAULT '',
    latest_volume_thb NUMERIC DEFAULT 0,
    latest_price      NUMERIC DEFAULT 0,
    net_position_6m   TEXT    DEFAULT '',
    net_volume_thb_6m NUMERIC DEFAULT 0,
    avg_price_6m      NUMERIC DEFAULT 0,
    trade_count_6m    INTEGER DEFAULT 0,
    latest_trade_date DATE DEFAULT NULL,
    calculated_at    TIMESTAMPTZ NOT NULL,
    UNIQUE(name, symbol)
);
"""

UPSERT_SQL = text("""
    INSERT INTO ceo_scores
        (name, symbol, total_bought_thb, total_sold_thb,
         buy_return_pct, sell_return_pct, combined_return_pct, stock_1y_pct,
         buy_count, sell_count,
         latest_action, latest_volume_thb, latest_price,
         net_position_6m, net_volume_thb_6m, avg_price_6m, trade_count_6m,
         latest_trade_date, calculated_at)
    VALUES
        (:name, :symbol, :total_bought_thb, :total_sold_thb,
         :buy_return_pct, :sell_return_pct, :combined_return_pct, :stock_1y_pct,
         :buy_count, :sell_count,
         :latest_action, :latest_volume_thb, :latest_price,
         :net_position_6m, :net_volume_thb_6m, :avg_price_6m, :trade_count_6m,
         :latest_trade_date, :calculated_at)
    ON CONFLICT (name, symbol) DO UPDATE SET
        total_bought_thb    = EXCLUDED.total_bought_thb,
        total_sold_thb      = EXCLUDED.total_sold_thb,
        buy_return_pct      = EXCLUDED.buy_return_pct,
        sell_return_pct     = EXCLUDED.sell_return_pct,
        combined_return_pct = EXCLUDED.combined_return_pct,
        stock_1y_pct        = EXCLUDED.stock_1y_pct,
        buy_count           = EXCLUDED.buy_count,
        sell_count          = EXCLUDED.sell_count,
        latest_action       = EXCLUDED.latest_action,
        latest_volume_thb   = EXCLUDED.latest_volume_thb,
        latest_price        = EXCLUDED.latest_price,
        net_position_6m     = EXCLUDED.net_position_6m,
        net_volume_thb_6m   = EXCLUDED.net_volume_thb_6m,
        avg_price_6m        = EXCLUDED.avg_price_6m,
        trade_count_6m      = EXCLUDED.trade_count_6m,
        latest_trade_date   = EXCLUDED.latest_trade_date,
        calculated_at       = EXCLUDED.calculated_at;
""")

# Thai SEC uses "ได้มา" (acquired/bought) and "จำหน่าย" (disposed/sold)
BUY_PATTERN  = r'ซื้อ|ได้มา|buy'
SELL_PATTERN = r'ขาย|จำหน่าย|sell'

# SET50 constituents (reviewed semi-annually by SET in January and July)
SET50 = {
    "ADVANC", "AOT", "AWC", "BANPU", "BBL", "BDMS", "BEM", "BH", "BJC", "BTS",
    "CBG", "CENTEL", "CPALL", "CPF", "CPN", "CRC", "DELTA", "EA", "EGCO",
    "GPSC", "GULF", "HMPRO", "INTUCH", "IVL", "ICHI", "KBANK", "KKP", "KTB", "KTC",
    "LH", "M", "MC", "MINT", "MTC", "OR", "OSP", "PTT", "PTTEP", "PTTGC", "RATCH", "SABINA",
    "SCB", "SCC", "SCGP", "SPALI", "STA", "STEC", "TCAP", "TISCO", "TOP",
    "TRUE", "TTB", "TU", "WHA",
}


def fetch_filings(engine) -> pd.DataFrame:
    df = pd.read_sql(
        "SELECT symbol, name, transaction_type, trade_date, volume, price FROM sec_filings",
        engine
    )
    df['trade_date'] = pd.to_datetime(df['trade_date'], utc=True).dt.tz_localize(None)
    df['thb_value'] = df['volume'] * df['price']
    before = len(df)
    df = df[df['symbol'].isin(SET50)]
    print(f"Filtered to SET50: {before} → {len(df)} filings.")
    # drop empty (zero-volume) filings
    before = len(df)
    df = df[df['volume'] > 0]
    print(f"Dropped zero-volume filings: {before} → {len(df)} filings.")
    return df


def fetch_price_history(symbols: list) -> pd.DataFrame:
    """Download Close prices for all .BK tickers in a single batch call."""
    tickers = [f"{s}.BK" for s in symbols]
    print(f"  Downloading price history for {len(tickers)} tickers via yfinance...")
    raw = yf.download(tickers, start="2024-01-01", auto_adjust=True, progress=False)

    if raw.empty:
        print("  WARNING: yfinance returned an empty DataFrame — no price data fetched!")
        return pd.DataFrame()

    print(f"  yfinance raw shape: {raw.shape}, columns type: {type(raw.columns).__name__}")

    # multiple tickers -> MultiIndex columns; single ticker -> flat
    if isinstance(raw.columns, pd.MultiIndex):
        l0 = raw.columns.get_level_values(0).unique().tolist()
        l1 = raw.columns.get_level_values(1).unique().tolist()
        print(f"  MultiIndex level 0 (sample): {l0[:6]}  level 1 (sample): {l1[:6]}")

        if "Close" in l0:
            # Standard layout: (price_type, ticker)
            close = raw["Close"]
        elif "Close" in l1:
            # some versions swap the levels: (ticker, price_type)
            close = raw.xs("Close", axis=1, level=1)
        else:
            print(f"  WARNING: 'Close' not found in MultiIndex levels. Columns: {raw.columns[:8].tolist()}")
            return pd.DataFrame()
    else:
        close = raw[["Close"]].rename(columns={"Close": tickers[0]})

    # drop tz from the index
    idx = pd.to_datetime(close.index)
    close.index = idx.tz_convert(None) if idx.tz is not None else idx

    print(f"  Price data ready: {len(close)} trading days, {close.shape[1]} tickers.")
    print(f"  Ticker columns (sample): {list(close.columns[:5])}")
    return close


def get_current_price(close: pd.DataFrame, ticker: str):
    """Return the last non-null close price for the ticker."""
    if ticker not in close.columns:
        return None
    series = close[ticker].dropna()
    if series.empty:
        return None
    return float(series.iloc[-1])


def get_price_1y_ago(close: pd.DataFrame, ticker: str):
    """Return the close price closest to today - 365 days."""
    if ticker not in close.columns:
        return None
    series = close[ticker].dropna()
    if series.empty:
        return None
    target = pd.Timestamp.now().normalize() - pd.Timedelta(days=365)
    diffs = (series.index - target).total_seconds()
    idx = int(np.abs(diffs).argmin())
    return float(series.iloc[idx])


def calc_mark_to_market(group: pd.DataFrame, close: pd.DataFrame, symbol: str) -> dict:
    """
    Calculate mark-to-market returns for an executive's trades in the trailing 365 days.
    Buys: VWAP entry, current price exit (long).
    Sells: VWAP entry, current price exit (short).
    Combined: volume-weighted average of buy and sell returns.
    """
    ticker = f"{symbol}.BK"
    cutoff = pd.Timestamp.now().normalize() - pd.Timedelta(days=365)
    recent = group[group['trade_date'] >= cutoff]

    buys  = recent[recent['transaction_type'].str.contains(BUY_PATTERN,  case=False, na=False)]
    sells = recent[recent['transaction_type'].str.contains(SELL_PATTERN, case=False, na=False)]

    buy_count  = len(buys)
    sell_count = len(sells)

    current_price = get_current_price(close, ticker)

    # Buy VWAP return
    if current_price and not buys.empty and buys['volume'].sum() > 0:
        buy_vwap = float((buys['volume'] * buys['price']).sum() / buys['volume'].sum())
        buy_return_pct = (current_price - buy_vwap) / buy_vwap if buy_vwap else 0.0
        total_bought = float(buys['thb_value'].sum())
    else:
        buy_return_pct = 0.0
        total_bought = 0.0

    # Sell VWAP return (short: profit when price falls from sell point)
    if current_price and not sells.empty and sells['volume'].sum() > 0:
        sell_vwap = float((sells['volume'] * sells['price']).sum() / sells['volume'].sum())
        sell_return_pct = (sell_vwap - current_price) / sell_vwap if sell_vwap else 0.0
        total_sold = float(sells['thb_value'].sum())
    else:
        sell_return_pct = 0.0
        total_sold = 0.0

    # Combined volume-weighted return
    total = total_bought + total_sold
    if total > 0:
        combined_return_pct = (total_bought * buy_return_pct + total_sold * sell_return_pct) / total
    else:
        combined_return_pct = 0.0

    # Stock 1-year return
    price_1y_ago = get_price_1y_ago(close, ticker)
    if price_1y_ago and current_price:
        stock_1y_pct = (current_price - price_1y_ago) / price_1y_ago
    else:
        stock_1y_pct = 0.0

    # Latest trade (all rows in group, not just 1Y window)
    latest_row = group.sort_values('trade_date').iloc[-1]
    is_buy = bool(pd.Series([latest_row['transaction_type']]).str.contains(BUY_PATTERN, case=False, na=False).iloc[0])
    latest_action     = 'BOUGHT' if is_buy else 'SOLD'
    latest_volume_thb = float(latest_row['volume'] * latest_row['price'])
    latest_price      = float(latest_row['price'])
    latest_trade_date = latest_row['trade_date'].date()

    # 6-month net position (180-day window from full group)
    cutoff_6m  = pd.Timestamp.now().normalize() - pd.Timedelta(days=180)
    window_6m  = group[group['trade_date'] >= cutoff_6m]
    trade_count_6m = len(window_6m)

    buys_6m  = window_6m[window_6m['transaction_type'].str.contains(BUY_PATTERN,  case=False, na=False)]
    sells_6m = window_6m[window_6m['transaction_type'].str.contains(SELL_PATTERN, case=False, na=False)]

    net_shares = buys_6m['volume'].sum() - sells_6m['volume'].sum()

    if net_shares > 0 and not buys_6m.empty and buys_6m['volume'].sum() > 0:
        buy_vwap_6m       = float((buys_6m['volume'] * buys_6m['price']).sum() / buys_6m['volume'].sum())
        net_position_6m   = 'LONG'
        net_volume_thb_6m = float(net_shares * buy_vwap_6m)
        avg_price_6m      = buy_vwap_6m
    elif net_shares < 0 and not sells_6m.empty and sells_6m['volume'].sum() > 0:
        sell_vwap_6m      = float((sells_6m['volume'] * sells_6m['price']).sum() / sells_6m['volume'].sum())
        net_position_6m   = 'SHORT'
        net_volume_thb_6m = float(abs(net_shares) * sell_vwap_6m)
        avg_price_6m      = sell_vwap_6m
    else:
        net_position_6m   = 'NEUTRAL'
        net_volume_thb_6m = 0.0
        avg_price_6m      = 0.0

    return {
        'total_bought_thb':    total_bought,
        'total_sold_thb':      total_sold,
        'buy_return_pct':      buy_return_pct,
        'sell_return_pct':     sell_return_pct,
        'combined_return_pct': combined_return_pct,
        'stock_1y_pct':        stock_1y_pct,
        'buy_count':           buy_count,
        'sell_count':          sell_count,
        'latest_action':       latest_action,
        'latest_volume_thb':   latest_volume_thb,
        'latest_price':        latest_price,
        'latest_trade_date':   latest_trade_date,
        'net_position_6m':     net_position_6m,
        'net_volume_thb_6m':   net_volume_thb_6m,
        'avg_price_6m':        avg_price_6m,
        'trade_count_6m':      trade_count_6m,
    }


def filter_market_prices(df: pd.DataFrame, close: pd.DataFrame) -> pd.DataFrame:
    """Keep only filings priced within a sane band of the stock's traded range.

    Drops par-value/restructuring rows (e.g. price 1.00) and price-0 rows, which
    would otherwise produce nonsensical mark-to-market returns.
    """
    if close is None or close.empty:
        return df[df['price'] > 0]

    keep = pd.Series(True, index=df.index)
    for sym in df['symbol'].unique():
        mask = df['symbol'] == sym
        ticker = f"{sym}.BK"
        if ticker in close.columns:
            s = close[ticker].dropna()
            if not s.empty:
                lo, hi = 0.5 * float(s.min()), 2.0 * float(s.max())
                keep &= ~mask | df['price'].between(lo, hi)
                continue
        keep &= ~mask | (df['price'] > 0)

    before = len(df)
    df = df[keep]
    print(f"Filtered non-market prices: {before} → {len(df)} filings.")
    return df


def main():
    engine = create_engine(DB_URL)

    # Drop stale columns from previous schema
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ceo_scores DROP COLUMN IF EXISTS net_buy_volume_thb"))
        conn.execute(text("ALTER TABLE ceo_scores DROP COLUMN IF EXISTS win_rate"))
        conn.execute(text("ALTER TABLE ceo_scores DROP COLUMN IF EXISTS win_count"))
        conn.execute(text("ALTER TABLE ceo_scores DROP COLUMN IF EXISTS total_signals"))
    print("Dropped stale columns (if they existed).")

    with engine.begin() as conn:
        conn.execute(text(ENSURE_TABLE_SQL))
    print("Table ready.")

    # Add new columns to existing tables that pre-date this schema version.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS buy_return_pct   NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS sell_return_pct  NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS combined_return_pct NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS stock_1y_pct     NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS buy_count        INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS sell_count       INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS latest_action     TEXT    DEFAULT ''"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS latest_volume_thb NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS latest_price      NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS net_position_6m   TEXT    DEFAULT ''"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS net_volume_thb_6m NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS avg_price_6m      NUMERIC DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS trade_count_6m    INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ceo_scores ADD COLUMN IF NOT EXISTS latest_trade_date DATE DEFAULT NULL"))
    print("Schema migrations applied.")

    # Remove non-SET50 rows from both tables
    set50_list = ", ".join(f"'{s}'" for s in SET50)
    with engine.begin() as conn:
        r1 = conn.execute(text(f"DELETE FROM sec_filings WHERE symbol NOT IN ({set50_list})"))
        r2 = conn.execute(text(f"DELETE FROM ceo_scores  WHERE symbol NOT IN ({set50_list})"))
        print(f"Cleaned DB: removed {r1.rowcount} sec_filings rows, {r2.rowcount} ceo_scores rows.")

    df = fetch_filings(engine)
    print(f"Loaded {len(df)} filings.")

    symbols = df['symbol'].unique().tolist()
    close = fetch_price_history(symbols)

    # drop non-market-price filings before scoring
    df = filter_market_prices(df, close)

    scores = []
    groups = df.groupby(['name', 'symbol'])
    print(f"Calculating scores for {len(groups)} executive/symbol pairs...")

    for (name, symbol), group in groups:
        metrics = calc_mark_to_market(group, close, symbol)
        scores.append({
            'name':   name,
            'symbol': symbol,
            'calculated_at': datetime.now(timezone.utc),
            **metrics,
        })

    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, scores)
    print(f"Upserted {len(scores)} scores. Done.")


if __name__ == "__main__":
    main()
