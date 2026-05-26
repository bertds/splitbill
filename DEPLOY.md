# Deploying to Hetzner with Docker

## Prerequisites

- A Hetzner VPS (CX22 or bigger — at least 2 GB RAM for the build step)
- A domain with an **A record pointing to your server's IP**  
  e.g. `bill.yourdomain.com → 123.456.789.0`
- Docker + Docker Compose installed on the server

### Install Docker on a fresh Hetzner Ubuntu server

```bash
curl -fsSL https://get.docker.com | sh
```

---

## 1. Clone the repo on the server

```bash
git clone https://github.com/bertds/splitbill.git
cd splitbill
git checkout claude/bill-splitting-app-IlDXx
```

## 2. Create your `.env` file

```bash
cp .env.example .env
nano .env   # fill in your domain + API keys
```

Minimum required:
```
DOMAIN=bill.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://qcyhcbwlnydhmcwsezod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...   # at least one OCR key
```

## 3. Open firewall ports

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp   # HTTP/3
```

## 4. Build and start

```bash
docker compose up -d --build
```

This will:
- Build the Next.js app (takes ~2 min on first run)
- Start Caddy, which automatically provisions a Let's Encrypt TLS cert
- Expose the app at `https://bill.yourdomain.com`

Check logs:
```bash
docker compose logs -f
```

## 5. Updating to a new version

```bash
git pull
docker compose up -d --build
```

Docker Compose will rebuild only the app container and restart it with zero downtime on the Caddy side.

---

## Troubleshooting

**Build fails with out-of-memory:**  
```bash
# Add swap (free on Hetzner)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

**Caddy can't get a cert:**  
- Make sure your domain's A record is pointing to the right IP: `dig bill.yourdomain.com`
- Ports 80 + 443 must be open to the internet
- Check Caddy logs: `docker compose logs caddy`

**Camera not working on Android:**  
The app requires HTTPS for camera access — make sure you're accessing the `https://` URL, not `http://`.

---

## Resource usage (steady state)

| Container | RAM | CPU |
|-----------|-----|-----|
| app       | ~80 MB | <1% |
| caddy     | ~15 MB | <1% |

A Hetzner CX22 (2 vCPU, 4 GB) is plenty for personal/team use.
