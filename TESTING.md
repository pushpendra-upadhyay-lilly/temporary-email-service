# Temporary Email Service - Testing Guide

## Quick Start

### 1. Development Mode

```bash
npm install
npm run prisma:generate
npm run db:push
npm run dev
```

Server runs on:
- HTTP API: http://localhost:3000
- SMTP: localhost:2525
- Frontend: http://localhost:3000

### 2. Test API Endpoints

#### Create Email Address
```bash
curl -X POST http://localhost:3000/api/emails/create
```

Response:
```json
{
  "address": "abc123def@temp.local",
  "expiresAt": "2026-02-26T10:15:00.000Z",
  "expiresIn": 900
}
```

#### Get Emails for Address
```bash
curl http://localhost:3000/api/emails/abc123def@temp.local
```

#### Get Specific Email
```bash
curl http://localhost:3000/api/emails/abc123def@temp.local/email_id_here
```

### 3. Test SMTP Server

**Using `swaks` (recommended):**
```bash
# Install swaks if not available
brew install swaks

# Send test email
swaks --from test@example.com \
      --server localhost:2525 \
      --header "Subject: HTML Test" \
      --body "This is a test email"
      --to abc123def@temp.local
```

**Using `nc` (netcat):**
```bash
# Create email file
cat > email.txt << 'EOF'
EHLO example.com
MAIL FROM:<sender@example.com>
RCPT TO:<abc123def@temp.local>
DATA
From: sender@example.com
To: abc123def@temp.local
Subject: Test Email
Content-Type: text/plain

This is a test email body.
.
QUIT
EOF

# Send via nc
nc localhost 2525 < email.txt
```

### 4. Test Frontend

1. Open http://localhost:3000 in browser
2. Click "Generate Address"
3. Copy the generated address
4. Send test email to that address (using swaks or your email client)
5. Click "Refresh Inbox" to see emails
6. Click on any email to view details

## Docker Testing

### Build and Run
```bash
docker build -t temp-email .
docker run -p 3000:3000 -p 2525:2525 temp-email
```

### Using Docker Compose
```bash
docker-compose up --build
```

Then test same as above on localhost.

## Testing Checklist

- [ ] HTTP API responds on port 3000
- [ ] SMTP server listens on port 2525
- [ ] Can create temporary email address via API
- [ ] Cannot create expired address via API
- [ ] Rate limiting prevents spam (10 creates per 15 min)
- [ ] SMTP rejects non-existent addresses
- [ ] SMTP accepts valid addresses
- [ ] Emails are stored in database
- [ ] Emails appear in API response
- [ ] Emails display in frontend
- [ ] Email details can be viewed
- [ ] Address expires after TTL
- [ ] Expired addresses are cleaned up
- [ ] Frontend shows auto-refreshing inbox
- [ ] Frontend copies address to clipboard

## Debugging

### Check Database
```bash
sqlite3 dev.db
sqlite> .tables
sqlite> SELECT * FROM "EmailAddress";
sqlite> SELECT * FROM "Email";
```

### View Logs
```bash
# In development, logs appear in console
# Tail running logs
npm run dev 2>&1 | grep -E "ERROR|WARN|Email"
```

### Test Rate Limiting
```bash
# Make 11 requests in quick succession (should fail on 11th)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/emails/create
done
```

### Check Cleanup Service
- Create an address with `ttl=1` (1 minute)
- Wait 65 seconds
- Try to fetch emails for that address
- Should return error or empty

## Performance Testing

### Load Test API
```bash
# Install apache bench
brew install httpd

# Create 100 addresses
ab -n 100 -c 10 -X POST http://localhost:3000/api/emails/create
```

### SMTP Load Test
```bash
# Send 50 emails in parallel
for i in {1..50}; do
  swaks --to test$i@temp.local --from sender@example.com --server localhost:2525 &
done
wait
```

## Production Deployment

### Using Docker Compose
```bash
# Configure environment
cp .env.example .env
# Edit .env with production values

# Build and deploy
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Kubernetes
See README.md for complete Kubernetes deployment guide.

## Troubleshooting

### SMTP Connection Refused
- Ensure SMTP_PORT=2525 is not blocked by firewall
- Check if port is already in use: `lsof -i :2525`

### Emails Not Appearing
- Check SMTP logs for errors: `npm run dev 2>&1 | grep -i smtp`
- Verify address format with `@temp.local` suffix
- Check database for stored emails: `sqlite3 dev.db "SELECT * FROM Email;"`

### Rate Limit Issues
- In development, rate limiting is disabled
- In production, limits are per IP address
- Use `X-Forwarded-For` header when behind proxy

### Database Locked
- Kill any stuck processes: `lsof | grep dev.db`
- Delete WAL files: `rm dev.db-wal dev.db-shm`
- Restart server

## Next Steps

1. Test all API endpoints thoroughly
2. Verify SMTP email receipt and parsing
3. Test frontend UI and interactions
4. Test Docker container deployment
5. Configure custom domain and DNS MX records
6. Deploy to production environment
