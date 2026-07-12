# PixLink

A minimal, production-ready image hosting service. Upload an image, get a permanent short URL and QR code back in seconds. Built as a final-year university project demonstrating full-stack AWS integration.

---

## Architecture

```
Browser (React/Vite SPA)
        |
        |  POST /api/upload  (multipart/form-data)
        |  GET  /api/stats/:code
        |  GET  /i/:code  (short-code redirect)
        v
   EC2 Ubuntu 22.04
   ┌─────────────────────────────────────┐
   │  Nginx  (reverse proxy — port 80)   │
   │    ├─ /api/*   →  Express (PM2)     │
   │    ├─ /i/*     →  Express (PM2)     │
   │    └─ /*       →  React static build│
   └─────────────────────────────────────┘
           │                   │
           ▼                   ▼
        AWS S3             AWS DynamoDB
      (image files)        (metadata)
           ▲
           │  (optional)
      CloudFront CDN
```

**Data flow — upload:**
1. Browser compresses image client-side → POSTs to `/api/upload`
2. Express validates type/size → streams to S3
3. Express writes metadata record to DynamoDB (code, s3Key, expiry, views=0)
4. Returns `{ shortUrl, code, viewUrl }` to browser
5. Browser shows short URL + QR code; stores entry in localStorage

**Data flow — redirect:**
1. Browser hits `GET /i/:code`
2. Express reads DynamoDB → checks expiry
3. Expired → 410 HTML page; Valid → 302 to S3/CloudFront URL + increments view counter

---

## AWS Services at a Glance

| Service | Role |
|---|---|
| **S3** | Stores raw image files under `uploads/<code>.<ext>` |
| **DynamoDB** | Stores per-image metadata (filename, S3 key, upload date, short-code, expiry, view count) |
| **EC2** | Hosts the Express API + serves the React build via Nginx |
| **CloudFront** | (Optional) CDN in front of S3 for fast global image delivery |
| **IAM Role** | Grants EC2 instance access to S3 + DynamoDB — no hardcoded keys |

---

## Project Structure

```
.
├── README.md
├── DEPLOY.md
├── .gitignore
├── frontend/                   # React (Vite) single-page app
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css           # Design tokens + global styles
│       ├── components/
│       │   ├── Dropzone.jsx
│       │   ├── UploadCard.jsx
│       │   ├── ResultCard.jsx
│       │   ├── RecentUploads.jsx
│       │   ├── ThemeToggle.jsx
│       │   └── Toast.jsx
│       └── utils/
│           ├── compress.js     # Client-side compression wrapper
│           ├── qr.js           # QR code canvas helper
│           └── storage.js      # localStorage recent-uploads CRUD
└── backend/                    # Node.js + Express REST API
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── routes/
    │   ├── health.js           # GET /api/health
    │   ├── upload.js           # POST /api/upload
    │   ├── stats.js            # GET /api/stats/:code
    │   └── redirect.js         # GET /i/:code
    ├── middleware/
    │   ├── rateLimit.js
    │   └── validate.js
    ├── services/
    │   ├── s3.js
    │   └── dynamo.js
    └── utils/
        └── shortCode.js
```

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- AWS CLI configured (for local dev you may use a named profile or env vars)
- An S3 bucket and DynamoDB table already created (see DEPLOY.md)

### 1 — Clone and install

```bash
git clone <your-repo-url> pixlink
cd pixlink

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2 — Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your real values
```

| Variable | Description |
|---|---|
| `AWS_REGION` | e.g. `us-east-1` |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `DYNAMO_TABLE_NAME` | Your DynamoDB table name |
| `CLOUDFRONT_BASE_URL` | Optional — CloudFront distribution URL |
| `PORT` | Express listen port (default `4000`) |
| `ALLOWED_ORIGIN` | CORS origin for production (e.g. `https://pixlink.xyz`) |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms (default `60000`) |
| `RATE_LIMIT_MAX` | Max uploads per window per IP (default `20`) |

### 3 — Run in development

```bash
# Terminal 1 — backend (auto-restarts with nodemon)
cd backend && npm run dev

# Terminal 2 — frontend (Vite dev server with HMR)
cd frontend && npm run dev
```

Frontend dev server proxies `/api` and `/i` requests to `http://localhost:4000` via `vite.config.js`.

### 4 — Verify

```bash
curl http://localhost:4000/api/health
# {"status":"ok","ts":"..."}
```

---

## DynamoDB Table Schema

Table name controlled by `DYNAMO_TABLE_NAME` env var.

| Attribute | Type | Notes |
|---|---|---|
| `code` | String (PK) | 6-char nanoid short-code |
| `s3Key` | String | e.g. `uploads/aB3dK9.jpg` |
| `originalName` | String | Original filename from upload |
| `mimeType` | String | e.g. `image/jpeg` |
| `size` | Number | File size in bytes |
| `uploadedAt` | String | ISO-8601 timestamp |
| `expiresAt` | String | ISO-8601 or `"never"` |
| `views` | Number | Incremented on each redirect |

---

## Deployment

See **DEPLOY.md** for full copy-pasteable EC2 deployment steps.
