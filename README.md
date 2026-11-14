# 🍱 Tiffin Center Digital System
**Telugu-First | WhatsApp-Based | Warangal**

## Quick Start

### 1. Setup Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your Supabase and WhatsApp credentials
uvicorn main:app --reload
```

### 2. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### 3. Open Dashboard
Visit: http://localhost:3000

## Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step free deployment on Render + Vercel + Supabase.

## WhatsApp Setup

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for Meta WhatsApp Business API setup.
