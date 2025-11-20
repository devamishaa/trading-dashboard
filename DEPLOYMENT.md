# Deployment Guide

This project is deployed with:
- **Frontend**: Vercel
- **Backend**: Render

## 🚀 Current Deployment

- **Frontend URL**: Your Vercel deployment
- **Backend URL**: `https://trading-dashboard-3-i7gv.onrender.com`

---

## 📦 Backend Deployment (Render)

### Initial Setup

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `trading-dashboard`
4. Configure:
   - **Name**: `trading-dashboard-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Docker` (uses Dockerfile)
   - **Instance Type**: Free or Starter
5. Add Environment Variable:
   - **Key**: `JWT_SECRET`
   - **Value**: Generate a secure random string (e.g., `openssl rand -hex 32`)
6. Click **"Create Web Service"**
7. Wait 3-5 minutes for deployment
8. Copy your backend URL

### Updating Backend

Simply push changes to your GitHub repository:
```bash
git add .
git commit -m "Update backend"
git push
```

Render will automatically detect changes and redeploy.

---

## 🎨 Frontend Deployment (Vercel)

### Initial Setup

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"** → Import from GitHub
3. Select your repository: `trading-dashboard`
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://trading-dashboard-3-i7gv.onrender.com` (your backend URL)
6. Click **"Deploy"**
7. Wait 2-3 minutes for deployment

### Updating Frontend

Push changes to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push
```

Vercel will automatically detect changes and redeploy.

---

## 🔐 Environment Variables

### Backend (Render)
- `JWT_SECRET` - Secret key for JWT tokens (required, set in Render dashboard)
- `PORT` - Auto-set by Render (10000)

### Frontend (Vercel)
- `VITE_API_BASE_URL` - Backend API URL (set in Vercel dashboard)

---

## ✅ Testing Deployment

### 1. Test Backend
Visit: `https://trading-dashboard-3-i7gv.onrender.com/prices`

Should return JSON with stock prices:
```json
[
  {"symbol":"AAPL","price":185.32,...},
  ...
]
```

### 2. Test Frontend
1. Visit your Vercel URL
2. Login with: `admin` / `admin123`
3. Verify:
   - ✅ Prices load
   - ✅ WebSocket connects
   - ✅ Orders can be created
   - ✅ Logout works

### 3. Check Browser DevTools
- **Network tab**: Verify API calls to backend
- **Console**: Check for errors
- **Application → Cookies**: Verify `auth_token` cookie exists

---

## 🐛 Troubleshooting

### Backend Issues

**Build fails with Go version error:**
- Check `Dockerfile` uses correct Go version (1.24)
- Verify `go.mod` version matches Dockerfile

**401 Unauthorized on protected endpoints:**
- Check `JWT_SECRET` is set in Render
- Verify cookies have `SameSite=None; Secure` attributes
- Clear browser cookies and login again

**CORS errors:**
- Backend uses `AllowOriginFunc` to support all origins
- Ensure `credentials: 'include'` is set in frontend fetch requests

### Frontend Issues

**API connection fails:**
- Verify `VITE_API_BASE_URL` in Vercel settings
- Check backend URL is correct (no trailing slash)
- Ensure backend is deployed and running

**Login works but immediately logs out:**
- Check browser console for 401 errors
- Verify cookies are being set (DevTools → Application → Cookies)
- Ensure `credentials: 'include'` is in all fetch requests

**WebSocket not connecting:**
- Check browser console for WebSocket errors
- Verify backend URL is correct
- Ensure Render service is running

---

## 🔄 Deployment Workflow

1. **Make changes** to code
2. **Test locally** (optional but recommended)
3. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. **Wait for auto-deployment**:
   - Render: 2-3 minutes
   - Vercel: 1-2 minutes
5. **Test deployed version**

---

## 📝 Quick Commands

### Generate JWT Secret
```bash
openssl rand -hex 32
```

### View Render Logs
Go to Render dashboard → Your service → Logs

### View Vercel Logs
Go to Vercel dashboard → Your project → Deployments → Click deployment → View logs

---

## 🔒 Security Notes

- **JWT_SECRET**: Keep this secret! Never commit to Git
- **Cookies**: Use `HttpOnly; Secure; SameSite=None` for cross-origin
- **CORS**: Currently allows all origins (fine for development)
- **HTTPS**: Both Vercel and Render provide free SSL certificates

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
