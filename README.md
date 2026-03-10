# Lemmy-HAAG

A Docker-based [Lemmy](https://join-lemmy.org/) deployment with an integrated badge and gamification system, built for the Georgia Tech HAAG (Habitat-Agnostic AI and Gaming) research group. Extends Lemmy with badges, karma scoring, and leaderboards to recognize and incentivize community contributions.

## Architecture

```
                         ┌───────────────────────────────┐
                         │        Public Internet        │
                         └──────────┬──────────┬─────────┘
                                    │          │
                    ┌───────────────▼──┐  ┌────▼───────────────┐
                    │   Nginx Proxy    │  │  Alexandrite Proxy  │
                    │   :8080 / :8443  │  │    :80 / :443      │
                    │                  │  │                     │
                    │  badge-injection │  │  badge-injection    │
                    └──┬───────────┬──┘  └──┬──────────────────┘
                       │           │        │
              ┌────────▼──┐  ┌─────▼────┐  ┌▼──────────────┐
              │  Lemmy UI  │  │  Custom  │  │  Alexandrite   │
              │   :1234    │  │ Frontend │  │    :3000       │
              └─────┬──────┘  │  :3000   │  └───────┬───────┘
                    │         └──────────┘          │
                    └──────────┬────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Lemmy Backend     │
                    │      :8536          │
                    └──┬─────────┬────────┘
                       │         │
           ┌───────────▼──┐  ┌──▼──────────┐  ┌──────────────┐
           │  PostgreSQL   │  │   Pictrs    │  │   Postfix    │
           │    :5432      │  │  (images)   │  │  (email)     │
           └───────┬───────┘  └─────────────┘  └──────────────┘
                   │
           ┌───────▼───────┐
           │   Badge API   │
           │    :3001      │
           └───────────────┘
```

**10 services** running in Docker: Lemmy backend (v0.19.12), Lemmy UI, Alexandrite UI, two Nginx proxies, PostgreSQL (v17), Pictrs (v0.5.19), Postfix email relay, a custom frontend, and the Badge API.

## Prerequisites

- **Docker** and **Docker Compose** (v2+)
- **OpenSSL** (for generating self-signed SSL certs, if needed)
- Ports **80**, **443**, **3000**, **3001**, **8080**, and **8443** available on the host

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url> && cd Lemmy-haag
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Example |
|----------|-------------|---------|
| `HOSTNAME` | Server IP or domain name | `134.199.214.141` |
| `POSTGRES_PASSWORD` | PostgreSQL password | *(generate a strong password)* |
| `PICTRS_API_KEY` | Pictrs image service API key | *(generate a strong key)* |
| `BADGE_API_KEY` | API key for protected badge endpoints | *(generate a strong key)* |
| `NODE_ENV` | Node environment | `production` |

### 2. Configure Lemmy

Edit `lemmy.hjson` and update the following to match your `.env`:

- `database.password` — must match `POSTGRES_PASSWORD`
- `hostname` — must match `HOSTNAME`
- `pictrs.api_key` — must match `PICTRS_API_KEY`
- `email.smtp_from_address` — set to `noreply@<your-hostname>`

> **Important:** `lemmy.hjson` does not support environment variable interpolation. These values must be kept in sync with `.env` manually.

### 3. Generate SSL certificates (if needed)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -config openssl.conf
```

### 4. Create Pictrs data directory with correct permissions

```bash
mkdir -p volumes/pictrs
sudo chown 991:991 volumes/pictrs
```

### 5. Start all services

```bash
docker compose up -d
```

### 6. Access the platform

| Service | URL | Description |
|---------|-----|-------------|
| Alexandrite UI | `https://<host>` or `http://<host>` | Default frontend (modern Lemmy client) |
| Lemmy UI | `http://<host>:8080` or `https://<host>:8443` | Standard Lemmy web interface |
| Custom Frontend | `http://<host>:3000` | Enhanced landing page with badges |
| Badge API | `http://<host>:3001` | Badge/karma REST API |
| Badge API Health | `http://<host>:3001/health` | Health check endpoint |

On first launch, visit the Lemmy UI to create your admin account.

## Badge System

### How It Works

The badge system adds a gamification layer on top of Lemmy:

1. **Badges** are defined in PostgreSQL (seeded from `init.sql` on first boot)
2. **Admins award badges** to users via the Badge API (authenticated POST requests)
3. **Karma** is calculated as: `post_upvotes + comment_upvotes + badge_bonus`
4. **Badge injection** — Nginx injects a JavaScript file into both Lemmy UI and Alexandrite that fetches and displays badges in a styled sidebar, with 5-minute client-side caching

### Default Badges

| Badge | Icon | Category | Karma Bonus |
|-------|------|----------|-------------|
| HAAG Admin | :crown: | Admin | 500 |
| PhD Student | :crocodile: | Academic | 200 |
| Research Pioneer | :microscope: | Research | 150 |
| Progress Tracker | :chart_with_upwards_trend: | Research | 150 |
| Data Analyst | :bar_chart: | Research | 150 |
| Conservation Hero | :butterfly: | Conservation | 100 |
| Field Expert | :evergreen_tree: | Conservation | 100 |
| Tech Innovator | :bulb: | Technology | 80 |
| Gamification Expert | :video_game: | Technology | 80 |
| ML Specialist | :robot: | Technology | 80 |
| Mentor | :man_teacher: | Community | 60 |
| Community Builder | :handshake: | Community | 60 |

### API Reference

#### Public Endpoints

```
GET  /api/badges                      # List all active badges
GET  /api/badges/user/:username       # Get a user's badges
GET  /api/badges/stats/:username      # Badge stats + karma for a user
GET  /api/badges/karma/:username      # Karma breakdown for a user
GET  /api/badges/leaderboard          # Top users by karma (?limit=20, max 100)
GET  /u/:username                     # HTML badge display page
GET  /health                          # Health check
```

#### Authenticated Endpoints

Require the `X-API-Key` header set to the value of `BADGE_API_KEY`.

**Award a badge:**

```bash
curl -X POST http://localhost:3001/api/badges/award \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BADGE_API_KEY" \
  -d '{
    "username": "alice",
    "badge_name": "Research Pioneer",
    "awarded_by": "admin",
    "reason": "First paper published"
  }'
```

**Refresh a user's karma:**

```bash
curl -X POST http://localhost:3001/api/badges/karma/refresh/alice \
  -H "X-API-Key: $BADGE_API_KEY"
```

#### Rate Limits

- Read endpoints: **120 requests/minute**
- Write endpoints: **20 requests/minute**

## Project Structure

```
.
├── docker-compose.yml                 # Service orchestration (10 services)
├── .env.example                       # Environment variable template
├── lemmy.hjson                        # Lemmy core configuration
│
├── badge-api.js                       # Badge API server (Express.js)
├── Dockerfile.badge-api               # Badge API Docker image
├── package.json                       # Node.js dependencies
├── init.sql                           # Database schema + seed badges
│
├── nginx_internal.conf                # Nginx config for Lemmy UI proxy
├── nginx_alexandrite.conf             # Nginx config for Alexandrite proxy
├── proxy_params                       # Shared Nginx proxy headers
├── openssl.conf                       # SSL certificate generation config
├── cert.pem / key.pem                 # SSL certificates
│
├── badge-injection-dynamic.js         # Client-side badge display (injected by Nginx)
├── enhanced-frontend-with-badges.html # Custom frontend with badge integration
├── enhanced-frontend.html             # Enhanced Lemmy frontend
├── custom-frontend.html               # Custom landing page
│
└── volumes/
    ├── lemmy-ui/extra_themes/         # Custom CSS themes (10 themes)
    ├── pictrs/                        # Image/media storage
    └── postgres/                      # PostgreSQL data
```

## Database Schema

Initialized automatically on first boot via `init.sql`. Safe to re-run (uses `IF NOT EXISTS` / `ON CONFLICT` throughout).

| Table/View | Purpose |
|------------|---------|
| `badge` | Badge definitions — name, description, icon, color, category |
| `user_badge` | User-to-badge relationships with award metadata (who awarded, reason, progress) |
| `user_badge_details` | View joining `badge`, `user_badge`, and `person` for easy querying |
| `user_karma` | Karma scores — `post_upvotes + comment_upvotes + badge_bonus = total_karma` |

## Custom Themes

10 CSS themes are included in `volumes/lemmy-ui/extra_themes/` and are available in Lemmy UI under Settings > Theme:

`darkspace` `lora` `lora-compact` `lora-distractionless` `mintybubble` `modern-enhanced` `modern-lemmy` `wildlabs-improved` `wildlabs-inspired` `winternord`

## Development

### Badge API (local development)

```bash
npm install           # Install dependencies
npm run dev           # Start with hot reload (nodemon)
npm start             # Start in production mode
node -c badge-api.js  # Syntax check only
```

### Rebuild and restart a single service

```bash
docker compose build badge-api
docker compose up -d badge-api
```

### View logs

```bash
docker compose logs -f              # All services
docker compose logs -f badge-api    # Badge API only
docker compose logs -f proxy        # Nginx proxy
```

### Reset the database

```bash
docker compose down
rm -rf volumes/postgres
docker compose up -d
```

> **Warning:** This deletes all Lemmy data (posts, comments, users) along with badge data. The badge schema and seed data will be re-created from `init.sql` on next startup.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Badge API can't connect to database | Ensure `DB_PASS` in docker-compose matches `POSTGRES_PASSWORD` in `.env` |
| Badges not showing in UI | Check that `badge-injection-dynamic.js` is mounted in the proxy volumes and the Nginx config includes the injection |
| Pictrs permission errors | Run `sudo chown 991:991 volumes/pictrs` |
| `lemmy.hjson` out of sync | Manually update `database.password`, `hostname`, and `pictrs.api_key` to match `.env` |
| SSL certificate errors | Regenerate certs with `openssl req -x509 ...` using `openssl.conf` |
| Port conflicts | Check that ports 80, 443, 3000, 3001, 8080, 8443 are not in use |

## References

- [Lemmy Documentation](https://join-lemmy.org/docs/)
- [Lemmy Docker Install Guide](https://join-lemmy.org/docs/administration/install_docker.html)
- [Alexandrite](https://github.com/sheodox/alexandrite) — alternative Lemmy frontend
- [Pictrs](https://git.asonix.dog/asonix/pict-rs) — image hosting service
