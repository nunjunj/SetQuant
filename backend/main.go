package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type SecFiling struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Symbol          string    `json:"symbol"`
	Name            string    `json:"name"`
	Position        string    `json:"position"`
	SecurityType    string    `json:"security_type"`
	TradeDate       time.Time `json:"trade_date"`
	Volume          int64     `json:"volume"`
	Price           float64   `json:"price"`
	TransactionType string    `json:"transaction_type"`
	FilingDate      time.Time `json:"filing_date"`
}

var db *gorm.DB

func initDB() {
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		dsn = "host=localhost user=setquant_user password=secret_password_123 dbname=setquant_db port=5432 sslmode=disable"
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("Connected to PostgreSQL")
}

func main() {
	initDB()
	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "setquant-go-backend"})
	})

	router.GET("/api/v1/updates", func(c *gin.Context) {
		var transactions []SecFiling
		result := db.Order("trade_date desc").Limit(50).Find(&transactions)
		
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}
		c.JSON(http.StatusOK, transactions)
	})

	router.GET("/api/v1/stock/:symbol", func(c *gin.Context) {
		symbol := c.Param("symbol")
		var transactions []SecFiling
		result := db.Where("symbol = ?", symbol).Order("trade_date desc").Find(&transactions)

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}
		c.JSON(http.StatusOK, transactions)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	router.Run(":" + port)
}