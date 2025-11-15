# Deployment Guide

## Backend Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `trading-dashboard` repository
4. Railway will auto-detect it's a Go project
5. Set **Root Directory** to `backend`
6. Add Environment Variable:
   - `JWT_SECRET` = (generate a random string)
7. Click "Deploy"
8. Once deployed, copy the backend URL (e.g., `https://your-app.railway.app`)

### Option 2: Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Settings:
   - **Name**: `trading-dashboard-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Go`
   - **Build Command**: `go build -o trading-backend .`
   - **Start Command**: `./trading-backend`
5. Add Environment Variables:
   - `PORT` = `10000`
   - `JWT_SECRET` = (generate a random string)
6. Click "Create Web Service"
7. Once deployed, copy the backend URL

### Option 3: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In `backend/` directory, run: `fly launch`
4. Follow prompts and deploy
5. Get URL: `fly info`

### Option 4: Docker (Any Platform)

1. Build image:
   ```bash
   cd backend
   docker build -t trading-backend .
   ```
2. Run container:
   ```bash
   docker run -p 8080:8080 -e JWT_SECRET=your-secret trading-backend
   ```

## Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project" → Import from GitHub
3. Select your repository
4. Settings:
   - **Framework Preset**: `Vite` (or `Other`)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://your-backend-url.com` (from Railway/Render)
6. Click "Deploy"
7. Once deployed, your frontend will be live!

## Important Notes

### After Backend Deployment:
1. Copy the backend URL (e.g., `https://trading-backend.railway.app`)
2. Update frontend environment variable `VITE_API_BASE_URL` with this URL
3. Redeploy frontend on Vercel

### CORS Configuration:
The backend already has CORS enabled for all origins. For production, you may want to restrict it to your frontend domain in `backend/main.go`:

```go
AllowOrigins: []string{"https://your-frontend.vercel.app"},
```

### Environment Variables:

**Backend:**
- `PORT` - Server port (auto-set by platform)
- `JWT_SECRET` - Secret key for JWT tokens (required)

**Frontend:**
- `VITE_API_BASE_URL` - Backend API URL (required)

## Testing Deployment

1. **Backend**: Visit `https://your-backend-url.com/prices` - should return JSON
2. **Frontend**: Visit your Vercel URL - should show login page
3. **Login**: Use demo credentials (admin/admin123)
4. **WebSocket**: Check browser console for WebSocket connection status

## Troubleshooting

### Backend Issues:
- **Port error**: Make sure `PORT` env variable is set
- **Build fails**: Check Go version (needs 1.21+)
- **WebSocket not working**: Ensure platform supports WebSocket (Railway, Render do)

### Frontend Issues:
- **API errors**: Check `VITE_API_BASE_URL` is correct
- **CORS errors**: Update backend CORS settings
- **Build fails**: Check Node version (needs 18+)

## Quick Deploy Commands

### Railway (CLI):
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Render (CLI):
```bash
npm i -g render-cli
render login
render deploy
```
