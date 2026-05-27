package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

func formatTHB(v float64) string {
	abs := math.Abs(v)
	switch {
	case abs >= 1_000_000_000:
		return fmt.Sprintf("%.1fB THB", v/1_000_000_000)
	case abs >= 1_000_000:
		return fmt.Sprintf("%.1fM THB", v/1_000_000)
	case abs >= 1_000:
		return fmt.Sprintf("%.1fK THB", v/1_000)
	default:
		return fmt.Sprintf("%.0f THB", v)
	}
}

func formatPct(v float64) string {
	return fmt.Sprintf("%+.2f%%", v*100)
}

func formatContextBlock(s CeoScore) string {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	tradeDay := s.LatestTradeDate.UTC().Truncate(24 * time.Hour)

	label := "Latest Action"
	if tradeDay.Equal(today) {
		label = "Today's Action"
	}
	var dateStr string
	if s.LatestTradeDate.IsZero() {
		dateStr = "?"
	} else {
		dateStr = s.LatestTradeDate.Format("Jan 2")
	}

	block := fmt.Sprintf("⚡ %s: %s %s @ %.2f THB (%s)\n",
		label, s.LatestAction, formatTHB(s.LatestVolumeTHB), s.LatestPrice, dateStr)
	if s.TradeCount6M >= 2 {
		block += fmt.Sprintf("⏳ 6M Net Position: %s %s @ %.2f THB Avg\n",
			s.NetPosition6M, formatTHB(s.NetVolumeTHB6M), s.AvgPrice6M)
	}
	block += "\n"
	return block
}

// FormatTweet returns a main tweet and a comment reply for a CeoScore.
// The format varies based on whether the executive only bought, only sold, or did both.
func FormatTweet(s CeoScore) (mainTweet, commentReply string) {
	switch {
	case s.SellCount == 0:
		// Pure buyer
		mainTweet = fmt.Sprintf(
			"🚨 SET QUANT: INSIDER BUYING 🚨\n"+
				"$%s - %s\n\n"+
				"%s"+
				"🎯 Follower ROI (1Y): %s (%d buys)\n"+
				"📊 $%s Stock 1Y: %s",
			s.Symbol, s.Name,
			formatContextBlock(s),
			formatPct(s.BuyReturnPct), s.BuyCount,
			s.Symbol, formatPct(s.Stock1YPct),
		)

	case s.BuyCount == 0:
		// Pure seller
		mainTweet = fmt.Sprintf(
			"🚨 SET QUANT: INSIDER SELLING 🚨\n"+
				"$%s - %s\n\n"+
				"%s"+
				"🎯 Follower ROI (1Y): %s (%d sells)\n"+
				"📊 $%s Stock 1Y: %s",
			s.Symbol, s.Name,
			formatContextBlock(s),
			formatPct(s.SellReturnPct), s.SellCount,
			s.Symbol, formatPct(s.Stock1YPct),
		)

	default:
		// Active trader — both buys and sells
		mainTweet = fmt.Sprintf(
			"🚨 SET QUANT: INSIDER ACTIVITY 🚨\n"+
				"$%s - %s\n\n"+
				"%s"+
				"🎯 Follower ROI (1Y): %s\n"+
				"├ 📈 Buy Return: %s (%d buys)\n"+
				"└ 📉 Sell Return: %s (%d sells)\n"+
				"📊 $%s Stock 1Y: %s",
			s.Symbol, s.Name,
			formatContextBlock(s),
			formatPct(s.CombinedReturnPct),
			formatPct(s.BuyReturnPct), s.BuyCount,
			formatPct(s.SellReturnPct), s.SellCount,
			s.Symbol, formatPct(s.Stock1YPct),
		)
	}

	commentReply = "🤖 SetQuant Insight: ผลตอบแทนโดยประมาณหากคุณจัดพอร์ตตามผู้บริหารท่านนี้ในช่วง 1 ปีที่ผ่านมา (Long เมื่อผู้บริหารซื้อ, Short เมื่อผู้บริหารขาย) เทียบกับการเติบโตของราคาหุ้น"

	return
}

// PostTweet posts text to Twitter via OAuth 1.0a + Twitter v2 API.
func PostTweet(text string) error {
	apiKey := os.Getenv("TWITTER_API_KEY")
	apiSecret := os.Getenv("TWITTER_API_SECRET")
	accessToken := os.Getenv("TWITTER_ACCESS_TOKEN")
	accessSecret := os.Getenv("TWITTER_ACCESS_SECRET")

	if apiKey == "" || apiSecret == "" || accessToken == "" || accessSecret == "" {
		return fmt.Errorf("missing Twitter credentials in environment")
	}

	const twitterURL = "https://api.twitter.com/2/tweets"

	// Build request body.
	body, err := json.Marshal(map[string]string{"text": text})
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}

	// Generate OAuth nonce (16 random bytes, base64 URL-safe, stripped of non-alphanumerics).
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return fmt.Errorf("nonce: %w", err)
	}
	nonce := strings.TrimRight(base64.StdEncoding.EncodeToString(nonceBytes), "=")
	nonce = strings.NewReplacer("+", "", "/", "", "=", "").Replace(nonce)

	timestamp := fmt.Sprintf("%d", time.Now().Unix())

	// Collect OAuth params (must be sorted for signature base string).
	oauthParams := map[string]string{
		"oauth_consumer_key":     apiKey,
		"oauth_nonce":            nonce,
		"oauth_signature_method": "HMAC-SHA1",
		"oauth_timestamp":        timestamp,
		"oauth_token":            accessToken,
		"oauth_version":          "1.0",
	}

	// Build signature base string.
	paramKeys := make([]string, 0, len(oauthParams))
	for k := range oauthParams {
		paramKeys = append(paramKeys, k)
	}
	sort.Strings(paramKeys)

	paramParts := make([]string, 0, len(paramKeys))
	for _, k := range paramKeys {
		paramParts = append(paramParts, url.QueryEscape(k)+"="+url.QueryEscape(oauthParams[k]))
	}
	paramString := strings.Join(paramParts, "&")

	sigBaseString := "POST" + "&" +
		url.QueryEscape(twitterURL) + "&" +
		url.QueryEscape(paramString)

	// Sign with HMAC-SHA1.
	signingKey := url.QueryEscape(apiSecret) + "&" + url.QueryEscape(accessSecret)
	mac := hmac.New(sha1.New, []byte(signingKey))
	mac.Write([]byte(sigBaseString))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Build Authorization header.
	oauthParams["oauth_signature"] = signature
	headerParts := make([]string, 0, len(oauthParams))
	for k, v := range oauthParams {
		headerParts = append(headerParts, url.QueryEscape(k)+`="`+url.QueryEscape(v)+`"`)
	}
	sort.Strings(headerParts)
	authHeader := "OAuth " + strings.Join(headerParts, ", ")

	// Send request.
	req, err := http.NewRequest("POST", twitterURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("twitter API %d: %s", resp.StatusCode, string(respBody))
}
