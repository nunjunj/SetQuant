import os
import tempfile
import numpy as np
import pandas as pd
import mplfinance as mpf
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import yfinance as yf
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime, timedelta
from sqlalchemy import create_engine

_FONT_EMOJI      = '/System/Library/Fonts/Apple Color Emoji.ttc'
_FONT_THAI       = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
_EMOJI_SIZES     = [20, 26, 32, 40, 48, 52, 64, 96, 160]  # Apple Color Emoji bitmap sizes


def _nearest_emoji_size(n: int) -> int:
    return min(_EMOJI_SIZES, key=lambda s: abs(s - n))

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise SystemExit("DATABASE_URL is not set. See .env.example.")

MC = mpf.make_marketcolors(
    up='#00cc44', down='#cc2222',
    edge='inherit',
    wick='inherit',
    volume='inherit',
)

MIDNIGHT = mpf.make_mpf_style(
    base_mpf_style='nightclouds',
    marketcolors=MC,
    facecolor='#000000',
    edgecolor='#000000',
    figcolor='#000000',
    gridcolor='#1a1a2e',
    gridstyle='--',
    gridaxis='both',
    rc={
        'font.family': 'monospace',
        'axes.labelcolor': '#00ffff',
        'xtick.color': '#888888',
        'ytick.color': '#888888',
    }
)


def fmt_thb(v):
    if abs(v) >= 1e9:
        return f"{v/1e9:.1f}B THB"
    if abs(v) >= 1e6:
        return f"{v/1e6:.1f}M THB"
    if abs(v) >= 1e3:
        return f"{v/1e3:.1f}K THB"
    return f"{v:.0f} THB"


def generate_chart(score: dict, filings_df: pd.DataFrame) -> str:
    # price history
    ticker = yf.Ticker(f"{score['symbol']}.BK")
    hist = ticker.history(period="1y")
    if hist.empty:
        raise ValueError(f"No price history for {score['symbol']}.BK")
    hist.index = hist.index.tz_localize(None)

    # buy/sell markers, placed on the nearest trading day
    # normalise trade_date to tz-naive so comparisons work regardless of DB tz
    filings_df = filings_df.copy()
    filings_df['trade_date'] = pd.to_datetime(filings_df['trade_date']).dt.tz_localize(None) \
        if filings_df['trade_date'].dt.tz is None \
        else pd.to_datetime(filings_df['trade_date']).dt.tz_convert(None)
    cutoff = datetime.utcnow() - timedelta(days=365)
    recent = filings_df[filings_df['trade_date'] >= cutoff]
    buys  = recent[recent['transaction_type'].str.contains(r'ซื้อ|ได้มา|buy', case=False, na=False)]
    sells = recent[recent['transaction_type'].str.contains(r'ขาย|จำหน่าย|sell', case=False, na=False)]

    buy_series  = pd.Series(np.nan, index=hist.index)
    sell_series = pd.Series(np.nan, index=hist.index)

    for _, row in buys.iterrows():
        idx = hist.index.get_indexer([row['trade_date']], method='nearest')[0]
        buy_series.iloc[idx] = hist['Low'].iloc[idx] * 0.97

    for _, row in sells.iterrows():
        idx = hist.index.get_indexer([row['trade_date']], method='nearest')[0]
        sell_series.iloc[idx] = hist['High'].iloc[idx] * 1.03

    add_plots = []
    if buy_series.notna().any():
        add_plots.append(mpf.make_addplot(buy_series,  type='scatter',
                                          markersize=120, marker='^', color='#00ffff'))
    if sell_series.notna().any():
        add_plots.append(mpf.make_addplot(sell_series, type='scatter',
                                          markersize=120, marker='v', color='#ff00ff'))

    # render candles
    fig, axes = mpf.plot(
        hist,
        type='candle',
        style=MIDNIGHT,
        addplot=add_plots if add_plots else None,
        volume=False,
        returnfig=True,
        figsize=(14, 8),
        title='',
    )

    # info panel (mirrors FormatTweet in backend/twitter.go)
    if score['sell_count'] == 0:
        header = "🚨 INSIDER BUYING 🚨"
    elif score['buy_count'] == 0:
        header = "🚨 INSIDER SELLING 🚨"
    else:
        header = "🚨 INSIDER ACTIVITY 🚨"

    # Date label
    ltd = score['latest_trade_date']
    date_label = ltd.strftime('%b %-d') if hasattr(ltd, 'strftime') else str(ltd)

    action_line = (
        f"⚡ Latest Action: {score['latest_action']} "
        f"{fmt_thb(score['latest_volume_thb'])} @ {score['latest_price']:.2f} THB ({date_label})"
    )

    # 6M net position line (only if 2+ trades in 6M window)
    net_line = ""
    if score.get('trade_count_6m', 0) >= 2:
        net_line = (
            f"\n⏳ 6M Net Position: {score['net_position_6m']} "
            f"{fmt_thb(score['net_volume_thb_6m'])} @ {score['avg_price_6m']:.2f} THB Avg"
        )

    # ROI block
    if score['sell_count'] == 0:
        roi_block = (
            f"🎯 Follower ROI (1Y): {score['buy_return_pct']*100:+.2f}%  "
            f"({score['buy_count']} buys)"
        )
    elif score['buy_count'] == 0:
        roi_block = (
            f"🎯 Follower ROI (1Y): {score['sell_return_pct']*100:+.2f}%  "
            f"({score['sell_count']} sells)"
        )
    else:
        roi_block = (
            f"🎯 Follower ROI (1Y): {score['combined_return_pct']*100:+.2f}%\n"
            f"├ 📈 Buy Return: {score['buy_return_pct']*100:+.2f}% ({score['buy_count']} buys)\n"
            f"└ 📉 Sell Return: {score['sell_return_pct']*100:+.2f}% ({score['sell_count']} sells)"
        )

    stock_line = f"📊 ${score['symbol']} Stock 1Y: {score['stock_1y_pct']*100:+.2f}%"

    panel = (
        f"{header}  ${score['symbol']} — {score['name']}\n"
        f"{action_line}{net_line}\n"
        f"{roi_block}\n"
        f"{stock_line}"
    )

    # short x-axis date labels
    axes[-1].xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))

    # save the chart, then composite the info panel onto it
    os.makedirs("output", exist_ok=True)
    safe_name = score['name'].replace(' ', '_').replace('/', '_')
    date_str  = score['latest_trade_date'].strftime('%Y-%m-%d') if hasattr(score['latest_trade_date'], 'strftime') else str(score['latest_trade_date'])
    out_path  = f"output/{score['symbol']}_{safe_name}_{date_str}.png"

    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        tmp_path = tmp.name
    fig.savefig(tmp_path, dpi=150, bbox_inches='tight', facecolor='#000000')
    plt.close(fig)

    _draw_panel(tmp_path, panel, out_path)
    os.unlink(tmp_path)
    return out_path


def _is_emoji(cp: int) -> bool:
    return (
        (0x1F000 <= cp <= 0x1FFFF) or  # most emoji block
        (0x2300 <= cp <= 0x27BF) or     # misc symbols, dingbats (⚡⏳🎯 etc.)
        (0x2600 <= cp <= 0x26FF)        # misc symbols
    )


def _split_segments(text: str):
    """Split text into list of (is_emoji, segment_string) runs."""
    if not text:
        return []
    segments = []
    cur_emoji = _is_emoji(ord(text[0]))
    cur = text[0]
    for ch in text[1:]:
        cp = ord(ch)
        # variation selectors and ZWJ — keep with previous segment
        if cp in (0xFE0F, 0x200D) or (0x1F3FB <= cp <= 0x1F3FF):
            cur += ch
            continue
        ie = _is_emoji(cp)
        if ie == cur_emoji:
            cur += ch
        else:
            segments.append((cur_emoji, cur))
            cur_emoji = ie
            cur = ch
    segments.append((cur_emoji, cur))
    return segments


def _draw_panel(chart_path: str, panel: str, out_path: str):
    """Composite a styled text panel onto the chart image using PIL."""
    img = Image.open(chart_path).convert('RGBA')
    W, H = img.size

    font_size  = max(20, H // 42)
    emoji_size = _nearest_emoji_size(font_size)
    line_gap   = font_size + 10          # extra breathing room between lines
    f_thai  = ImageFont.truetype(_FONT_THAI,  font_size)
    f_emoji = ImageFont.truetype(_FONT_EMOJI, emoji_size, index=0)

    lines = panel.split('\n')
    tmp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))

    def measure_line(text):
        w = 0
        for is_e, seg in _split_segments(text):
            fnt = f_emoji if is_e else f_thai
            try:
                bb = tmp_draw.textbbox((0, 0), seg, font=fnt)
                w += bb[2] - bb[0]
            except Exception:
                w += font_size * len(seg) // 2
        return w

    line_widths = [measure_line(ln) for ln in lines]
    box_w = max(line_widths) + 28
    box_h = len(lines) * line_gap + 16

    pad = 10
    x0 = int(W * 0.09)
    y0 = int(H * 0.015)

    # Draw semi-transparent background box
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle(
        [x0 - pad, y0 - pad, x0 + box_w, y0 + box_h],
        radius=8,
        fill=(10, 10, 10, 220),
        outline=(0, 255, 255, 255),
        width=1,
    )
    img = Image.alpha_composite(img, overlay)

    # Draw text: render each segment as a whole string to preserve Thai shaping
    draw = ImageDraw.Draw(img)
    cy = y0
    for ln in lines:
        cx = x0
        for is_e, seg in _split_segments(ln):
            fnt = f_emoji if is_e else f_thai
            try:
                draw.text((cx, cy), seg, font=fnt, fill=(0, 255, 255, 255),
                          embedded_color=is_e)
                bb = draw.textbbox((cx, cy), seg, font=fnt)
                cx += bb[2] - bb[0]
            except Exception:
                cx += font_size * len(seg) // 2
        cy += line_gap

    img.convert('RGB').save(out_path, dpi=(150, 150))


def generate_charts(date_str=None) -> list:
    if date_str is None:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")

    engine = create_engine(DB_URL)
    scores_df = pd.read_sql(
        "SELECT * FROM ceo_scores WHERE latest_trade_date = %(d)s",
        engine, params={"d": date_str}
    )
    filings_df = pd.read_sql(
        "SELECT symbol, name, transaction_type, trade_date, volume, price FROM sec_filings "
        "WHERE trade_date >= %(cutoff)s",
        engine,
        params={"cutoff": (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")}
    )
    filings_df['trade_date'] = pd.to_datetime(filings_df['trade_date'])

    paths = []
    for _, score in scores_df.iterrows():
        sub = filings_df[
            (filings_df['symbol'] == score['symbol']) &
            (filings_df['name']   == score['name'])
        ]
        try:
            path = generate_chart(score.to_dict(), sub)
            paths.append(path)
            print(f"  ✅ Chart saved: {path}")
        except Exception as e:
            print(f"  ❌ Chart failed for {score['symbol']} / {score['name']}: {e}")
    return paths


if __name__ == "__main__":
    import sys
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    results = generate_charts(date_arg)
    print(f"\nDone. {len(results)} chart(s) saved.")
