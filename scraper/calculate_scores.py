import os
import re
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timezone
from sqlalchemy import create_engine, text

DB_URL = os.getenv("DATABASE_URL")


def require_db_url():
    if not DB_URL:
        raise SystemExit("DATABASE_URL is not set. See .env.example.")
    return DB_URL

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

# Thai SEC uses "ได้มา" (acquired/bought) and "จำหน่าย" (disposed/sold).
# Transfers ("โอน" / "รับโอน") are neither — they move shares without a market
# trade, so they must never be scored as a buy or a sell.
BUY_PATTERN      = r'ซื้อ|ได้มา|buy'
SELL_PATTERN     = r'ขาย|จำหน่าย|sell'
TRANSFER_PATTERN = r'โอน'

BUY      = 'BUY'
SELL     = 'SELL'
OTHER    = 'OTHER'

# Common shares. The raw feed also carries warrants, NVDR, futures etc., which
# would otherwise be marked against the common-share price.
COMMON_SHARE = 'หุ้นสามัญ'

# Leaderboard eligibility thresholds.
MIN_QUALIFYING_TRADES = 2
MIN_TOTAL_NOTIONAL_THB = 100_000


def classify_transaction(transaction_type) -> str:
    """Three-valued classification of a filing's transaction type.

    Transfers are checked first because "รับโอน" / "โอนออก" would otherwise be
    swallowed by the buy/sell patterns. Classification is mutually exclusive:
    a row is exactly one of BUY, SELL or OTHER.
    """
    if transaction_type is None:
        return OTHER
    text_value = str(transaction_type).strip()
    if not text_value or text_value.lower() in ('nan', 'none'):
        return OTHER
    if re.search(TRANSFER_PATTERN, text_value):
        return OTHER
    if re.search(BUY_PATTERN, text_value, flags=re.IGNORECASE):
        return BUY
    if re.search(SELL_PATTERN, text_value, flags=re.IGNORECASE):
        return SELL
    return OTHER

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
        "SELECT symbol, name, security_type, transaction_type, trade_date, volume, price "
        "FROM sec_filings",
        engine
    )
    df['trade_date'] = pd.to_datetime(df['trade_date'], utc=True).dt.tz_localize(None)
    df['thb_value'] = df['volume'] * df['price']

    before = len(df)
    df = df[df['symbol'].isin(SET50)]
    print(f"Filtered to SET50: {before} → {len(df)} filings.")

    # Common shares only — warrants/NVDR/futures cannot be marked against the
    # common-share price series.
    before = len(df)
    df = df[df['security_type'].astype(str).str.strip() == COMMON_SHARE]
    print(f"Filtered to common shares ({COMMON_SHARE}): {before} → {len(df)} filings.")

    # drop empty (zero-volume) filings
    before = len(df)
    df = df[df['volume'] > 0]
    print(f"Dropped zero-volume filings: {before} → {len(df)} filings.")

    df = df.copy()
    df['action'] = df['transaction_type'].apply(classify_transaction)
    counts = df['action'].value_counts().to_dict()
    print(f"Classified transactions: {counts}")
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
    # OTHER (transfers) never contribute to counts or mark-to-market math.
    scoreable = group[group['action'].isin([BUY, SELL])]
    recent = scoreable[scoreable['trade_date'] >= cutoff]

    buys  = recent[recent['action'] == BUY]
    sells = recent[recent['action'] == SELL]

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
    latest_action = {
        BUY:  'BOUGHT',
        SELL: 'SOLD',
    }.get(latest_row['action'], 'TRANSFER')
    latest_volume_thb = float(latest_row['volume'] * latest_row['price'])
    latest_price      = float(latest_row['price'])
    latest_trade_date = latest_row['trade_date'].date()

    # 6-month net position (180-day window from full group)
    cutoff_6m  = pd.Timestamp.now().normalize() - pd.Timedelta(days=180)
    window_6m  = scoreable[scoreable['trade_date'] >= cutoff_6m]
    trade_count_6m = len(window_6m)

    buys_6m  = window_6m[window_6m['action'] == BUY]
    sells_6m = window_6m[window_6m['action'] == SELL]

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


def qualifying_trades(group: pd.DataFrame) -> pd.DataFrame:
    """Rows in the scoring window that count toward leaderboard eligibility.

    Qualifying = BUY or SELL (transfers excluded), positive price and volume,
    inside the trailing 365-day scoring window. Common-share filtering already
    happened in fetch_filings.
    """
    cutoff = pd.Timestamp.now().normalize() - pd.Timedelta(days=365)
    return group[
        group['action'].isin([BUY, SELL])
        & (group['trade_date'] >= cutoff)
        & (group['volume'] > 0)
        & (group['price'] > 0)
    ]


def is_eligible(group: pd.DataFrame) -> bool:
    """>= 2 qualifying trades AND >= 100k THB notional in the scoring window."""
    q = qualifying_trades(group)
    if len(q) < MIN_QUALIFYING_TRADES:
        return False
    notional = float((q['volume'] * q['price']).sum())
    return notional >= MIN_TOTAL_NOTIONAL_THB


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



INDEX_SYMBOL = '^SET'

def store_index_candles(engine):
    """Persist 1y of daily SET-index OHLC so the API can serve the chart.

    Yahoo blocks index-chart requests from datacenter IPs (Vercel/Cloud Run),
    so the frontend cannot proxy ^SET at runtime. This job runs from an IP
    Yahoo accepts; the frontend falls back to GET /api/v1/candles/^SET.
    """
    raw = yf.download(f"{INDEX_SYMBOL}.BK", period="1y", interval="1d",
                      auto_adjust=False, progress=False)
    if raw is None or raw.empty:
        print("WARNING: no index candles from yfinance; keeping existing rows.")
        return
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    df = raw[['Open', 'High', 'Low', 'Close']].dropna()

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS index_candles (
                symbol TEXT NOT NULL,
                time   DATE NOT NULL,
                open   NUMERIC NOT NULL,
                high   NUMERIC NOT NULL,
                low    NUMERIC NOT NULL,
                close  NUMERIC NOT NULL,
                PRIMARY KEY (symbol, time)
            )
        """))
        rows = [
            {
                'symbol': INDEX_SYMBOL,
                'time': ts.date(),
                'open': round(float(r['Open']), 2),
                'high': round(float(r['High']), 2),
                'low': round(float(r['Low']), 2),
                'close': round(float(r['Close']), 2),
            }
            for ts, r in df.iterrows()
        ]
        conn.execute(text("""
            INSERT INTO index_candles (symbol, time, open, high, low, close)
            VALUES (:symbol, :time, :open, :high, :low, :close)
            ON CONFLICT (symbol, time) DO UPDATE SET
                open = EXCLUDED.open, high = EXCLUDED.high,
                low = EXCLUDED.low, close = EXCLUDED.close
        """), rows)
        # Keep a rolling ~1y window.
        conn.execute(text(
            "DELETE FROM index_candles WHERE symbol = :s AND time < CURRENT_DATE - 370"
        ), {'s': INDEX_SYMBOL})
    print(f"Stored {len(rows)} index candles for {INDEX_SYMBOL}.")


def main():
    engine = create_engine(require_db_url())

    store_index_candles(engine)

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

    # Anything in ceo_scores not refreshed by this run is stale and gets removed.
    run_started = datetime.now(timezone.utc)

    scores = []
    skipped = 0
    groups = df.groupby(['name', 'symbol'])
    print(f"Calculating scores for {len(groups)} executive/symbol pairs...")

    for (name, symbol), group in groups:
        if not is_eligible(group):
            skipped += 1
            continue
        metrics = calc_mark_to_market(group, close, symbol)
        scores.append({
            'name':   name,
            'symbol': symbol,
            'calculated_at': datetime.now(timezone.utc),
            **metrics,
        })

    print(
        f"Eligible insiders: {len(scores)} "
        f"(skipped {skipped} below {MIN_QUALIFYING_TRADES} trades / "
        f"{MIN_TOTAL_NOTIONAL_THB:,.0f} THB notional)."
    )

    with engine.begin() as conn:
        if scores:
            conn.execute(UPSERT_SQL, scores)
        # Drop rows this run did not touch: insiders that fell out of SET50,
        # became ineligible, or whose filings were reclassified as transfers.
        deleted = conn.execute(
            text("DELETE FROM ceo_scores WHERE calculated_at < :run_started"),
            {"run_started": run_started},
        )
        print(f"Removed {deleted.rowcount} stale ceo_scores rows.")
    print(f"Upserted {len(scores)} scores. Done.")


if __name__ == "__main__":
    main()
