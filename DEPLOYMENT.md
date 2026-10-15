# Deployment Guide — Overseer Lexicon

This guide covers deployment strategies for **Overseer Lexicon**, from single-command Docker containers to self-hosted Linux VPS instances and cloud PaaS providers.

---

## Architecture & Storage Considerations

Overseer Lexicon is built with **Next.js 16 (App Router)** and **React 19**, using Node.js 22's native **`node:sqlite`** embedded database engine (`DatabaseSync`).

### Key Operational Characteristics:
- **Zero External Database Services**: The database is stored locally in `data/lexicon.db` with Write-Ahead Logging (`WAL` mode) and SQLite FTS5 full-text search.
- **Node.js 22 Requirement**: The runtime environment **must** be Node.js 22.5.0 or later to support `node:sqlite`.
- **Persistent Volume Requirement**: Because SQLite stores state on disk, write operations (term imports, starring terms, database seeding) require a **persistent filesystem volume** mounted at the `data/` directory.
- **Automatic Bootstrapping**: If `data/lexicon.db` does not exist on startup, the application automatically initializes the database schema, indexes, and triggers, and seeds it with default terms from `src/data/overseer.json`.

---

## Environment Variables

Configure the following environment variables as needed:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations. |
| `PORT` | No | `3000` | The network port the HTTP server listens on. |
| `HOST` / `HOSTNAME` | No | `0.0.0.0` | Listen interface address. Set to `0.0.0.0` for Docker/cloud. |
| `GEMINI_API_KEY` | No | — | Optional. Required only if using the server-side AI generation endpoint or CLI term generator (`pnpm generate --generate`). |

---

## Deployment Option 1: Docker (Recommended)

Docker provides an isolated, consistent runtime with Node 22 and simple volume persistence.

### 1. `Dockerfile`
A multi-stage, secure Dockerfile with a non-root user:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- 1. Dependencies Stage ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# --- 2. Build Stage ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# --- 3. Production Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create persistent data directory and assign ownership
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy built application assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/RULES.md ./RULES.md

USER nextjs

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["pnpm", "start"]
```

### 2. `docker-compose.yml`
Create a `docker-compose.yml` file to manage the container and persistent volume:

```yaml
version: '3.8'

services:
  lexicon:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: overseer-lexicon
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      # Optional: Provide Gemini key if using AI generation
      # - GEMINI_API_KEY=your_gemini_api_key_here
    volumes:
      # Persistent SQLite storage
      - lexicon_data:/app/data

volumes:
  lexicon_data:
    driver: local
```

### 3. Launching
```bash
# Build and start the container in detached mode
docker compose up -d --build

# View real-time logs
docker compose logs -f

# Stop container
docker compose down
```

The database will be automatically created inside the `lexicon_data` volume and persist across container restarts and image updates.

---

## Deployment Option 2: Linux VPS (Ubuntu / Debian / Rocky)

For a self-hosted virtual private server (DigitalOcean, Hetzner, Linode, AWS EC2, etc.):

### 1. Install Node.js 22 & pnpm
```bash
# Install Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node version (must be >= 22.5.0)
node -v

# Enable pnpm via Corepack
sudo corepack enable
```

### 2. Clone and Build the Application
```bash
# Clone to /var/www or your deploy path
sudo mkdir -p /var/www/thelexicon
sudo chown -R $USER:$USER /var/www/thelexicon
git clone <your-repo-url> /var/www/thelexicon
cd /var/www/thelexicon

# Install production dependencies and build
pnpm install
pnpm build

# Seed database with initial terms
pnpm seed
```

### 3. Configure Systemd Service
Create a systemd service unit to manage the Next.js process automatically:

```bash
sudo nano /etc/systemd/system/lexicon.service
```

Add the following configuration (replace `username` with your Linux user):

```ini
[Unit]
Description=Overseer Lexicon Next.js Application
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/var/www/thelexicon
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
# Environment=GEMINI_API_KEY=your_gemini_api_key_here

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lexicon
sudo systemctl start lexicon
sudo systemctl status lexicon
```

### 4. Configure Nginx Reverse Proxy & SSL
Install Nginx:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/lexicon.conf`:
```nginx
server {
    listen 80;
    server_name lexicon.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and obtain a free HTTPS certificate via Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/lexicon.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d lexicon.yourdomain.com
```

---

## Deployment Option 3: Modern PaaS with Persistent Volumes

### Fly.io
Fly.io runs Docker containers close to users with native NVMe persistent volumes.

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Initialize app: `fly launch --no-deploy`
3. Create a persistent volume for SQLite (e.g. 1GB):
   ```bash
   fly volumes create lexicon_data --size 1 --region sin
   ```
4. Update `fly.toml` to attach the volume to `/app/data`:
   ```toml
   app = "overseer-lexicon"
   primary_region = "sin"

   [build]
     dockerfile = "Dockerfile"

   [mounts]
     source = "lexicon_data"
     destination = "/app/data"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = 'stop'
     auto_start_machines = true
     min_machines_running = 1
   ```
5. Deploy: `fly deploy`

### Railway / Render
1. Choose **Deploy from GitHub repo**.
2. Select **Docker** or Node 22 environment.
3. In **Settings > Disks / Volumes**, add a persistent disk mounted at:
   ```
   Mount Path: /app/data
   ```
4. Set Build Command: `pnpm install && pnpm build`
5. Set Start Command: `pnpm start`

---

## Deployment Option 4: Vercel Considerations

Vercel is designed for **stateless, serverless** workloads. Serverless lambdas have ephemeral filesystems that discard SQLite writes across executions.

- **Read-Only / Static Deployment on Vercel**:
  If you only need a read-only dictionary where users browse, search, and filter, commit `data/lexicon.db` or run `pnpm seed` during build.
- **Full Write Persistence**:
  For production setups where users import terms or toggle stars that persist on the server, choose **Docker**, **VPS**, or a **PaaS with persistent volumes** (Options 1–3).

---

## Database Backups & Maintenance

### Creating an Online Hot Backup
SQLite WAL mode allows zero-downtime online backups even while queries are executing:

```bash
# Using Node CLI / SQLite command line:
node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/lexicon.db');
db.exec('VACUUM INTO \"data/backup-' + Date.now() + '.db\";');
console.log('Backup created successfully.');
"
```

### Automated Nightly Backup Cron
Add a cron entry to keep rolling daily backups:
```bash
0 3 * * * cp /var/www/thelexicon/data/lexicon.db /var/backups/lexicon-$(date +\%F).db
```

### Seeding or Resetting Data
```bash
# Re-seed database with default terms from JSON:
pnpm seed
```

