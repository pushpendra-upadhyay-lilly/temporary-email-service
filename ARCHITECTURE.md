# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEMPORARY EMAIL SERVICE                          │
└─────────────────────────────────────────────────────────────────────────┘

                              EXTERNAL LAYER
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼──────┐  ┌───▼─────┐   ┌────▼──────┐
              │  Browser   │  │ SMTP    │   │  Node.js  │
              │  (HTTP)    │  │ Clients │   │  HTTP     │
              │            │  │ (2525)  │   │  Clients  │
              └─────┬──────┘  └───┬─────┘   └────┬──────┘
                    │             │              │
        ┌───────────┴─────────────┼──────────────┴──────────┐
        │                         │                         │
        │                    ┌────▼────────┐               │
        │                    │   FIREWALL  │               │
        │                    │ PORTS: 3000 │               │
        │                    │      2525   │               │
        │                    └────┬────────┘               │
        │                         │                         │
        │         ┌───────────────┴────────────────┐       │
        │         │                                │       │
   ┌────▼─────┐  │  ┌───────────────────────────┐ │  ┌────▼──────┐
   │ FRONTEND  │  │  │   EXPRESS SERVER         │ │  │  HEALTHZ  │
   │ (SPA)     │  │  │  (port 3000)            │ │  │  CHECKS   │
   │           │  │  │                         │ │  │           │
   │ index.html   │  ├───────────────────────────┤ │  └───────────┘
   └────┬─────┘  │  │                         │ │
        │        │  │  ┌─────────────────────┐ │ │
        │        │  │  │  MIDDLEWARE LAYER  │ │ │
        │        │  │  │                     │ │ │
        │        │  │  ├─ CORS               │ │ │
        │        │  │  ├─ Body Parser        │ │ │
        │        │  │  ├─ Request Logger     │ │ │
        │        │  │  ├─ Rate Limiter       │ │ │
        │        │  │  ├─ Validator (Zod)    │ │ │
        │        │  │  ├─ Error Handler      │ │ │
        │        │  │  └─ Static Files       │ │ │
        │        │  │                         │ │ │
        │        │  ├───────────────────────────┤ │
        │        │  │                         │ │
        │        │  │  ┌─────────────────────┐ │ │
        │        │  │  │  ROUTES LAYER       │ │ │
        │        │  │  │                     │ │ │
        │        │  │  ├─ POST /create       │ │ │
        │        │  │  ├─ GET /:address      │ │ │
        │        │  │  └─ GET /:addr/:id     │ │ │
        │        │  │                         │ │ │
        │        │  ├───────────────────────────┤ │
        │        │  │                         │ │
        │        │  │  ┌─────────────────────┐ │ │
        │        │  │  │  SERVICES LAYER     │ │ │
        │        │  │  │                     │ │ │
        │        │  │  ├─ EmailService       │ │ │
        │        │  │  │  ├─ generateAddress │ │ │
        │        │  │  │  ├─ createAddress   │ │ │
        │        │  │  │  ├─ storeEmail      │ │ │
        │        │  │  │  └─ getEmails       │ │ │
        │        │  │  │                     │ │ │
        │        │  │  ├─ CleanupService     │ │ │
        │        │  │  │  └─ scheduler       │ │ │
        │        │  │  └─────────────────────┘ │ │
        │        │  └─────────────────────────┘ │
        │        └─────────────────────────────┘
        │                     │
        │              ┌──────▼───────┐
        │              │  SMTP SERVER │
        │              │ (port 2525)  │
        │              │              │
        │              ├──────────────┤
        │              │              │
        │              │ onConnect    │
        │              │ onRcptTo     │
        │              │ onData       │
        │              │ onClose      │
        │              │              │
        │              ├──────────────┤
        │              │              │
        │              │ EmailParser  │
        │              │ (mailparser) │
        │              │              │
        │              └──────┬───────┘
        │                     │
        └─────────────────────┼──────────────────┐
                              │                  │
                        ┌─────▼──────┐    ┌──────▼────┐
                        │ PRISMA ORM │    │   LOGGER  │
                        │            │    │  (Pino)   │
                        │ Database   │    │           │
                        │ Abstraction│    │ Winston   │
                        │            │    │ Format    │
                        └─────┬──────┘    └───────────┘
                              │
                        ┌─────▼──────────┐
                        │  SQLite DB     │
                        │                │
                        │  dev.db        │
                        │                │
                        ├────────────────┤
                        │  Tables:       │
                        │  - EmailAddress│
                        │  - Email       │
                        │                │
                        │  Relations:    │
                        │  1:N (1 addr   │
                        │      N emails) │
                        └────────────────┘
```

## Data Flow Diagrams

### 1. Creating a Temporary Email Address

```
Client                  API                 Service                Database
  │                      │                     │                      │
  ├─ POST /create ──────>│                     │                      │
  │                      │                     │                      │
  │                      ├─ Validate TTL      │                      │
  │                      │                     │                      │
  │                      ├─ generateAddress ──>│                      │
  │                      │                     │                      │
  │                      ├─ createAddress ────────────────────────────>│
  │                      │                     │                      │
  │                      │<─────────────────────────────── emailId ────│
  │                      │                     │                      │
  │                      │<─ Return address ───│                      │
  │                      │                     │                      │
  │<─ 201 Created ──────│                     │                      │
  │   { address,        │                     │                      │
  │     expiresAt }     │                     │                      │
```

### 2. Receiving an Email via SMTP

```
SMTP Client           SMTP Server          Parser            Service      Database
    │                    │                   │                  │            │
    ├─ EHLO ──────────>  │                   │                  │            │
    │                    │                   │                  │            │
    ├─ MAIL FROM ──────> │                   │                  │            │
    │                    │                   │                  │            │
    ├─ RCPT TO ────────> │                   │                  │            │
    │                    ├─ Validate Address ────────────────────>Query DB   │
    │                    │                   │                  │            │
    │                    │<──────────── Is Valid? ──────────────│<──────────│
    │                    │                   │                  │            │
    ├─ DATA ───────────> │                   │                  │            │
    │   (raw email)      ├─ parseEmail ─────>│                  │            │
    │                    │                   ├─ Extract (from,  │            │
    │                    │                   │  to, subject,    │            │
    │                    │                   │  body, html,     │            │
    │                    │                   │  attachments)    │            │
    │                    │                   ├─ storeEmail ─────────────────>│
    │                    │                   │                  │            │
    │<─ 250 Message OK ──│                   │                  │            │
    │                    │                   │                  │            │
    ├─ QUIT ───────────> │                   │                  │            │
    │                    │                   │                  │            │
    │<─ 221 Bye ────────│                   │                  │            │
```

### 3. Fetching Emails from the API

```
Client                  API                 Service                Database
  │                      │                     │                      │
  ├─ GET /:address ────> │                     │                      │
  │                      │                     │                      │
  │                      ├─ Validate Address   │                      │
  │                      │                     │                      │
  │                      ├─ getEmailsForAddress ─────────────────────>│
  │                      │                     │                      │
  │                      │                     │<─ Query Emails ──────│
  │                      │                     │                      │
  │                      │                     │<─ [emails] ─────────│
  │                      │                     │                      │
  │                      │<─ Format Response ──│                      │
  │                      │                     │                      │
  │<─ 200 OK ───────────│                     │                      │
  │  { address,         │                     │                      │
  │    emails: [...],   │                     │                      │
  │    expired: false } │                     │                      │
```

### 4. Background Cleanup Process

```
Cleanup Service                                      Database
    │                                                    │
    ├─ Every 60 seconds ──┐                             │
    │                     │                             │
    ├─ deleteExpiredAddresses()                         │
    │                     │                             │
    │                     ├─ Find expired addresses ───>│
    │                     │                             │
    │                     │<─ [expired addresses] ──────│
    │                     │                             │
    │                     ├─ DELETE addresses ────────>│
    │                     │   (CASCADE DELETE emails)   │
    │                     │                             │
    │                     │<─ Confirmation ────────────│
    │                     │                             │
    ├─ Log cleanup result │                             │
    │                     │                             │
    └─ Schedule next run  │                             │
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                      index.html (Frontend)                  │
│               Fetch API calls to /api/emails                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    server.ts (Entry Point)                  │
│                                                             │
│  ├─ Load config                                            │
│  ├─ Create Express app                                     │
│  ├─ Create SMTP server                                     │
│  ├─ Start cleanup scheduler                                │
│  └─ Handle graceful shutdown                               │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬──────────────┐
        │                │                │              │
┌───────▼────────┐ ┌────▼─────────┐ ┌──▼────────┐ ┌───▼──────────┐
│   app.ts       │ │   smtp/      │ │ services/ │ │  routes/     │
│ (Express app)  │ │ (SMTP setup) │ │ (business │ │  (API)       │
│                │ │              │ │ logic)    │ │              │
│ ├─ Middleware  │ │ ├─ onConnect │ │           │ │ ├─ POST      │
│ │  (CORS,      │ │ ├─ onRcptTo  │ │ ├─ email  │ │ │ /create    │
│ │   Logger,    │ │ ├─ onData    │ │ │         │ │ │            │
│ │   RateLimit) │ │ │            │ │ ├─ cleanup│ │ ├─ GET       │
│ ├─ Routes      │ │ └─ Parser    │ │ └─────────┘ │ │ /:address  │
│ └─ Error hdler │ │    (Email    │ │            │ │ └─ GET      │
│                │ │     Parsing) │ │            │ │  /:addr/:id │
└────────────────┘ └──────────────┘ └────────────┘ └────────────┘
        │                │                │              │
        │                │                │              │
        └────────────────┼────────────────┴──────────────┘
                         │
        ┌────────────────┼────────────────┬──────────────┐
        │                │                │              │
┌───────▼────────┐ ┌────▼─────────┐ ┌──▼────────┐ ┌───▼──────────┐
│  middleware/   │ │  utils/      │ │  config/  │ │   types/     │
│  (validators)  │ │ (logger,     │ │           │ │              │
│                │ │  prisma)     │ │ ├─ Load   │ │ ├─ ParsedEmail│
│ ├─ Error hdler │ │              │ │ │ env     │ │ ├─ CreateEmail│
│ ├─ Rate limit  │ │ ├─ Logger    │ │ ├─ Validate
│ └─ Validator   │ │ │ (Pino)     │ │ │ config  │ │ │ Schema      │
│                │ │ ├─ Prisma    │ │ └─────────┘ │ │             │
│                │ │ │ (DB client) │ │            │ └─────────────┘
└────────────────┘ │ └────────────┘ │            │
                   │                │            │
                   └────────────────┼────────────┘
                                    │
                          ┌─────────▼────────────┐
                          │   Prisma ORM        │
                          │                     │
                          ├─ EmailAddress model│
                          ├─ Email model       │
                          └─────────┬──────────┘
                                    │
                          ┌─────────▼────────────┐
                          │   SQLite Database   │
                          │    (dev.db)         │
                          └─────────────────────┘
```

## Request Flow for Creating Email Address

```
1. Browser sends: POST /api/emails/create?ttl=15

2. Express middleware processes:
   ├─ CORS check
   ├─ Body parser
   ├─ Rate limiter (10/15min per IP)
   ├─ Zod validator
   └─ Request logger

3. Route handler:
   ├─ Extract and validate TTL param
   ├─ Call emailService.createEmailAddress(ttl)
   └─ Return response

4. Email Service:
   ├─ Generate random address (crypto.randomBytes)
   ├─ Clamp TTL to min/max bounds
   ├─ Calculate expiration time
   ├─ Create DB record via Prisma
   └─ Return address & expiresAt

5. Express response middleware:
   ├─ Set status 201 Created
   ├─ Log request (duration, IP)
   └─ Send JSON response

6. Browser receives:
   {
     "address": "abc123@temp.local",
     "expiresAt": "2026-02-26T10:15:00Z",
     "expiresIn": 900
   }
```

## Request Flow for Receiving Email via SMTP

```
1. SMTP client connects to localhost:2525

2. SMTP Server events:
   ├─ onConnect: Log connection
   ├─ EHLO exchange
   └─ Connection confirmed

3. MAIL FROM command:
   ├─ Parse sender address
   └─ Accept sender

4. RCPT TO command:
   ├─ Extract recipient address
   ├─ Call emailService.isAddressValid(recipient)
   ├─ Query database for address
   ├─ Check if expired
   ├─ If invalid: REJECT (anti-relay)
   └─ If valid: ACCEPT

5. DATA command:
   ├─ Receive raw email stream
   ├─ Call parseEmail(stream)
   ├─ Parse with mailparser:
   │  ├─ Extract from, to, subject
   │  ├─ Parse text body
   │  ├─ Parse HTML body
   │  ├─ Extract attachment metadata
   │  └─ Return ParsedEmail object
   ├─ Call emailService.storeEmail(addressId, parsedEmail)
   ├─ Create Email record in database
   ├─ Log successful store
   └─ Return 250 Message Accepted

6. QUIT command:
   ├─ Close SMTP connection
   ├─ Log closure
   └─ Cleanup resources
```

## Database Schema Relationships

```
┌─────────────────────────┐
│   EmailAddress          │
├─────────────────────────┤
│ id (CUID) [PRIMARY]     │
│ address (String) [UNIQUE]
│ createdAt (DateTime)    │
│ expiresAt (DateTime) ◄──┼─── INDEX (cleanup query)
│ emails (Relation)       │
└───────────────┬─────────┘
                │ 1
                │
                │ N (one address → many emails)
                │
                ▼
┌─────────────────────────┐
│   Email                 │
├─────────────────────────┤
│ id (CUID) [PRIMARY]     │
│ emailAddressId (String) │──► Cascading DELETE
│ from (String)           │
│ to (String)             │
│ subject (String)        │
│ textBody (String?)      │
│ htmlBody (String?)      │
│ attachmentsMetadata     │
│   (String? as JSON)     │
│ receivedAt (DateTime) ◄─┼─── INDEX (ordering)
│ headers (String? JSON)  │
│ emailAddress (Relation) │
└─────────────────────────┘
```

## Deployment Architecture

### Local Development
```
Developer Machine
  ├─ Node.js 20+
  ├─ npm install
  ├─ TypeScript compiled to dist/
  ├─ SQLite dev.db file
  └─ npm run dev (ts-node-dev)
```

### Docker Container
```
Docker Image
  ├─ Multi-stage build
  ├─ Stage 1: Build TypeScript
  ├─ Stage 2: Production runtime
  ├─ Node.js Alpine base
  ├─ Slim dependencies
  ├─ Non-root user (nodejs)
  └─ Health checks configured
```

### Docker Compose Stack
```
Services:
  ├─ app (Node.js container)
  │  ├─ Ports: 3000, 2525
  │  ├─ Volume: app_data (persistence)
  │  ├─ Environment: production config
  │  └─ Health checks: /api/health
  └─ Network: internal bridge
```

### Kubernetes Deployment
```
K8s Resources:
  ├─ Deployment (1 replica)
  ├─ Service (LoadBalancer)
  ├─ PersistentVolumeClaim (1Gi)
  ├─ ConfigMap (email domain, etc)
  ├─ Secret (database URL)
  ├─ Probes: livenessProbe, readinessProbe
  └─ Resource limits: requests & limits
```

This comprehensive architecture ensures:
- ✓ Separation of concerns
- ✓ Scalability
- ✓ Maintainability
- ✓ Security
- ✓ Performance
- ✓ Reliability
