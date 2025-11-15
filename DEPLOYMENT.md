# Deployment Guide

## Backend Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Sign up** at [railway.app](https://railway.app)
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select** your `trading-dashboard` repository
4. **Configure:**
   - Root Directory: `backend`
   - Build Command: `go build -o trading-backend .`
   - Start Command: `./trading-backend`
5. **Add Environment Variable:**
   - `JWT_SECRET` = (generate a random secure string)
6. **Deploy** - Railway will automatically deploy
7. **Get URL** - Railway will give you a URL like `https://your-app.railway.app`
8. **Update Frontend:**
   - In Vercel, add environment variable:
   - `VITE_API_BASE_URL` = `https://your-app.railway.app`

### Option 2: Render (Free Tier Available)

1. **Sign up** at [render.com](https://render.com)
2. **New** → **Web Service**
3. **Connect** your GitHub repository
4. **Configure:**
   - Name: `trading-dashboard-backend`
   - Root Directory: `backend`
   - Environment: `Go`
   - Build Command: `go build -o trading-backend .`
   - Start Command: `./trading-backend`
5. **Add Environment Variable:**
   - `JWT_SECRET` = (generate a random secure string)
6. **Deploy**
7. **Get URL** - Render will give you a URL like `https://trading-dashboard-backend.onrender.com`
8. **Update Frontend:**
   - In Vercel, add environment variable:
   - `VITE_API_BASE_URL` = `https://trading-dashboard-backend.onrender.com`

### Option 3: Fly.io

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`
3. **Initialize**: `cd backend && fly launch`
4. **Deploy**: `fly deploy`
5. **Get URL**: Fly will give you a URL
6. **Update Frontend** with the URL

### Option 4: AWS (Advanced)

#### Using AWS EC2:
1. Launch EC2 instance (Ubuntu)
2. SSH into instance
3. Install Go
4. Clone repository
5. Build and run: `go run .`
6. Configure security group to allow port 8080
7. Use public IP as backend URL

#### Using AWS ECS/Fargate:
1. Build Docker image: `docker build -t trading-backend ./backend`
2. Push to ECR
3. Create ECS task definition
4. Deploy to Fargate
5. Use ALB URL as backend URL

## Frontend Deployment (Vercel)

1. **Import** your GitHub repository on Vercel
2. **Configure:**
   - Framework Preset: **Vite** (or Other)
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Add Environment Variable:**
   - `VITE_API_BASE_URL` = `https://your-backend-url.com`
4. **Deploy**

## Important Notes

### CORS Configuration
After deploying backend, update CORS in `backend/main.go`:
```go
AllowOrigins: []string{
    "https://your-frontend.vercel.app",
    "http://localhost:5173", // for local dev
}
```

### Environment Variables

**Backend:**
- `JWT_SECRET` - Secret key for JWT tokens (required in production)
- `PORT` - Server port (default: 8080)

**Frontend:**
- `VITE_API_BASE_URL` - Backend API URL

### WebSocket Support
- Railway: ✅ Supports WebSockets
- Render: ✅ Supports WebSockets (with some limitations on free tier)
- Fly.io: ✅ Full WebSocket support
- AWS: ✅ Supports WebSockets

## Quick Deploy Commands

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway init
railway up
```

### Render
Just connect GitHub repo and configure in dashboard.

### Fly.io
```bash
cd backend
fly launch
fly deploy
```

## Testing Deployment

1. **Backend Health Check:**
   ```bash
   curl https://your-backend-url.com/prices
   ```

2. **Frontend:**
   - Visit your Vercel URL
   - Check browser console for API calls
   - Test login functionality
   - Verify WebSocket connection

## Troubleshooting

### Backend not accessible:
- Check firewall/security groups
- Verify port is exposed (8080)
- Check CORS settings

### WebSocket not connecting:
- Verify WebSocket support on platform
- Check if URL uses `wss://` (secure) or `ws://`
- Check browser console for errors

### Frontend can't reach backend:
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration
- Verify backend is running and accessible

