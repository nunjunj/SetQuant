# SetQuant

Insider-filings tracker for the Stock Exchange of Thailand. It scrapes SEC filings,
compares what executives buy and sell against the stock's actual price, and shows a
feed, a leaderboard, and per-stock charts.

Live demo: https://setquant.vercel.app

## How it works

A scraper pulls the filings daily into Postgres, and a scoring job uses Yahoo Finance
prices to work out how each executive's trades have done.

## Running it

```bash
cp .env.example .env
docker-compose up        # http://localhost:3000
```

Or just the frontend:

```bash
cd frontend && npm install && npm run dev
```
