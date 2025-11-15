# Backend Deployment Guide - Step by Step

## 🚀 Option 1: Railway (Easiest - Recommended)

### Step 1: Sign Up
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (easiest way)

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `trading-dashboard` repository
4. Click "Deploy Now"

### Step 3: Configure Backend
1. Railway will auto-detect it's a Go project
2. Click on the service that was created
3. Go to **Settings** tab
4. Set **Root Directory** to: `backend`
5. Go to **Variables** tab
6. Add Environment Variable:
   - Key: `JWT_SECRET`
   - Value: Generate a random string (e.g., `openssl rand -hex 32` or use any random string)
   - Example: `my-super-secret-jwt-key-12345`

### Step 4: Deploy
1. Railway will automatically:
   - Detect Go project
   - Run `go build`
   - Start the server
2. Wait for deployment to complete (2-3 minutes)

### Step 5: Get Backend URL
1. Go to **Settings** → **Networking**
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://trading-dashboard-production.up.railway.app`)
4. This is your backend URL!

### Step 6: Test Backend
Open in browser: `https://your-backend-url.railway.app/prices`
Should return JSON with stock prices.

---

## 🎯 Option 2: Render (Free Tier Available)

### Step 1: Sign Up
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select `trading-dashboard`

### Step 3: Configure
- **Name**: `trading-dashboard-backend`
- **Root Directory**: `backend`
- **Environment**: `Go`
- **Build Command**: `go build -o trading-backend .`
- **Start Command**: `./trading-backend`

### Step 4: Environment Variables
Add:
- `PORT` = `10000` (Render uses this)
- `JWT_SECRET` = (your random secret string)

### Step 5: Deploy
Click "Create Web Service"
Wait for deployment (3-5 minutes)

### Step 6: Get URL
Copy the URL from Render dashboard (e.g., `https://trading-dashboard-backend.onrender.com`)

---

## 🐳 Option 3: Fly.io

### Step 1: Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login
```bash
fly auth login
```

### Step 3: Deploy
```bash
cd backend
fly launch
```
Follow the prompts:
- App name: `trading-dashboard-backend`
- Region: Choose closest to you
- PostgreSQL: No
- Redis: No

### Step 4: Set Environment Variable
```bash
fly secrets set JWT_SECRET=your-secret-key-here
```

### Step 5: Deploy
```bash
fly deploy
```

### Step 6: Get URL
```bash
fly info
```

---

## 📝 Quick Checklist

After deploying backend:

✅ **Backend URL copied?** (e.g., `https://xxx.railway.app`)
✅ **Test endpoint works?** Visit `/prices` in browser
✅ **JWT_SECRET set?** (important for login to work)
✅ **Frontend updated?** Set `VITE_API_BASE_URL` in Vercel

---

## 🔧 Troubleshooting

### Backend not starting?
- Check logs in Railway/Render dashboard
- Verify `JWT_SECRET` is set
- Check if `PORT` environment variable is being used

### CORS errors?
- Backend already has CORS enabled for all origins
- For production, you can restrict it in `backend/main.go`

### WebSocket not working?
- Railway and Render support WebSockets
- Check browser console for connection errors
- Verify backend URL is correct

### Build fails?
- Check Go version (needs 1.21+)
- Verify `go.mod` and `go.sum` are committed
- Check build logs in deployment platform

---

## 🎯 Next Steps After Backend Deployment

1. **Copy Backend URL** (e.g., `https://xxx.railway.app`)
2. **Update Frontend** in Vercel:
   - Go to Vercel project settings
   - Add Environment Variable: `VITE_API_BASE_URL`
   - Value: Your backend URL (without trailing slash)
   - Redeploy frontend
3. **Test Full Stack**:
   - Visit frontend URL
   - Login with `admin/admin123`
   - Check if prices load
   - Check if WebSocket connects

---

## 💡 Pro Tips

- **Railway** gives you $5 free credit monthly (enough for this project)
- **Render** has free tier but spins down after inactivity
- **Fly.io** has generous free tier
- Always test `/prices` endpoint first to verify backend is working
- Keep backend URL handy for frontend configuration

