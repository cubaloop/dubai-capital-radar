# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime with Python 3.11 & Node.js for WhatsApp Gateway
FROM python:3.11-slim
WORKDIR /app

# Install Node.js, git & build essentials
RUN apt-get update && apt-get install -y git curl gnupg ca-certificates build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Install WhatsApp Gateway dependencies
COPY whatsapp-gateway/package*.json ./whatsapp-gateway/
WORKDIR /app/whatsapp-gateway
RUN npm install --omit=dev

WORKDIR /app
COPY whatsapp-gateway/ ./whatsapp-gateway/
COPY backend/ ./backend/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=8000
ENV WHATSAPP_PORT=3001
ENV PYTHONUNBUFFERED=1
EXPOSE 8000

WORKDIR /app
CMD ["sh", "-c", "node whatsapp-gateway/index.js & cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
