# Trading Dashboard

A full-stack trading dashboard that simulates a real-time trading environment with a Go backend and a React (Vite) frontend. Features JWT authentication, live price charts, and real-time WebSocket updates.

## ✨ Features

### Backend Features
- **Mock market data engine** using goroutines and channels to randomly move prices every 10 seconds
- **Price simulation**: Each stock price changes by 0.5-2% randomly (up or down) every 10 seconds
- **REST APIs** for prices and in-memory order storage
- **WebSocket feed** at `/ws` broadcasting live price updates to all connected clients
- **JWT Authentication** with secure login and protected order endpoints
- **Password hashing** using bcrypt for secure credential storage

### Frontend Features
- **Live Prices Table** - Real-time price updates via WebSocket with color-coded changes (green for gains, red for losses)
- **Interactive Price Charts** - Area charts showing price history over time with symbol selector
- **Order Form** - Inputs for symbol, buy/sell side, quantity, and price with validation
- **Orders Table** - Beautiful card-based display of all submitted orders
- **Market Highlights** - Top gainer/decliner, advancers/decliners statistics
- **Ticker Tape** - Scrolling marquee showing live prices
- **JWT Login System** - Secure authentication with session persistence
- **Responsive Design** - Modern dark gradient theme with glassmorphism effects
- **Auto-reconnection** - WebSocket automatically reconnects on disconnect

## 🚀 Quick Start

### Backend (Go)

Requirements: Go 1.21+

```bash
cd backend
# Install dependencies
go mod tidy

# Start the API + WebSocket server on :8080
go run .
```

**API Endpoints:**

- `POST /login` – Login endpoint (public)
  - Request: `{ "username": "admin", "password": "admin123" }`
  - Response: `{ "token": "jwt_token", "user": "admin" }`

- `GET /prices` – Current prices for all mock stocks (public)
  - Returns: Array of stock prices (AAPL, TSLA, AMZN, INFY, TCS)

- `GET /orders` – List all placed orders (protected - requires JWT)
  - Headers: `Authorization: Bearer <token>`

- `POST /orders` – Create a new order (protected - requires JWT)
  - Headers: `Authorization: Bearer <token>`
  - Request: `{ "symbol": "AAPL", "side": "BUY", "quantity": 10, "price": 185.50 }`

- `GET /ws` – WebSocket streaming live price updates (public)
  - Connects via WebSocket protocol
  - Receives price updates every 10 seconds

**Demo Credentials:**
- Username: `admin` / Password: `admin123`
- Username: `trader` / Password: `trader123`

### Frontend (React + Vite)

Requirements: Node 18+

```bash
cd frontend
# Install dependencies
npm install

# Start development server on http://localhost:5173
npm run dev

# Build for production
npm run build
```

**Environment Variables:**
- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:8080`)

## 📊 Stock Symbols

The dashboard tracks the following mock stocks:
- **AAPL** - Apple Inc.
- **TSLA** - Tesla Inc.
- **AMZN** - Amazon.com Inc.
- **INFY** - Infosys Limited
- **TCS** - Tata Consultancy Services

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. **Login**: POST credentials to `/login` endpoint
2. **Token Storage**: JWT token is stored in browser localStorage
3. **Protected Routes**: Order endpoints require valid JWT token in `Authorization` header
4. **Token Expiration**: Tokens expire after 24 hours
5. **Auto Logout**: User is automatically logged out on token expiration (401 response)

## 🎨 UI Features

- **Dark Gradient Theme** - Modern dark theme with gradient backgrounds
- **Glassmorphism Effects** - Frosted glass panels with backdrop blur
- **Color-Coded Prices** - Green for price increases, red for decreases
- **Real-Time Charts** - Interactive area charts with tooltips
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Smooth Animations** - Transitions and hover effects throughout

## 📈 Price Update Mechanism

- **Update Interval**: Prices update every 10 seconds
- **Price Change Range**: 0.5% to 2% per update
- **Direction**: Random (up or down)
- **Broadcast**: All connected WebSocket clients receive updates simultaneously

## 🛠️ Technology Stack

### Backend
- **Go 1.21+** - Programming language
- **Gin** - Web framework
- **Gorilla WebSocket** - WebSocket implementation
- **JWT (golang-jwt/jwt/v5)** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Recharts** - Chart library
- **CSS3** - Styling with gradients and animations

## 📁 Project Structure

```
trading-dashboard/
├── backend/
│   ├── main.go          # Main server, routes, price engine
│   ├── auth.go          # JWT authentication & middleware
│   ├── go.mod           # Go dependencies
│   └── go.sum           # Dependency checksums
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── App.css      # Styles
│   │   └── main.jsx     # Entry point
│   ├── package.json     # Node dependencies
│   └── vite.config.js   # Vite configuration
└── README.md            # This file
```

## 🔧 Configuration

### Backend Configuration

- **Port**: Default `:8080` (change in `main.go`)
- **JWT Secret**: Set `JWT_SECRET` environment variable (default: development key)
- **Price Update Interval**: 10 seconds (change in `main.go` line 89)
- **Price Change Range**: 0.5-2% (change in `main.go` line 257)

### Frontend Configuration

- **API Base URL**: Set `VITE_API_BASE_URL` in `.env.local`
- **WebSocket Reconnect**: 2.5 seconds delay (change in `App.jsx`)

## 🚢 Deployment Notes

### Backend
- Backend is stateless and stores orders in memory
- For production, replace in-memory storage with a database (PostgreSQL, MongoDB, etc.)
- Set `JWT_SECRET` environment variable to a secure random string
- Update CORS settings in `main.go` for production origins
- Can be deployed on:
  - AWS ECS/Fargate
  - AWS EC2
  - Google Cloud Run
  - Heroku
  - Any container platform

### Frontend
- Build with `npm run build`
- Serve static files from `dist/` directory
- Can be deployed on:
  - AWS S3 + CloudFront
  - Netlify
  - Vercel
  - GitHub Pages
  - Any static hosting service

## 📝 Development Notes

- **Price History**: Frontend maintains last 100 price points per symbol for charts
- **Order Storage**: Currently in-memory (lost on server restart)
- **WebSocket**: Auto-reconnects with exponential backoff
- **Error Handling**: Graceful error messages and fallbacks

## 🎯 Assignment Requirements Status

✅ **Core Requirements:**
- ✅ GET /prices endpoint
- ✅ POST /orders endpoint (with JWT protection)
- ✅ GET /orders endpoint (with JWT protection)
- ✅ WebSocket /ws endpoint with live price updates
- ✅ Mock price engine with goroutines and channels
- ✅ Live prices table with WebSocket updates
- ✅ Order form with validation
- ✅ Orders table display
- ✅ Dynamic price updates
- ✅ Color-coded price changes

✅ **Bonus Requirements:**
- ✅ JWT authentication for login and secure order APIs
- ✅ Clean, modular code structure
- ⏳ AWS Cloud deployment (instructions provided)

## 📄 License

This project is created for educational/demonstration purposes.

## 👤 Author

Full-Stack Developer Assignment - Trading Dashboard
