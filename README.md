# Temporary Email Service

A production-ready temporary email address generating server built with Node.js, Express, TypeScript, and Prisma ORM.

## Features

- **Generate Temporary Email Addresses**: Create disposable email addresses on demand
- **SMTP Server**: Built-in SMTP server to receive emails (prevents open relay)
- **Email Storage**: Store received emails in SQLite database with full parsing (subject, body, HTML, attachments metadata)
- **Auto-Expiration**: Emails and addresses automatically expire after configurable TTL (15 minutes default)
- **REST API**: Full-featured API endpoints for creating addresses and fetching emails
- **Security Features**:
  - Rate limiting (10 requests per 15 minutes for creation, 60 per minute for reads)
  - Input validation with Zod
  - CORS configuration
  - No open relay - only accepts emails for registered addresses
  - Automatic cleanup of expired data
- **Modern Frontend**: Single-page app with real-time inbox polling
- **Docker Support**: Ready for containerized deployment
- **Logging**: Comprehensive logging with Pino

## Tech Stack

- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **SMTP**: smtp-server package
- **Email Parsing**: mailparser
- **Validation**: Zod
- **Logging**: Pino
- **Rate Limiting**: express-rate-limit

## Prerequisites

- Node.js 20+ LTS
- npm 10+
- Docker & Docker Compose (for containerized deployment)

## Installation

### Local Development

1. **Clone and setup**
```bash
cd temporary-email-service
cp .env.example .env
npm install
```

2. **Generate Prisma client and initialize database**
```bash
npm run prisma:generate
npm run db:push
```

3. **Start development server**
```bash
npm run dev
```

The server will start on:
- HTTP API: http://localhost:3000
- SMTP Server: localhost:2525
- Frontend: http://localhost:3000

### Production Build

```bash
npm run build
npm run prisma:migrate:prod
npm start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3000
SMTP_PORT=2525

# Database Configuration
DATABASE_URL="file:./dev.db"

# Email Configuration
EMAIL_DOMAIN=temp.local
BASE_URL=http://localhost:3000

# TTL Configuration (in minutes)
DEFAULT_TTL_MINUTES=15
MAX_TTL_MINUTES=60
MIN_TTL_MINUTES=1

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

This starts:
- Application on port 3000 (HTTP API + Frontend)
- SMTP server on port 2525
- SQLite database with persistent storage

### Using Docker Directly

```bash
docker build -t temp-email .
docker run -p 3000:3000 -p 2525:2525 temp-email
```

## API Endpoints

### 1. Create Temporary Email Address

**POST** `/api/emails/create`

**Query Parameters:**
- `ttl` (optional): Time to live in minutes (1-60, default: 15)

**Response:**
```json
{
  "address": "abc123def456@temp.local",
  "expiresAt": "2024-02-26T10:15:00.000Z",
  "expiresIn": 900
}
```

**Rate Limit:** 10 requests per 15 minutes per IP

---

### 2. Get All Emails for Address

**GET** `/api/emails/:address`

**Response:**
```json
{
  "address": "abc123def456@temp.local",
  "expired": false,
  "expiresAt": "2024-02-26T10:15:00.000Z",
  "emails": [
    {
      "id": "email_id_here",
      "from": "sender@example.com",
      "subject": "Welcome",
      "receivedAt": "2024-02-26T09:50:00.000Z"
    }
  ]
}
```

**Rate Limit:** 60 requests per minute per IP

---

### 3. Get Specific Email

**GET** `/api/emails/:address/:emailId`

**Response:**
```json
{
  "id": "email_id_here",
  "from": "sender@example.com",
  "to": "abc123@temp.local",
  "subject": "Welcome",
  "textBody": "Plain text content...",
  "htmlBody": "<html>...</html>",
  "attachmentsMetadata": [
    {
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 102400
    }
  ],
  "receivedAt": "2024-02-26T09:50:00.000Z"
}
```

**Rate Limit:** 60 requests per minute per IP

---

### 4. Health Check

**GET** `/api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-26T10:00:00.000Z"
}
```

## Testing the SMTP Server

### Using telnet (macOS/Linux)

```bash
telnet localhost 2525
```

Then send an email:
```
EHLO example.com
MAIL FROM:<sender@example.com>
RCPT TO:<abc123def456@temp.local>
DATA
From: sender@example.com
To: abc123def456@temp.local
Subject: Test Email
Content-Type: text/plain

This is a test email.
.
QUIT
```

### Using a tool like ssmtp or swaks

```bash
# Using swaks
swaks --to abc123def456@temp.local \
      --from sender@example.com \
      --server localhost:2525 \
      --subject "Test" \
      --body "Test email"
```

## Frontend Usage

1. Open http://localhost:3000
2. Click "Generate Address" to create a temporary email
3. Copy the address
4. Send emails to that address
5. Inbox auto-refreshes every 5 seconds
6. Click on any email to view details
7. Address automatically expires after configured TTL

## Project Structure

```
temporary-email-service/
├── src/
│   ├── server.ts              # Application entry point
│   ├── app.ts                 # Express app configuration
│   ├── config/
│   │   └── index.ts           # Environment variables & validation
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   └── email.routes.ts    # Email API endpoints
│   ├── services/
│   │   ├── email.service.ts   # Email business logic
│   │   └── cleanup.service.ts # Expiration cleanup
│   ├── smtp/
│   │   ├── smtp-server.ts     # SMTP server setup
│   │   └── email-parser.ts    # Email parsing logic
│   ├── middleware/
│   │   ├── error-handler.ts   # Global error handling
│   │   ├── rate-limiter.ts    # Rate limiting
│   │   └── validator.ts       # Input validation
│   ├── utils/
│   │   ├── logger.ts          # Pino logger
│   │   └── prisma.ts          # Prisma client singleton
│   └── types/
│       └── index.ts           # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── index.html             # Frontend SPA
├── Dockerfile                 # Docker build configuration
├── docker-compose.yml         # Docker Compose setup
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

## Database Schema

### EmailAddress Model

```prisma
model EmailAddress {
  id        String   @id @default(cuid())
  address   String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  emails    Email[]
}
```

### Email Model

```prisma
model Email {
  id                     String       @id @default(cuid())
  emailAddressId         String
  emailAddress           EmailAddress @relation(fields: [emailAddressId], references: [id], onDelete: Cascade)
  from                   String
  to                     String
  subject                String
  textBody               String?
  htmlBody               String?
  attachmentsMetadata    Json?
  receivedAt             DateTime     @default(now())
  headers                Json?
}
```

## Key Features Explained

### 1. SMTP Server (No Open Relay)

The SMTP server validates recipient addresses during the RCPT TO phase. It only accepts emails destined for registered temporary addresses that haven't expired. This prevents abuse and open relay.

**Security Flow:**
```
Client connects → EHLO → MAIL FROM → RCPT TO [VALIDATE] → DATA → QUIT
```

### 2. Email Parsing

Incoming emails are parsed using mailparser to extract:
- Sender (from)
- Recipient (to)
- Subject
- Plain text body
- HTML body
- Attachment metadata (filename, mimetype, size)

Note: Attachments are not stored fully (only metadata) to save disk space. Modify `email-parser.ts` if you need to store full attachments.

### 3. Auto-Expiration

A background cleanup service runs every 60 seconds:
- Finds all email addresses where `expiresAt` < now
- Deletes them (cascade delete removes associated emails)
- Logs the cleanup operation

This prevents unlimited database growth.

### 4. Rate Limiting

Implemented using `express-rate-limit`:
- **Create endpoint**: 10 requests per 15 minutes per IP
- **Read endpoints**: 60 requests per minute per IP
- Disabled in development mode

Can be adjusted in `src/middleware/rate-limiter.ts`.

## Kubernetes Deployment (Lilly-Kubed-Apps)

### Create Deployment YAML

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temp-email-service
  labels:
    app: temp-email-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: temp-email-service
  template:
    metadata:
      labels:
        app: temp-email-service
    spec:
      containers:
      - name: app
        image: temp-email-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 2525
          name: smtp
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: SMTP_PORT
          value: "2525"
        - name: EMAIL_DOMAIN
          valueFrom:
            configMapKeyRef:
              name: temp-email-config
              key: email-domain
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: temp-email-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: temp-email-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: temp-email-service
spec:
  type: LoadBalancer
  selector:
    app: temp-email-service
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: smtp
    port: 2525
    targetPort: 2525

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: temp-email-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: temp-email-config
data:
  email-domain: "temp.yourdomain.com"

---
apiVersion: v1
kind: Secret
metadata:
  name: temp-email-secrets
type: Opaque
stringData:
  database-url: "file:./data/production.db"
```

### Deploy to Kubernetes

```bash
# Build and push image to registry
docker build -t your-registry/temp-email-service:latest .
docker push your-registry/temp-email-service:latest

# Update image in YAML, then deploy
kubectl apply -f k8s-deployment.yaml

# Check deployment
kubectl get pods -l app=temp-email-service
kubectl logs -f deployment/temp-email-service
```

## DNS MX Records Configuration

To receive emails for a custom domain, configure MX records:

**Example for `temp.yourdomain.com`:**

```
temp.yourdomain.com. IN MX 10 mail.yourdomain.com.
mail.yourdomain.com. IN A 192.168.1.100
```

Or if using a hostname:

```
temp.yourdomain.com. IN MX 10 app.yourdomain.com.
```

**DNS Propagation:** Allow 24-48 hours for DNS changes to propagate globally.

**Verify MX Records:**
```bash
# Linux/macOS
dig temp.yourdomain.com MX

# Windows
nslookup -type=MX temp.yourdomain.com
```

## Monitoring & Logging

### Logs

All operations are logged to console:
- Email address creation/deletion
- SMTP connections and email receipt
- API requests and errors
- Cleanup operations

In production, redirect logs to a file:

```bash
npm start >> app.log 2>&1
```

Or use log aggregation tools like ELK, Splunk, etc.

### Metrics

Add prometheus metrics by installing `prom-client`:

```bash
npm install prom-client
```

Then expose metrics at `/metrics` endpoint.

## Performance Optimization

1. **Database Indexing**: Add indexes on frequently queried fields
   ```prisma
   @@index([expiresAt])
   @@index([address])
   ```

2. **Connection Pooling**: Prisma handles this automatically

3. **Caching**: Add Redis for rate limiter state:
   ```bash
   npm install redis
   ```

4. **Batch Cleanup**: Modify cleanup service to delete in batches for large datasets

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Database locked error
- Ensure only one instance is running
- Check for stuck processes
- Delete `.db-wal` and `.db-shm` files if they exist

### SMTP not receiving emails
- Verify EMAIL_DOMAIN is correct
- Check SMTP_PORT is accessible from client machine
- Verify firewall rules
- Use telnet to test: `telnet localhost 2525`

### Emails not parsing correctly
- Check logs for parsing errors
- Ensure sender uses valid email format
- Some email clients may not include text body - HTML fallback provided

## Production Considerations

1. **Use PostgreSQL**: For better concurrency in production
   ```bash
   npm install pg
   ```
   Update `DATABASE_URL` to: `postgresql://user:password@host:5432/tempmail`

2. **Environment Secrets**: Use a secret management tool
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets

3. **SSL/TLS**: For production SMTP, enable STARTTLS
   - Modify `smtp-server.ts` to use certificate options

4. **Monitoring**: Set up alerts for:
   - High error rates
   - SMTP server down
   - Database disk space

5. **Backup**: Regular database backups
   ```bash
   sqlite3 dev.db ".backup backup.db"
   ```

6. **Rate Limiting**: Consider using Redis for distributed rate limiting if running multiple instances

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
