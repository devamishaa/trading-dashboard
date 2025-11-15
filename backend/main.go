package main

import (
    "context"
    "encoding/json"
    "log"
    "math"
    "math/rand"
    "net/http"
    "strings"
    "sync"
    "sync/atomic"
    "time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

type StockPrice struct {
    Symbol    string    `json:"symbol"`
    Price     float64   `json:"price"`
    Change    float64   `json:"change"`
    Percent   float64   `json:"percent"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type Order struct {
    ID        int64     `json:"id"`
    Symbol    string    `json:"symbol"`
    Side      string    `json:"side"`
    Quantity  int       `json:"quantity"`
    Price     float64   `json:"price"`
    CreatedAt time.Time `json:"createdAt"`
}

type orderRequest struct {
    Symbol   string  `json:"symbol"` 
    Side     string  `json:"side"`
    Quantity int     `json:"quantity"`
    Price    float64 `json:"price"`
}

type priceUpdateMessage struct {
    Type   string       `json:"type"`
    Prices []StockPrice `json:"prices"`
}

type priceState struct {
    symbol    string
    price     float64
    change    float64
    percent   float64
    updatedAt time.Time
}

var (
    priceBook = map[string]*priceState{
        "AAPL": {symbol: "AAPL", price: 185.32, updatedAt: time.Now()},
        "TSLA": {symbol: "TSLA", price: 248.76, updatedAt: time.Now()},
        "AMZN": {symbol: "AMZN", price: 131.44, updatedAt: time.Now()},
        "INFY": {symbol: "INFY", price: 17.92, updatedAt: time.Now()},
        "TCS":  {symbol: "TCS", price: 53.27, updatedAt: time.Now()},
    }
    priceMu sync.RWMutex

    orders   = make([]Order, 0)
    orderMu  sync.RWMutex
    orderSeq int64

    upgrader = websocket.Upgrader{
        ReadBufferSize:  1024,
        WriteBufferSize: 1024,
        CheckOrigin: func(r *http.Request) bool {
            return true
        },
    }

    clients   = make(map[*websocket.Conn]struct{})
    clientsMu sync.Mutex
)

func main() {
    rand.Seed(time.Now().UnixNano())

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    go startPriceEngine(ctx, 10*time.Second)

    router := gin.Default()
    router.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"*"},
        AllowMethods:     []string{"GET", "POST", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
        AllowCredentials: true,
    }))

    // Public endpoints
    router.POST("/login", loginHandler)
    router.GET("/prices", getPricesHandler)
    router.GET("/ws", wsHandler)

    // Protected endpoints (require JWT)
    protected := router.Group("/")
    protected.Use(authMiddleware())
    {
        protected.GET("/orders", getOrdersHandler)
        protected.POST("/orders", createOrderHandler)
    }

    addr := ":8080"
    log.Printf("trading backend running on %s", addr)
    if err := router.Run(addr); err != nil {
        log.Fatalf("server exited: %v", err)
    }
}

func getPricesHandler(c *gin.Context) {
    c.JSON(http.StatusOK, snapshotPrices())
}

func getOrdersHandler(c *gin.Context) {
    orderMu.RLock()
    defer orderMu.RUnlock()
    c.JSON(http.StatusOK, orders)
}

func createOrderHandler(c *gin.Context) {
    var req orderRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request payload"})
        return
    }

    symbol := strings.ToUpper(strings.TrimSpace(req.Symbol))
    if symbol == "" {
        c.JSON(http.StatusBadRequest, gin.H{"message": "symbol is required"})
        return
    }

    if !isSupportedSymbol(symbol) {
        c.JSON(http.StatusBadRequest, gin.H{"message": "unsupported symbol"})
        return
    }

    side := strings.ToUpper(strings.TrimSpace(req.Side))
    if side != "BUY" && side != "SELL" {
        c.JSON(http.StatusBadRequest, gin.H{"message": "side must be BUY or SELL"})
        return
    }

    if req.Quantity <= 0 {
        c.JSON(http.StatusBadRequest, gin.H{"message": "quantity must be positive"})
        return
    }

    if req.Price <= 0 {
        c.JSON(http.StatusBadRequest, gin.H{"message": "price must be positive"})
        return
    }

    order := Order{
        ID:        atomic.AddInt64(&orderSeq, 1),
        Symbol:    symbol,
        Side:      side,
        Quantity:  req.Quantity,
        Price:     roundToTwo(req.Price),
        CreatedAt: time.Now(),
    }

    orderMu.Lock()
    orders = append(orders, order)
    orderMu.Unlock()

    c.JSON(http.StatusCreated, order)
}

func wsHandler(c *gin.Context) {
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("ws upgrade failed: %v", err)
        return
    }

    registerClient(conn)
    sendInitialSnapshot(conn)

    go func() {
        defer func() {
            unregisterClient(conn)
            conn.Close()
        }()
        for {
            if _, _, err := conn.ReadMessage(); err != nil {
                break
            }
        }
    }()
}

func registerClient(conn *websocket.Conn) {
    clientsMu.Lock()
    clients[conn] = struct{}{}
    clientsMu.Unlock()
}

func unregisterClient(conn *websocket.Conn) {
    clientsMu.Lock()
    delete(clients, conn)
    clientsMu.Unlock()
}

func sendInitialSnapshot(conn *websocket.Conn) {
    payload := priceUpdateMessage{
        Type:   "prices",
        Prices: snapshotPrices(),
    }
    sendPricePayload(conn, payload)
}

func snapshotPrices() []StockPrice {
    priceMu.RLock()
    defer priceMu.RUnlock()

    result := make([]StockPrice, 0, len(priceBook))
    for _, ps := range priceBook {
        result = append(result, StockPrice{
            Symbol:    ps.symbol,
            Price:     roundToTwo(ps.price),
            Change:    roundToTwo(ps.change),
            Percent:   roundToTwo(ps.percent),
            UpdatedAt: ps.updatedAt,
        })
    }
    return result
}

func startPriceEngine(ctx context.Context, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            updates := applyPriceChanges()
            broadcastPrices(updates)
        case <-ctx.Done():
            return
        }
    }
}

func applyPriceChanges() []StockPrice {
    priceMu.Lock()
    defer priceMu.Unlock()

    updates := make([]StockPrice, 0, len(priceBook))
    now := time.Now()
    for _, ps := range priceBook {
        direction := 1.0
        if rand.Intn(2) == 0 {
            direction = -1.0
        }
        deltaPercent := (rand.Float64()*1.5 + 0.5) / 100.0
        changeFactor := 1 + (direction * deltaPercent)
        newPrice := ps.price * changeFactor

        priceChange := newPrice - ps.price
        percentChange := 0.0
        if ps.price != 0 {
            percentChange = (priceChange / ps.price) * 100
        }

        ps.price = newPrice
        ps.change = priceChange
        ps.percent = percentChange
        ps.updatedAt = now

        updates = append(updates, StockPrice{
            Symbol:    ps.symbol,
            Price:     roundToTwo(ps.price),
            Change:    roundToTwo(ps.change),
            Percent:   roundToTwo(ps.percent),
            UpdatedAt: ps.updatedAt,
        })
    }

    return updates
}

func broadcastPrices(prices []StockPrice) {
    if len(prices) == 0 {
        return
    }

    payload := priceUpdateMessage{
        Type:   "prices",
        Prices: prices,
    }

    clientsMu.Lock()
    conns := make([]*websocket.Conn, 0, len(clients))
    for conn := range clients {
        conns = append(conns, conn)
    }
    clientsMu.Unlock()

    for _, conn := range conns {
        sendPricePayload(conn, payload)
    }
}

func sendPricePayload(conn *websocket.Conn, payload priceUpdateMessage) {
    data, err := json.Marshal(payload)
    if err != nil {
        log.Printf("marshal prices failed: %v", err)
        return
    }

    if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
        unregisterClient(conn)
        conn.Close()
    }
}

func isSupportedSymbol(symbol string) bool {
    priceMu.RLock()
    defer priceMu.RUnlock()
    _, ok := priceBook[symbol]
    return ok
}

func roundToTwo(val float64) float64 {
    return math.Round(val*100) / 100
}
