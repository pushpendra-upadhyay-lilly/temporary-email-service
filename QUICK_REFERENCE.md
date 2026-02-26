# Temporary Email Service - Quick Reference

## 🚀 Getting Started (30 seconds)

```bash
cd /Users/L088617/Projects/temporary-email-service
npm run dev
# Open http://localhost:3000
```

## 📡 API Endpoints Reference

### Create Email Address
```bash
POST /api/emails/create?ttl=15
```
**Response:**
```json
{
  "address": "abc123@temp.local",
  "expiresAt": "2026-02-26T10:15:00Z",
  "expiresIn": 900
}
```

### Get All Emails
```bash
GET /api/emails/abc123@temp.local
```
**Response:**
```json
{
  "address": "abc123@temp.local",
  "expired": false,
  "expiresAt": "2026-02-26T10:15:00Z",
  "emails": [
    {
      "id": "email_id",
      "from": "sender@example.com",
      "subject": "Welcome",
      "receivedAt": "2026-02-26T09:50:00Z"
    }
  ]
}
```

### Get Specific Email
```bash
GET /api/emails/abc123@temp.local/email_id
```
**Response:**
```json
{
  "id": "email_id",
  "from": "sender@example.com",
  "to": "abc123@temp.local",
  "subject": "Welcome",
  "textBody": "Plain text...",
  "htmlBody": "<html>...</html>",
  "attachmentsMetadata": [
    { "filename": "doc.pdf", "mimetype": "application/pdf", "size": 102400 }
  ],
  "receivedAt": "2026-02-26T09:50:00Z"
}
```

## 🧪 Testing Commands

### Test API
```bash
# Create address
curl -X POST http://localhost:3000/api/emails/create

# Get emails
curl http://localhost:3000/api/emails/ADDRESS_HERE

# Send test email (macOS)
brew install swaks
swaks --to ADDRESS_HERE --from test@example.com --server localhost:2525 --subject "Test"
```

### Manual SMTP Test
```bash
nc localhost 2525

EHLO example.com
MAIL FROM:<test@example.com>
RCPT TO:<generated-address@temp.local>
DATA
From: test@example.com
To: generated-address@temp.local
Subject: Test Email

Test body
.
QUIT
```

## 🐳 Docker Commands

```bash
# Build and run
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs -f app

# Single container
docker build -t temp-email .
docker run -p 3000:3000 -p 2525:2525 temp-email
```

## 📝 npm Scripts

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (ts-node-dev) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run db:push` | Sync schema to database |
| `npm run prisma:migrate` | Run database migrations |

## 🔧 Configuration

### Environment Variables (.env)

```env
PORT=3000                        # HTTP server port
SMTP_PORT=2525                   # SMTP server port
DATABASE_URL=file:./dev.db       # SQLite path
EMAIL_DOMAIN=temp.local          # Domain for addresses
DEFAULT_TTL_MINUTES=15           # Default expiration
MAX_TTL_MINUTES=60               # Max allowed TTL
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

## 📊 Database

### Access SQLite Database
```bash
sqlite3 dev.db

# View tables
.tables

# View email addresses
SELECT id, address, expiresAt FROM EmailAddress;

# View emails
SELECT from, to, subject FROM Email;

# Check expiration
SELECT address, expiresAt, julianday('now') - julianday(expiresAt) as expired_days FROM EmailAddress;
```

## 🔒 Security Notes

- ✅ SMTP server validates recipients (no open relay)
- ✅ Rate limiting: 10 creates/15min, 60 reads/min per IP
- ✅ All input validated with Zod
- ✅ SQL injection prevented by Prisma ORM
- ✅ CORS configured
- ✅ Timestamps prevent TTL manipulation

## 🐛 Debugging

### View Logs
```bash
npm run dev 2>&1 | grep ERROR
npm run dev 2>&1 | grep WARN
```

### Check SMTP
```bash
telnet localhost 2525
# Should connect
QUIT
```

### Check API
```bash
curl http://localhost:3000/api/health
```

### Database Issues
```bash
# Kill stuck processes
lsof | grep dev.db
kill -9 PID

# Reset database
rm dev.db dev.db-wal dev.db-shm
npm run db:push
```

## 📈 Performance Tips

1. **Rate Limiting**: Already configured per-endpoint
2. **Database Indexes**: Present on expiresAt and address
3. **Cleanup**: Runs every 60 seconds
4. **Connection Pooling**: Handled by Prisma
5. **Logging**: Adjust LOG_LEVEL to minimize overhead

## 🚢 Deployment Checklist

- [ ] Update .env for production
- [ ] Set NODE_ENV=production
- [ ] Configure EMAIL_DOMAIN
- [ ] Set up DNS MX records
- [ ] Build Docker image
- [ ] Test SMTP on production
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up logs aggregation

## 📚 File Locations

- **API Routes**: `src/routes/email.routes.ts`
- **SMTP Server**: `src/smtp/smtp-server.ts`
- **Database Schema**: `prisma/schema.prisma`
- **Frontend**: `public/index.html`
- **Configuration**: `src/config/index.ts`
- **Services**: `src/services/*.ts`
- **Middleware**: `src/middleware/*.ts`

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -i :3000` then `kill -9 PID` |
| SMTP not working | Check firewall, verify localhost:2525 accessible |
| Emails not stored | Check database with sqlite3, view logs |
| Rate limit errors | It's working! Try again later or use dev mode |
| Database locked | Delete `.db-wal` and `.db-shm` files |

## 🎯 Next Steps

1. **Test locally**: `npm run dev`
2. **Generate address**: Open http://localhost:3000
3. **Send email**: Use swaks or telnet
4. **View emails**: Check API response
5. **Deploy**: Use Docker or Kubernetes
6. **Configure domain**: Set DNS MX records
7. **Monitor**: Set up logging & alerts

## 📞 Support Resources

- **README.md**: Full documentation
- **TESTING.md**: Testing procedures
- **ARCHITECTURE.md**: System design
- **Source code**: Well-commented TypeScript

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-26  
**Status**: Production Ready ✅
