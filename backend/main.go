package main

import (
	"crypto/subtle"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// bangkokTZ is Thailand's fixed UTC+7 offset (no DST). Used wherever we need
// "today" from Thailand's perspective — the SEC data and tweet cadence are
// both Thailand-local, and comparing against time.Now().UTC() breaks in the
// Bangkok evening (UTC has already rolled to the next day).
var bangkokTZ = time.FixedZone("ICT", 7*3600)

type SecFiling struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Symbol          string    `gorm:"index" json:"symbol"`
	Name            string    `json:"name"`
	Position        string    `json:"position"`
	SecurityType    string    `json:"security_type"`
	TradeDate       time.Time `gorm:"index" json:"trade_date"`
	Volume          int64     `json:"volume"`
	Price           float64   `json:"price"`
	TransactionType string    `json:"transaction_type"`
	FilingDate      time.Time `json:"filing_date"`
}

// CeoScore holds pre-calculated mark-to-market metrics per executive/symbol pair.
// Populated daily by scraper/calculate_scores.py.
type CeoScore struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	Name              string    `gorm:"uniqueIndex:idx_ceo_symbol;not null" json:"name"`
	Symbol            string    `gorm:"uniqueIndex:idx_ceo_symbol;not null" json:"symbol"`
	TotalBoughtTHB    float64   `json:"total_bought_thb"`
	TotalSoldTHB      float64   `json:"total_sold_thb"`
	BuyReturnPct      float64   `json:"buy_return_pct"`
	SellReturnPct     float64   `json:"sell_return_pct"`
	CombinedReturnPct float64   `json:"combined_return_pct"`
	Stock1YPct        float64   `gorm:"column:stock_1y_pct" json:"stock_1y_pct"`
	BuyCount          int       `json:"buy_count"`
	SellCount         int       `json:"sell_count"`
	LatestAction      string    `gorm:"column:latest_action"      json:"latest_action"`
	LatestVolumeTHB   float64   `gorm:"column:latest_volume_thb"  json:"latest_volume_thb"`
	LatestPrice       float64   `gorm:"column:latest_price"       json:"latest_price"`
	NetPosition6M     string    `gorm:"column:net_position_6m"    json:"net_position_6m"`
	NetVolumeTHB6M    float64   `gorm:"column:net_volume_thb_6m"  json:"net_volume_thb_6m"`
	AvgPrice6M        float64   `gorm:"column:avg_price_6m"       json:"avg_price_6m"`
	TradeCount6M      int       `gorm:"column:trade_count_6m"     json:"trade_count_6m"`
	LatestTradeDate   time.Time `gorm:"column:latest_trade_date"  json:"latest_trade_date"`
	CalculatedAt      time.Time `json:"calculated_at"`
}

var db *gorm.DB

func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	if err := db.AutoMigrate(&SecFiling{}, &CeoScore{}); err != nil {
		log.Fatal("Failed to auto-migrate schema:", err)
	}
	log.Println("Connected to PostgreSQL")
}

func main() {
	if os.Getenv("APP_ENV") == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	initDB()
	router := gin.Default()
	router.SetTrustedProxies(nil)

	// CORS: allow the frontend origin (CORS_ORIGIN), defaulting to any in dev.
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", corsOrigin)
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "setquant-go-backend"})
	})

	router.GET("/api/v1/updates", func(c *gin.Context) {
		// `tier` constrains the response to filings by top-N leaderboard insiders.
		// ALL (or invalid) returns the latest 50 filings unconstrained — matching
		// the previous behaviour. TOP_50 / TOP_10 walk further back in time so the
		// feed always shows up to 50 trades by qualifying insiders, however rare.
		var tierLimit int
		switch c.Query("tier") {
		case "TOP_10":
			tierLimit = 10
		case "TOP_50":
			tierLimit = 50
		default:
			tierLimit = 0 // ALL or invalid
		}

		// `id desc` is a deterministic tiebreaker for rows sharing a trade_date.
		q := db.Order("trade_date desc, id desc").Limit(50)
		if tierLimit > 0 {
			// `id asc` is a deterministic tiebreaker — without it, two scores tied
			// at the boundary could shuffle the subquery's result set per call.
			topQ := db.Model(&CeoScore{}).
				Select("symbol, name").
				Order("combined_return_pct desc, id asc").
				Limit(tierLimit)
			q = q.Where("(symbol, name) IN (?)", topQ)
		}

		var transactions []SecFiling
		if result := q.Find(&transactions); result.Error != nil {
			log.Printf("❌ /api/v1/updates query failed: %v", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.JSON(http.StatusOK, transactions)
	})

	router.GET("/api/v1/stock/:symbol", func(c *gin.Context) {
		symbol := c.Param("symbol")
		var transactions []SecFiling
		result := db.Where("symbol = ?", symbol).Order("trade_date desc").Find(&transactions)

		if result.Error != nil {
			log.Printf("❌ /api/v1/stock/%s query failed: %v", symbol, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.JSON(http.StatusOK, transactions)
	})

	router.GET("/api/v1/scores", func(c *gin.Context) {
		var scores []CeoScore
		// `id asc` is a deterministic tiebreaker — without it, rows tied at the
		// same combined_return_pct could reorder between calls.
		result := db.Order("combined_return_pct desc, id asc").Find(&scores)
		if result.Error != nil {
			log.Printf("❌ /api/v1/scores query failed: %v", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.JSON(http.StatusOK, scores)
	})

	router.GET("/api/v1/scores/:symbol", func(c *gin.Context) {
		symbol := c.Param("symbol")
		var scores []CeoScore
		result := db.Where("symbol = ?", symbol).Order("combined_return_pct desc").Find(&scores)
		if result.Error != nil {
			log.Printf("❌ /api/v1/scores/%s query failed: %v", symbol, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.JSON(http.StatusOK, scores)
	})

	router.GET("/api/v1/tweet/:symbol", func(c *gin.Context) {
		symbol := c.Param("symbol")
		var scores []CeoScore
		result := db.Where("symbol = ?", symbol).Order("combined_return_pct desc").Find(&scores)
		if result.Error != nil {
			log.Printf("❌ /api/v1/tweet/%s query failed: %v", symbol, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		type TweetResponse struct {
			Name         string `json:"name"`
			Symbol       string `json:"symbol"`
			MainTweet    string `json:"main_tweet"`
			CommentReply string `json:"comment_reply"`
		}
		out := make([]TweetResponse, 0, len(scores))
		for _, s := range scores {
			main, reply := FormatTweet(s)
			out = append(out, TweetResponse{
				Name: s.Name, Symbol: s.Symbol,
				MainTweet: main, CommentReply: reply,
			})
		}
		c.JSON(http.StatusOK, out)
	})

	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "dev"
	}

	router.POST("/api/internal/trigger-daily-tweet", func(c *gin.Context) {
		incoming := c.GetHeader("X-SetQuant-Secret")
		if incoming == "" || subtle.ConstantTimeCompare([]byte(incoming), []byte(webhookSecret)) != 1 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		// If a ?date= param is provided, force dev-only simulation — never post to social media.
		dateOverride := c.Query("date")
		isTestRun := dateOverride != ""

		if isTestRun && appEnv == "prod" {
			c.JSON(http.StatusForbidden, gin.H{"error": "date override is not allowed in prod"})
			return
		}

		today := time.Now().In(bangkokTZ).Format("2006-01-02")
		if isTestRun {
			today = dateOverride
			log.Printf("🧪 [TEST] Date override: querying for %s", today)
		}

		var scores []CeoScore
		result := db.Where("latest_trade_date = ?", today).Find(&scores)
		if result.Error != nil {
			log.Printf("❌ DB query failed: %v", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}

		if len(scores) == 0 {
			log.Printf("ℹ️  No SET50 trades found for %s.", today)
			c.JSON(http.StatusOK, gin.H{"status": "no_trades_today", "count": 0})
			return
		}

		log.Printf("✅ Found %d SET50 trade(s) for %s. Formatting...", len(scores), today)

		for _, s := range scores {
			mainTweet, _ := FormatTweet(s)
			if !isTestRun && appEnv == "prod" {
				if err := PostTweet(mainTweet); err != nil {
					log.Printf("❌ Twitter post failed for %s: %v", s.Symbol, err)
				} else {
					log.Printf("✅ Posted to Twitter for %s", s.Symbol)
				}
			} else {
				log.Printf("🧪 [DEV] Simulated tweet:\n%s", mainTweet)
			}
		}

		c.JSON(http.StatusOK, gin.H{"status": "triggered", "count": len(scores)})
	})

	router.GET("/api/internal/test-tweet", func(c *gin.Context) {
		if appEnv == "prod" {
			c.JSON(http.StatusForbidden, gin.H{"error": "not allowed in prod"})
			return
		}
		if err := PostTweet("🧪 SetQuant test tweet — ignore"); err != nil {
			log.Printf("❌ test-tweet post failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "posted"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	router.Run(":" + port)
}