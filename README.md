# SSH Terminal App (Go + React)

Tarayıcı üzerinden **gerçek SSH bağlantıları** kurarak canlı terminal deneyimi sunan full-stack web uygulaması.

## Mimari Özet

**Frontend (React + Vite + TypeScript)**
- Kullanıcı kayıt, giriş ve Google OAuth akışlarını yönetir.
- SSH bağlantılarını ekleme/listeleme/güncelleme işlemlerini yapar.
- WebSocket üzerinden canlı terminal oturumu başlatır.

**Backend (Go + Gin)**
- REST API (auth ve SSH connection yönetimi)
- WebSocket ile gerçek SSH terminal I/O akışı
- SQLite veritabanı ile kalıcı veri saklama
- SSH şifreleri ve private key’ler AES-GCM ile şifrelenerek saklanır.

**Veri Akışı**
- Kullanıcı giriş yapar → JWT oluşturulur  
- SSH bağlantıları veritabanına kaydedilir  
- “Bağlan” ile WebSocket açılır → gerçek SSH oturumu başlatılır  
- Terminal input/output gerçek zamanlı aktarılır

## SSH Bağlantısı

- Kullanıcı host, port ve kullanıcı bilgilerini girerek SSH bağlantısı ekler.
- Kimlik doğrulama: **Şifre** veya **SSH Key**
- “Bağlan” ile tarayıcı üzerinde canlı terminal açılır.
- Terminalde girilen komutlar doğrudan hedef sunucuya iletilir.

> Not: SSH Key ile girişte private key tam içerik halinde girilmelidir.

## Yapay Zekâ Kullanımı

Proje yapay zekâ destekli olarak geliştirilmiştir.

- **Claude 4.5 Opus**: mimari tasarım, backend/frontend akışları, güvenlik yaklaşımları
- **Trae AI (VS Code)**: hata analizi, problem çözümü ve kod iyileştirme



## Çalıştırma (Önerilen – Docker)
Gereksinimler:  Docker - Docker Compose
```bash
docker compose up --build
```
## Çalıştırma (Local) 
### Backend
```bash
cd backend
go run ./cmd/main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173/