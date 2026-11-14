# 🚀 Deployment Guide — Step by Step

## Step 1: Supabase (Database) — Free Forever

1. Go to [supabase.com](https://supabase.com) → Sign Up (free)
2. Click **"New Project"**
   - Name: `tiffin-center`
   - Database Password: (save this securely)
   - Region: **Southeast Asia (Singapore)** — closest to Warangal
3. Wait 2 minutes for project to start
4. Go to **SQL Editor** → Paste the SQL from `backend/database.py` → Run
5. Go to **Settings → API**:
   - Copy **Project URL** → this is your `SUPABASE_URL`
   - Copy **anon public key** → this is your `SUPABASE_KEY`

---

## Step 2: GitHub — Upload Code

1. Go to [github.com](https://github.com) → Sign Up (free)
2. Click **"New Repository"** → Name: `tiffin-center` → Public → Create
3. Upload your code:
   ```bash
   cd C:\Users\ranji\.gemini\antigravity\scratch\tiffin-center
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tiffin-center.git
   git push -u origin main
   ```

---

## Step 3: Render.com (Backend API) — Free

1. Go to [render.com](https://render.com) → Sign Up with GitHub
2. Click **"New" → "Web Service"**
3. Connect your `tiffin-center` GitHub repo
4. Settings:
   - **Name**: `tiffin-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   ```
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_KEY = your-anon-key
   WHATSAPP_TOKEN = your-token
   WHATSAPP_PHONE_NUMBER_ID = your-phone-id
   VERIFY_TOKEN = any_secret_string_you_choose
   ```
6. Click **"Create Web Service"**
7. Wait 5 minutes → You'll get a URL like: `https://tiffin-backend.onrender.com`
   - **Save this URL** — this is your backend API URL

---

## Step 4: Vercel (Frontend Dashboard) — Free Forever

1. Go to [vercel.com](https://vercel.com) → Sign Up with GitHub
2. Click **"New Project"** → Import `tiffin-center` repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js
4. Under **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://tiffin-backend.onrender.com
   ```
5. Click **"Deploy"**
6. Wait 2 minutes → You'll get: `https://tiffin-center.vercel.app`
   - This is your **owner dashboard URL**

---

## Step 5: WhatsApp Business API Setup

> This takes 1–2 days for Meta approval.

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a **Business App**
3. Add **WhatsApp** product
4. Go to **WhatsApp → Getting Started**:
   - You get a **test phone number** to start (free)
   - Note your **Phone Number ID** and **Access Token**
5. Set Webhook:
   - URL: `https://tiffin-backend.onrender.com/webhook/whatsapp`
   - Verify Token: (same string you set in VERIFY_TOKEN env var)
   - Subscribe to: `messages`

---

## Step 6: Generate QR Codes for Tables

1. Open your dashboard: `https://tiffin-center.vercel.app`
2. Go to **Sidebar → QR Codes**
3. Enter table number (1, 2, 3...) → Click Download
4. Print and laminate — place on each table
5. Done! Customers scan → WhatsApp opens → Telugu bot starts

---

## ✅ Post-Deployment Checklist

- [ ] Supabase database tables created
- [ ] Backend live on Render
- [ ] Dashboard live on Vercel  
- [ ] WhatsApp webhook connected
- [ ] Default menu seeded (click "Seed Menu" in dashboard)
- [ ] QR codes printed for all tables
- [ ] Test by scanning your own QR and chatting in Telugu

---

## 🛟 Troubleshooting

| Problem | Solution |
|---|---|
| Backend not responding | Check Render logs; free tier sleeps after 15min inactivity |
| WhatsApp bot not replying | Verify webhook URL and VERIFY_TOKEN match |
| Database error | Check Supabase SQL was run correctly |
| Dashboard blank | Check NEXT_PUBLIC_API_URL in Vercel env vars |
