## Railway Deployment Configuration
## Equivalent to Render but never sleeps and has persistent storage

## HOW TO DEPLOY TO RAILWAY:
## 1. Go to https://railway.app and create a free account
## 2. Click "New Project" → "Deploy from GitHub Repo"
## 3. Select: cubaloop/dubai-capital-radar
## 4. Railway auto-detects the Dockerfile and builds it
## 5. Add the environment variables listed below
## 6. Set the domain in Railway settings
## 7. Done! Never sleeps, persistent storage.

## ENVIRONMENT VARIABLES TO SET IN RAILWAY:
## (Settings → Variables → Add Variable)

## --- REQUIRED ---
## GEMINI_API_KEY=your_gemini_api_key
## SUPABASE_URL=https://xxxx.supabase.co
## SUPABASE_SERVICE_KEY=your_supabase_service_role_key

## --- WHATSAPP SESSION (for Supabase storage) ---
## SUPABASE_URL=same as above
## SUPABASE_SERVICE_KEY=same as above

## --- SELF KEEP-ALIVE ---
## SELF_URL=https://your-railway-domain.railway.app

## --- OPTIONAL RADAR (for Reddit scanning) ---
## REDDIT_CLIENT_ID=your_reddit_app_client_id
## REDDIT_SECRET=your_reddit_app_secret

## --- OPTIONAL NOTIFICATIONS ---
## TELEGRAM_BOT_TOKEN=your_telegram_bot_token
## TELEGRAM_CHAT_ID=your_personal_chat_id

## ─── WHAT YOU GET ON RAILWAY ──────────────────────
## ✅ Container never sleeps
## ✅ WhatsApp session persists via Supabase
## ✅ Free $5 credit/month (usually enough for light use)
## ✅ Auto-deploy on every GitHub push
## ✅ Custom domain support
## ✅ Full logs and monitoring
## ──────────────────────────────────────────────────
