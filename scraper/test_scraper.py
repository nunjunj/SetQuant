"""Unit tests for the scraper's pure helpers. No database or network required.

Run: python -m pytest scraper/test_scraper.py -q
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import convert_thai_date  # noqa: E402
from calculate_scores import BUY, SELL, OTHER, classify_transaction  # noqa: E402


@pytest.mark.parametrize("raw, expected", [
    # normal date: BE 2567 → CE 2024
    ("15/03/2567", "2024-03-15"),
    # zero-padding of single-digit day/month
    ("1/2/2567", "2024-02-01"),
    ("5/12/2566", "2023-12-05"),
    # already padded stays padded
    ("05/09/2568", "2025-09-05"),
    # whitespace tolerated
    ("  15/03/2567  ", "2024-03-15"),
    # BE → CE math (BE = CE + 543)
    ("01/01/2533", "1990-01-01"),
    # out-of-range year (CE 1889) → None
    ("01/01/2432", None),
    # out-of-range year (CE 2500) → None
    ("01/01/3043", None),
    # already-Gregorian input lands far in the past → None
    ("15/03/2024", None),
    # invalid input
    ("", None),
    ("not a date", None),
    ("15-03-2567", None),
    ("15/03", None),
    ("15/03/2567/99", None),
    ("aa/bb/cccc", None),
    (None, None),
    # impossible calendar day
    ("31/02/2567", None),
    ("32/01/2567", None),
    ("15/13/2567", None),
])
def test_convert_thai_date(raw, expected):
    assert convert_thai_date(raw) == expected


@pytest.mark.parametrize("raw, expected", [
    # buys
    ("ซื้อ", BUY),
    ("ได้มา", BUY),
    ("ซื้อหุ้นสามัญ", BUY),
    ("Buy", BUY),
    ("BUY", BUY),
    # sells
    ("ขาย", SELL),
    ("จำหน่าย", SELL),
    ("ขายหุ้นสามัญ", SELL),
    ("Sell", SELL),
    # transfers must never be BUY or SELL
    ("โอน", OTHER),
    ("รับโอน", OTHER),
    ("โอนออก", OTHER),
    ("โอนหุ้นให้บุตร", OTHER),
    # transfer wins even when a buy/sell word is also present
    ("รับโอนจากการซื้อ", OTHER),
    ("โอนขาย", OTHER),
    # empty / garbage
    ("", OTHER),
    ("   ", OTHER),
    ("nan", OTHER),
    ("None", OTHER),
    ("???", OTHER),
    ("แปลงสภาพ", OTHER),
    (None, OTHER),
])
def test_classify_transaction(raw, expected):
    assert classify_transaction(raw) == expected


def test_classification_is_mutually_exclusive():
    """A row is exactly one of BUY / SELL / OTHER."""
    samples = ["ซื้อ", "ขาย", "ได้มา", "จำหน่าย", "โอน", "รับโอน", "", "xyz"]
    for sample in samples:
        result = classify_transaction(sample)
        assert result in (BUY, SELL, OTHER)
        assert [result == BUY, result == SELL, result == OTHER].count(True) == 1
