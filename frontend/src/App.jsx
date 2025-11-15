import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import './App.css'

const DEFAULT_API_BASE =
  cleanBase(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')

const SUPPORTED_SYMBOLS = ['AAPL', 'TSLA', 'AMZN', 'INFY', 'TCS']
const WS_RETRY_MS = 2500

function cleanBase(url) {
  if (!url) return ''
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function buildHttpUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API_BASE}${normalizedPath}`
}

function buildWsUrl() {
  try {
    const wsUrl = new URL(DEFAULT_API_BASE)
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    wsUrl.pathname = '/ws'
    wsUrl.search = ''
    wsUrl.hash = ''
    return wsUrl.toString()
  } catch (err) {
    console.warn('Invalid API base URL, using default ws address', err)
    return 'ws://localhost:8080/ws'
  }
}

const initialOrderState = {
  symbol: SUPPORTED_SYMBOLS[0],
  side: 'BUY',
  quantity: 10,
  price: '',
}

function App() {
  const [prices, setPrices] = useState({})
  const [priceHistory, setPriceHistory] = useState({})
  const [selectedSymbol, setSelectedSymbol] = useState(SUPPORTED_SYMBOLS[0])
  const [orders, setOrders] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const [form, setForm] = useState(initialOrderState)
  const [formMessage, setFormMessage] = useState(null)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
  const [user, setUser] = useState(() => localStorage.getItem('auth_user'))
  const [showLogin, setShowLogin] = useState(!token)

  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  useEffect(() => {
    fetchLatestPrices()
    if (token) {
      fetchOrders()
      const orderInterval = setInterval(fetchOrders, 5000)
      return () => clearInterval(orderInterval)
    }
  }, [token])

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const connectWebSocket = () => {
    const wsUrl = buildWsUrl()
    const socket = new WebSocket(wsUrl)
    wsRef.current = socket
    setWsStatus('connecting')

    socket.onopen = () => setWsStatus('connected')
    socket.onerror = () => {
      setWsStatus('error')
      socket.close()
    }
    socket.onclose = () => {
      setWsStatus('disconnected')
      reconnectTimer.current = setTimeout(connectWebSocket, WS_RETRY_MS)
    }
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type === 'prices') {
          const nextState = {}
          const now = Date.now()
          setPriceHistory((prev) => {
            const updated = { ...prev }
            payload.prices?.forEach((price) => {
              nextState[price.symbol] = price
              if (!updated[price.symbol]) {
                updated[price.symbol] = []
              }
              updated[price.symbol] = [
                ...updated[price.symbol],
                {
                  time: now,
                  price: Number(price.price),
                  change: Number(price.change),
                  percent: Number(price.percent),
                },
              ].slice(-100)
            })
            return updated
          })
          setPrices(nextState)
        }
      } catch (err) {
        console.error('Failed to parse price message', err)
      }
    }
  }

  const fetchLatestPrices = async () => {
    setLoadingPrices(true)
    try {
      const response = await fetch(buildHttpUrl('/prices'))
      if (!response.ok) {
        throw new Error('Failed to load prices')
      }
      const data = await response.json()
      const snapshot = {}
      const now = Date.now()
      setPriceHistory((prev) => {
        const updated = { ...prev }
        data.forEach((price) => {
          snapshot[price.symbol] = price
          if (!updated[price.symbol]) {
            updated[price.symbol] = []
          }
          updated[price.symbol] = [
            ...updated[price.symbol],
            {
              time: now,
              price: Number(price.price),
              change: Number(price.change),
              percent: Number(price.percent),
            },
          ].slice(-100)
        })
        return updated
      })
      setPrices(snapshot)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPrices(false)
    }
  }

  const fetchOrders = async () => {
    if (!token) return
    setLoadingOrders(true)
    try {
      const response = await fetch(buildHttpUrl('/orders'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Session expired. Please login again.')
        }
        throw new Error('Failed to load orders')
      }
      const data = await response.json()
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOrders(false)
    }
  }

  const priceRows = useMemo(() => {
    return Object.values(prices).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    )
  }, [prices])

  const orderRows = useMemo(() => {
    return [...orders].sort((a, b) => b.id - a.id)
  }, [orders])

  const summary = useMemo(() => computeSummary(priceRows), [priceRows])

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSymbolChange = (symbol) => {
    const latest = prices[symbol]?.price
    setForm((prev) => ({
      ...prev,
      symbol,
      price: latest ? Number(latest).toFixed(2) : '',
    }))
  }

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(buildHttpUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || 'Login failed')
      }

      const data = await response.json()
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', data.user)
      setShowLogin(false)
      await fetchOrders()
    } catch (err) {
      throw err
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    setOrders([])
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setShowLogin(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormMessage(null)

    const payload = {
      symbol: form.symbol,
      side: form.side,
      quantity: Number(form.quantity),
      price: Number(form.price),
    }

    if (!payload.symbol || payload.quantity <= 0 || payload.price <= 0) {
      setFormMessage({
        type: 'error',
        text: 'Please provide valid symbol, quantity, and price values.',
      })
      return
    }

    try {
      const response = await fetch(buildHttpUrl('/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Session expired. Please login again.')
        }
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || 'Order submission failed')
      }

      const created = await response.json()
      await fetchOrders()
      setForm((prev) => ({
        ...prev,
        quantity: 10,
        price: prices[prev.symbol]?.price
          ? Number(prices[prev.symbol].price).toFixed(2)
          : '',
      }))
      setFormMessage({
        type: 'success',
        text: `Order #${created.id} placed successfully.`,
      })
    } catch (err) {
      setFormMessage({
        type: 'error',
        text: err.message,
      })
    }
  }

  if (showLogin) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Trading Dashboard</h1>
          <p>Live mock market data with simulated order entry</p>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-info">
              <span className="user-name">👤 {user}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
          <div className="status-chip" data-status={wsStatus}>
            WebSocket: {wsStatus}
          </div>
        </div>
      </header>

      {priceRows.length > 0 && <TickerTape rows={priceRows} />}

      {priceRows.length > 0 && (
        <section className="panel highlights-panel">
          <div className="panel-header">
            <h2>Market Pulse</h2>
            <span className="muted">
              Tracking {summary.totalSymbols} symbols · Avg {formatSigned(summary.avgChange)}%
            </span>
          </div>
          <MarketHighlights summary={summary} />
        </section>
      )}

      {priceRows.length > 0 && (
        <section className="panel chart-panel">
          <div className="panel-header">
            <div className="chart-header">
              <div>
                <h2>Price Chart</h2>
                <div className="symbol-selector">
                  {SUPPORTED_SYMBOLS.map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      className={selectedSymbol === symbol ? 'active' : ''}
                      onClick={() => setSelectedSymbol(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              {prices[selectedSymbol] && (
                <div className="chart-price-info">
                  <div className="chart-price-main">
                    {formatCurrency(prices[selectedSymbol].price)}
                  </div>
                  <div className={priceClass(prices[selectedSymbol].change)}>
                    {formatSigned(prices[selectedSymbol].change)} (
                    {formatSigned(prices[selectedSymbol].percent)}%)
                  </div>
                </div>
              )}
            </div>
          </div>
          <PriceChart
            symbol={selectedSymbol}
            history={priceHistory[selectedSymbol] || []}
            currentPrice={prices[selectedSymbol]}
          />
        </section>
      )}

      <main className="app-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Live Prices</h2>
            {loadingPrices && <span className="muted">Refreshing…</span>}
          </div>
          <PricesTable rows={priceRows} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Place Order</h2>
          </div>
          <OrderForm
            form={form}
            formMessage={formMessage}
            onFieldChange={handleFormChange}
            onSymbolChange={handleSymbolChange}
            onSubmit={handleSubmit}
            prices={prices}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Orders</h2>
            {loadingOrders && <span className="muted">Refreshing…</span>}
          </div>
          <OrdersTable rows={orderRows} />
        </section>
      </main>
    </div>
  )
}

function TickerTape({ rows }) {
  if (!rows.length) return null
  const tickerItems = [...rows, ...rows]
  return (
    <div className="ticker">
      <div className="ticker-track">
        {tickerItems.map((row, index) => (
          <div key={`${row.symbol}-${index}`} className="ticker-item">
            <span>{row.symbol}</span>
            <span>{formatCurrency(row.price)}</span>
            <span className={priceClass(row.change)}>
              {formatSigned(row.percent)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketHighlights({ summary }) {
  return (
    <div className="highlights-grid">
      <HighlightCard
        label="Top Gainer"
        value={summary.best?.symbol ?? '—'}
        subValue={
          summary.best
            ? `${formatSigned(summary.best.change)} (${formatSigned(summary.best.percent)}%)`
            : 'Awaiting data'
        }
      />
      <HighlightCard
        label="Top Decliner"
        value={summary.worst?.symbol ?? '—'}
        subValue={
          summary.worst
            ? `${formatSigned(summary.worst.change)} (${formatSigned(summary.worst.percent)}%)`
            : 'Awaiting data'
        }
      />
      <HighlightCard
        label="Advancers / Decliners"
        value={`${formatNumber(summary.advancers)} / ${formatNumber(summary.decliners)}`}
        subValue={`${formatNumber(summary.neutral)} unchanged`}
      />
      <HighlightCard
        label="Total Symbols"
        value={formatNumber(summary.totalSymbols)}
        subValue={`Avg Move ${formatSigned(summary.avgChange)}%`}
      />
    </div>
  )
}

function HighlightCard({ label, value, subValue }) {
  return (
    <div className="highlight-card">
      <p>{label}</p>
      <h3>{value}</h3>
      <span>{subValue}</span>
    </div>
  )
}

function PricesTable({ rows }) {
  if (!rows.length) {
    return <div className="empty-state">Waiting for live prices…</div>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol}>
              <td>{row.symbol}</td>
              <td className={priceClass(row.change)}>{formatCurrency(row.price)}</td>
              <td className={priceClass(row.change)}>
                {formatSigned(row.change)} ({formatSigned(row.percent)}%)
              </td>
              <td>{formatRelativeTime(row.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTable({ rows }) {
  if (!rows.length) {
    return <div className="empty-state">No orders yet. Submit one above!</div>
  }

  return (
    <div className="orders-list">
      {rows.map((order) => (
        <article key={order.id} className="order-card">
          <div className="order-card__header">
            <div className="order-card__symbol">
              <span>{order.symbol}</span>
              <span className={`pill ${order.side}`}>{order.side}</span>
            </div>
            <div className="order-card__price">
              <p>PX</p>
              <strong>{formatCurrency(order.price)}</strong>
            </div>
          </div>

          <div className="order-card__metrics">
            <div>
              <label>Quantity</label>
              <span>{order.quantity}</span>
            </div>
            <div>
              <label>Order ID</label>
              <span>#{order.id}</span>
            </div>
            <div>
              <label>Placed</label>
              <span>{formatRelativeTime(order.createdAt)}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function PriceChart({ symbol, history, currentPrice }) {
  const chartData = useMemo(() => {
    if (!history.length) return []
    return history.map((point, index) => ({
      time: new Date(point.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      price: point.price,
      change: point.change,
      index,
    }))
  }, [history])

  const isPositive = currentPrice?.change >= 0
  const gradientId = `gradient-${symbol}`

  if (!history.length) {
    return (
      <div className="chart-empty">
        <p>Collecting price data...</p>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#58ffb0' : '#ff8282'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#58ffb0' : '#ff8282'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: '0.75rem' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="rgba(255,255,255,0.4)"
            style={{ fontSize: '0.75rem' }}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(8, 12, 30, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f8fbff',
            }}
            labelStyle={{ color: '#9fc5ff' }}
            formatter={(value) => [formatCurrency(value), 'Price']}
          />
          <ReferenceLine
            y={currentPrice?.price}
            stroke={isPositive ? '#58ffb0' : '#ff8282'}
            strokeDasharray="2 2"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#58ffb0' : '#ff8282'}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: isPositive ? '#58ffb0' : '#ff8282' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function OrderForm({
  form,
  formMessage,
  onFieldChange,
  onSymbolChange,
  onSubmit,
  prices,
}) {
  return (
    <form className="order-form" onSubmit={onSubmit}>
      <label>
        Symbol
        <select
          value={form.symbol}
          onChange={(event) => onSymbolChange(event.target.value)}
        >
          {SUPPORTED_SYMBOLS.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
      </label>

      <label>
        Side
        <div className="side-selector">
          {['BUY', 'SELL'].map((side) => (
            <button
              key={side}
              type="button"
              className={form.side === side ? 'active' : ''}
              onClick={() => onFieldChange('side', side)}
            >
              {side}
            </button>
          ))}
        </div>
      </label>

      <label>
        Quantity
        <input
          type="number"
          min="1"
          step="1"
          value={form.quantity}
          onChange={(event) => onFieldChange('quantity', event.target.value)}
        />
      </label>

      <label>
        Price
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          placeholder={
            prices[form.symbol]?.price
              ? Number(prices[form.symbol].price).toFixed(2)
              : 'Market price'
          }
          onChange={(event) => onFieldChange('price', event.target.value)}
        />
        <small className="muted">
          Last trade: {formatCurrency(prices[form.symbol]?.price)}
        </small>
      </label>

      <button type="submit" className="primary">
        Submit Order
      </button>

      {formMessage && (
        <div className={`form-message ${formMessage.type}`}>
          {formMessage.text}
        </div>
      )}
    </form>
  )
}

function priceClass(change) {
  if (change > 0) return 'price-up'
  if (change < 0) return 'price-down'
  return ''
}

function formatSigned(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return '0.00'
  const fixed = Number(value).toFixed(2)
  return Number(value) >= 0 ? `+${fixed}` : fixed
}

function formatCurrency(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '$—'
  }
  return `$${Number(value).toFixed(2)}`
}

function formatRelativeTime(dateInput) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  const now = Date.now()
  const diffSeconds = Math.round((now - date.getTime()) / 1000)

  if (diffSeconds < 5) return 'just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleString()
}

function formatNumber(value) {
  if (value === undefined || value === null) return '0'
  return new Intl.NumberFormat().format(Number(value))
}

function computeSummary(rows) {
  if (!rows.length) {
    return {
      best: null,
      worst: null,
      advancers: 0,
      decliners: 0,
      neutral: 0,
      avgChange: 0,
      totalSymbols: 0,
    }
  }

  let best = rows[0]
  let worst = rows[0]
  let advancers = 0
  let decliners = 0
  let neutral = 0
  let percentSum = 0

  rows.forEach((row) => {
    if (row.percent > best.percent) best = row
    if (row.percent < worst.percent) worst = row
    if (row.change > 0) advancers += 1
    else if (row.change < 0) decliners += 1
    else neutral += 1
    percentSum += row.percent
  })

  return {
    best,
    worst,
    advancers,
    decliners,
    neutral,
    avgChange: rows.length ? percentSum / rows.length : 0,
    totalSymbols: rows.length,
  }
}

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-panel">
        <div className="login-header">
          <h1>Trading Dashboard</h1>
          <p>Sign in to access trading features</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="login-hint">
            <p>Demo credentials:</p>
            <ul>
              <li>Username: <strong>admin</strong> / Password: <strong>admin123</strong></li>
              <li>Username: <strong>trader</strong> / Password: <strong>trader123</strong></li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
