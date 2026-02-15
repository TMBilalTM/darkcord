#!/bin/bash
# DarkCord — VPS Deploy Script
# Kullanım: bash deploy/deploy.sh

set -e

echo "🚀 DarkCord Deploy Başlıyor..."

# 1. Bağımlılıkları yükle
echo "📦 Bağımlılıklar yükleniyor..."
npm ci --production=false

# 2. Frontend build
echo "🔨 Frontend build ediliyor..."
npm run build

# 3. Logs klasörünü oluştur
mkdir -p logs data

# 4. PM2 ile başlat/restart
if command -v pm2 &> /dev/null; then
  echo "📡 PM2 ile sunucu başlatılıyor..."
  pm2 startOrRestart ecosystem.config.cjs --env production
  pm2 save
  echo "✅ PM2 ile başlatıldı!"
else
  echo "⚠️  PM2 bulunamadı. Yükleniyor..."
  npm install -g pm2
  pm2 startOrRestart ecosystem.config.cjs --env production
  pm2 save
  pm2 startup
  echo "✅ PM2 kuruldu ve başlatıldı!"
fi

echo ""
echo "✅ DarkCord başarıyla deploy edildi!"
echo "   Frontend: dist/ klasöründe (nginx ile serve et)"
echo "   Backend:  PM2 ile çalışıyor (port 3001)"
echo ""
echo "🔧 Nginx config için: deploy/nginx.conf"
echo "   sudo cp deploy/nginx.conf /etc/nginx/sites-available/darkcord"
echo "   sudo ln -s /etc/nginx/sites-available/darkcord /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
