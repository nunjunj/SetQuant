# 1. Build Stage
FROM golang:alpine AS builder

WORKDIR /app

# Copy dependency files first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary (named 'server')
RUN go build -o server main.go

# 2. Run Stage (Tiny image for production)
FROM alpine:latest

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/server .

# Expose port 8080
EXPOSE 8080

CMD ["./server"]