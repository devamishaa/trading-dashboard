# Netlify Deployment Guide - Frontend & Backend

## ⚠️ Important Note

**Backend को Netlify पर deploy नहीं कर सकते** क्योंकि:
- Netlify Functions serverless हैं और WebSocket support नहीं है
- आपका backend WebSocket connections use करता है (real-time price updates के लिए)
- Netlify Functions में timeout limits हैं (10-26 seconds)

**Solution:** Backend को Railway/Render/Fly.io पर deploy करें, और Frontend को Netlify पर।

---

## 🚀 Step 1: Backend Deploy (Railway/Render - Choose One)

### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app) और sign up
2. "New Project" → "Deploy from GitHub repo"
3. अपना repository select करें
4. Settings में:
   - **Root Directory**: `backend`
5. **Variables** tab में add करें:
   - `JWT_SECRET` = (random string generate करें: `openssl rand -hex 32`)
6. Deploy होने के बाद backend URL copy करें (e.g., `https://your-app.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com) और sign up
2. "New +" → "Web Service"
3. GitHub repo connect करें
4. Settings:
   - **Name**: `trading-dashboard-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Go`
   - **Build Command**: `go build -o trading-backend .`
   - **Start Command**: `./trading-backend`
5. **Environment Variables** add करें:
   - `PORT` = `10000`
   - `JWT_SECRET` = (random string)
6. Deploy होने के बाद URL copy करें

---

## 🌐 Step 2: Frontend Deploy on Netlify

### Method 1: Netlify Dashboard (Easiest)

1. **Sign Up/Login**
   - Go to [netlify.com](https://netlify.com)
   - GitHub से sign up करें

2. **New Site from Git**
   - Dashboard में "Add new site" → "Import an existing project"
   - GitHub select करें और repository choose करें

3. **Build Settings**
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

4. **Environment Variables**
   - "Site settings" → "Environment variables" → "Add variable"
   - Key: `VITE_API_BASE_URL`
   - Value: आपका backend URL (e.g., `https://your-app.railway.app`)
   - ⚠️ **Important**: Trailing slash नहीं होनी चाहिए

5. **Deploy**
   - "Deploy site" click करें
   - Build complete होने के बाद site live हो जाएगी

### Method 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Navigate to frontend directory
cd frontend

# Initialize and deploy
netlify init
# Follow prompts:
# - Create & configure a new site
# - Team: Choose your team
# - Site name: trading-dashboard-frontend (or your choice)
# - Build command: npm run build
# - Directory to deploy: dist

# Set environment variable
netlify env:set VITE_API_BASE_URL https://your-backend-url.railway.app

# Deploy
netlify deploy --prod
```

---

## ✅ Step 3: Verify Deployment

### Backend Test:
1. Browser में open करें: `https://your-backend-url.railway.app/prices`
2. JSON response आना चाहिए

### Frontend Test:
1. Netlify dashboard से site URL copy करें
2. Browser में open करें
3. Login करें: `admin/admin123`
4. Prices load होने चाहिए
5. WebSocket connection check करें (browser console में)

---

## 🔧 Troubleshooting

### Frontend API errors?
- Check `VITE_API_BASE_URL` environment variable
- Make sure backend URL correct है (no trailing slash)
- Backend CORS settings check करें

### WebSocket not connecting?
- Backend URL `https://` होना चाहिए (not `http://`)
- Browser console में errors check करें
- Backend logs check करें

### Build fails on Netlify?
- Check Node version (needs 18+)
- Check build logs in Netlify dashboard
- Make sure `package.json` में build script है

---

## 📝 Quick Checklist

- [ ] Backend deployed on Railway/Render
- [ ] Backend URL copied
- [ ] `JWT_SECRET` environment variable set
- [ ] Backend `/prices` endpoint working
- [ ] Frontend deployed on Netlify
- [ ] `VITE_API_BASE_URL` environment variable set in Netlify
- [ ] Frontend site accessible
- [ ] Login working
- [ ] Prices loading
- [ ] WebSocket connected

---

## 💡 Pro Tips

1. **Custom Domain**: Netlify में custom domain add कर सकते हैं
2. **Auto Deploy**: GitHub push करने पर automatically deploy होगा
3. **Preview Deploys**: Pull requests के लिए preview URLs मिलेंगे
4. **Environment Variables**: Production और branch-specific variables set कर सकते हैं

---

## 🔄 Update Backend URL

अगर backend URL change हो, तो:
1. Netlify dashboard → Site settings → Environment variables
2. `VITE_API_BASE_URL` update करें
3. "Trigger deploy" → "Clear cache and deploy site"

