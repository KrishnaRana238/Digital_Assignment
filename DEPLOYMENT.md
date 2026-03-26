# 🚀 DEPLOYMENT GUIDE: Your Full-Stack Application

## Current Setup
- **Frontend**: Next.js (in `front/` folder)
- **Backend**: Express.js (in `backend/` folder)
- **Database**: Supabase (PostgreSQL)
- **Deployment Target**: Vercel

---

## ⚠️ IMPORTANT: Known Issue

Your current setup has Supabase connectivity issues due to network/firewall. **We need to fix this first before deployment.**

### Solution: Use Supabase with Proper Configuration

Your Supabase project is in South Korea, which may cause regional network issues. Here's how to proceed:

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before proceeding, ensure you have:

- [ ] **Vercel Account** - Sign up at https://vercel.com (link your GitHub)
- [ ] **Supabase Project** - You have: `oygnhhdmxsncppszzowi` ✅
- [ ] **Git Repository** - Already set up ✅
- [ ] **Environment Variables** - Ready to add to Vercel

---

## 📍 STEP 1: Prepare Backend for Vercel Serverless

### 1.1 Install serverless-http wrapper

```bash
cd backend
npm install serverless-http
```

### 1.2 Create API route wrapper

Create `backend/api/index.ts`:

```typescript
import serverless from "serverless-http";
// Import your express app
import app from "../src/index.js";

export default serverless(app);
```

### 1.3 Update package.json

In `backend/package.json`, update the build script:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## 📍 STEP 2: Prepare Frontend for Vercel

### 2.1 Update API endpoints

In `front/lib/api.ts`, update the base URL to detect environment:

```typescript
const API_URL = 
  process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.vercel.app/api'
    : 'http://localhost:4000';
```

### 2.2 Add to `front/.env.local`:

```
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
```

---

## 📍 STEP 3: Supabase Connection Setup

### 3.1 Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project `oygnhhdmxsncppszzowi`
3. Go to **Settings → API**
4. Copy:
   - **Project URL** (SUPABASE_URL)
   - **Service Role secret** (SUPABASE_SERVICE_ROLE_KEY)

### 3.2 Push Schema to Supabase

```bash
supabase link --project-ref oygnhhdmxsncppszzowi
supabase db push
```

If this fails due to network, manually run SQL from `backend/supabase/schema.sql` in Supabase SQL editor:

1. Go to Supabase Dashboard
2. Click **SQL Editor** → **New Query**
3. Copy entire contents of `backend/supabase/schema.sql`
4. Paste and click **Run**

---

## 📍 STEP 4: Deploy Frontend to Vercel

### 4.1 Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 4.2 Deploy on Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New → Project**
3. Select your GitHub repository
4. Click **Import**
5. In **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.vercel.app`
6. Click **Deploy**

**Your frontend will be at**: `https://your-site.vercel.app`

---

## 📍 STEP 5: Deploy Backend to Vercel

### 5.1 Configure Vercel for Monorepo

At project root, update `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "front/next.config.ts",
      "use": "@vercel/next"
    },
    {
      "src": "backend/src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/src/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/front/$1"
    }
  ]
}
```

### 5.2 Add Backend Environment Variables to Vercel

In Vercel Dashboard:

1. Go to your project → **Settings → Environment Variables**
2. Add:
   - `SUPABASE_URL`: `https://oygnhhdmxsncppszzowi.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: (from Supabase dashboard)
   - `FRONTEND_URL`: `https://your-site.vercel.app`
   - `PORT`: `4000`
   - `SESSION_SECRET`: (generate secure random string)

### 5.3 Deploy

```bash
git push origin main
# Vercel will auto-deploy
```

---

## 🔧 Alternative: Simpler Backend Deployment

**Vercel serverless is complex.** Consider these simpler options:

| Platform | Free Tier | Ease | Recommendation |
|----------|-----------|------|-----|
| **Railway** | $5/month | ⭐⭐⭐⭐⭐ Easy | ✅ Recommended |
| **Render** | Yes, Free | ⭐⭐⭐⭐ Easy | ✅ Good |
| **Heroku** | ❌ No | ⭐⭐⭐ Medium | Paid only |
| **Vercel** | ✅ | ⭐⭐ Complex | For experienced users |

### 💡 Recommendation: Use Railway for Backend

Would you like me to provide **Railway deployment steps** instead? It's **much simpler** and works perfectly with Express.

---

## ✅ Verification After Deployment

Test your deployed app:

```bash
# Test frontend
curl https://your-site.vercel.app

# Test backend
curl https://your-site.vercel.app/api/health

# Test Supabase connection
curl https://your-site.vercel.app/api/charities
```

---

## 🆘 Troubleshooting

### "Port already in use"
```bash
kill -9 $(lsof -ti:4000)
```

### "Supabase connection fails"
- Check network: `ping api.supabase.com`
- Check credentials in Vercel Environment Variables
- Verify firewall allows HTTPS outbound connections

### "Frontend can't reach backend"
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS headers in `backend/src/index.ts`

---

## 📞 Need Help?

Reply with:
1. Which platform you prefer for backend (Railway/Render/Vercel)
2. Any errors you encounter during deployment

I'll provide **step-by-step commands** to resolve them!
