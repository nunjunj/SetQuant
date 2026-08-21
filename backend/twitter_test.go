package main

import (
	"strings"
	"testing"
	"time"
)

func TestFormatTHB(t *testing.T) {
	cases := []struct {
		name string
		in   float64
		want string
	}{
		{"billions", 2_500_000_000, "2.5B THB"},
		{"millions", 3_400_000, "3.4M THB"},
		{"thousands", 12_500, "12.5K THB"},
		{"small", 999, "999 THB"},
		{"negative millions", -1_200_000, "-1.2M THB"},
		{"zero", 0, "0 THB"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatTHB(tc.in); got != tc.want {
				t.Errorf("formatTHB(%v) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestFormatPct(t *testing.T) {
	cases := []struct {
		name string
		in   float64
		want string
	}{
		{"positive", 0.1234, "+12.34%"},
		{"negative", -0.05, "-5.00%"},
		{"zero", 0, "+0.00%"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatPct(tc.in); got != tc.want {
				t.Errorf("formatPct(%v) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestFormatTweet_BuysOnly(t *testing.T) {
	s := CeoScore{
		Name:              "Somchai",
		Symbol:            "PTT",
		BuyReturnPct:      0.15,
		SellReturnPct:     0,
		CombinedReturnPct: 0.15,
		Stock1YPct:        0.08,
		BuyCount:          3,
		SellCount:         0,
		LatestAction:      "BUY",
		LatestVolumeTHB:   1_000_000,
		LatestPrice:       35.5,
		LatestTradeDate:   time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
	}
	main, reply := FormatTweet(s)

	if !strings.Contains(main, "INSIDER BUYING") {
		t.Errorf("expected buy-only tweet to mention INSIDER BUYING, got: %s", main)
	}
	if strings.Contains(main, "INSIDER SELLING") || strings.Contains(main, "INSIDER ACTIVITY") {
		t.Errorf("buy-only tweet should not mention selling/activity headers, got: %s", main)
	}
	if !strings.Contains(main, "$PTT") || !strings.Contains(main, "Somchai") {
		t.Errorf("expected tweet to include symbol and name, got: %s", main)
	}
	if !strings.Contains(main, "3 buys") {
		t.Errorf("expected buy count in tweet, got: %s", main)
	}
	if reply == "" {
		t.Error("expected non-empty comment reply")
	}
}

func TestFormatTweet_SellsOnly(t *testing.T) {
	s := CeoScore{
		Name:            "Somsri",
		Symbol:          "CPALL",
		SellReturnPct:   -0.10,
		BuyReturnPct:    0,
		BuyCount:        0,
		SellCount:       5,
		LatestAction:    "SELL",
		LatestVolumeTHB: 500_000,
		LatestPrice:     60.0,
		LatestTradeDate: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
	}
	main, _ := FormatTweet(s)

	if !strings.Contains(main, "INSIDER SELLING") {
		t.Errorf("expected sell-only tweet to mention INSIDER SELLING, got: %s", main)
	}
	if strings.Contains(main, "INSIDER BUYING") || strings.Contains(main, "INSIDER ACTIVITY") {
		t.Errorf("sell-only tweet should not mention buying/activity headers, got: %s", main)
	}
	if !strings.Contains(main, "5 sells") {
		t.Errorf("expected sell count in tweet, got: %s", main)
	}
}

func TestFormatTweet_Mixed(t *testing.T) {
	s := CeoScore{
		Name:              "Somchai",
		Symbol:            "ADVANC",
		BuyReturnPct:      0.05,
		SellReturnPct:     -0.02,
		CombinedReturnPct: 0.03,
		BuyCount:          2,
		SellCount:         3,
		LatestAction:      "BUY",
		LatestVolumeTHB:   200_000,
		LatestPrice:       200.0,
		LatestTradeDate:   time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
	}
	main, _ := FormatTweet(s)

	if !strings.Contains(main, "INSIDER ACTIVITY") {
		t.Errorf("expected mixed tweet to mention INSIDER ACTIVITY, got: %s", main)
	}
	if !strings.Contains(main, "2 buys") || !strings.Contains(main, "3 sells") {
		t.Errorf("expected both buy and sell counts in mixed tweet, got: %s", main)
	}
}

func TestFormatTweet_ZeroTrade(t *testing.T) {
	// BuyCount == 0 and SellCount == 0: SellCount == 0 branch takes priority
	// (matches switch order in FormatTweet), so it renders as a "buyer" with
	// zero buys rather than panicking or dividing by zero.
	s := CeoScore{
		Name:            "Nobody",
		Symbol:          "TEST",
		BuyCount:        0,
		SellCount:       0,
		LatestTradeDate: time.Time{}, // zero value
	}
	main, reply := FormatTweet(s)

	if !strings.Contains(main, "INSIDER BUYING") {
		t.Errorf("expected zero-trade case to fall into buy branch, got: %s", main)
	}
	if !strings.Contains(main, "(0 buys)") {
		t.Errorf("expected 0 buys rendered, got: %s", main)
	}
	if !strings.Contains(main, "(?)") {
		t.Errorf("expected zero-value trade date to render as '?', got: %s", main)
	}
	if reply == "" {
		t.Error("expected non-empty comment reply even for zero-trade case")
	}
}

func TestFormatTweet_NegativeNetPosition(t *testing.T) {
	s := CeoScore{
		Name:            "Somchai",
		Symbol:          "SCB",
		BuyCount:        1,
		SellCount:       4,
		NetPosition6M:   "SELL",
		NetVolumeTHB6M:  -2_500_000,
		AvgPrice6M:      120.5,
		TradeCount6M:    5,
		LatestAction:    "SELL",
		LatestVolumeTHB: 300_000,
		LatestPrice:     121.0,
		LatestTradeDate: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
	}
	main, _ := FormatTweet(s)

	if !strings.Contains(main, "6M Net Position: SELL -2.5M THB") {
		t.Errorf("expected negative net position to render signed THB, got: %s", main)
	}
}

func TestFormatContextBlock_TodayLabel(t *testing.T) {
	now := time.Now().In(bangkokTZ)
	s := CeoScore{
		LatestAction:    "BUY",
		LatestVolumeTHB: 100_000,
		LatestPrice:     10,
		LatestTradeDate: time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, bangkokTZ),
	}
	block := formatContextBlock(s)
	if !strings.Contains(block, "Today's Action") {
		t.Errorf("expected trade dated today (Bangkok time) to render as Today's Action, got: %s", block)
	}
}

func TestFormatContextBlock_PastLabel(t *testing.T) {
	s := CeoScore{
		LatestAction:    "BUY",
		LatestVolumeTHB: 100_000,
		LatestPrice:     10,
		LatestTradeDate: time.Date(2020, 1, 1, 0, 0, 0, 0, bangkokTZ),
	}
	block := formatContextBlock(s)
	if !strings.Contains(block, "Latest Action") || strings.Contains(block, "Today's Action") {
		t.Errorf("expected past trade date to render as Latest Action, got: %s", block)
	}
}
