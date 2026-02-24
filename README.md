# Lemmy-HAAG

A gamification and badge system built on [Lemmy](https://join-lemmy.org/), designed for the Georgia Tech HAAG (Habitat-Agnostic AI and Gaming) research group. Recognizes user contributions through badges, karma scoring, and leaderboards.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  Nginx Proxy │────▶│  Lemmy UI    │     │  Alexandrite   │
│  :8080/8443  │     │  :1234       │     │  :3000         │
│  + badge-    │     └──────┬───────┘     └───────┬────────┘
│  injection.js│            │                     │
└──────┬───────┘     ┌──────▼───────┐     ┌───────▼────────┐
       │             │  Lemmy Core  │     │  Alex Proxy    │
       │             │  :8536       │     │  :80/443       │
       │             └──────┬───────┘     └────────────────┘
       │                    │
┌──────▼───────┐     ┌──────▼───────┐     ┌────────────────┐
│  Badge API   │────▶│  PostgreSQL  │     │  Pictrs        │
│  :3001       │     │  :5432       │     │  (images)      │
└──────────────┘     └──────────────┘     └────────────────┘
```

## Quick Start

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values (hostname, passwords, API key)
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **Access the platform:**
   - Lemmy UI: `http://your-host:8080`
   - Alexandrite UI: `http://your-host`
   - Badge API: `http://your-host:3001`
   - Custom frontend: `http://your-host:3000`

## Badge API Reference

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/badges` | List all active badges |
| `GET` | `/api/badges/user/:username` | Get a user's badges |
| `GET` | `/api/badges/stats/:username` | Get badge stats + karma |
| `GET` | `/api/badges/karma/:username` | Get karma breakdown |
| `GET` | `/api/badges/leaderboard` | Top users by karma (default 20, max 100) |
| `GET` | `/u/:username` | Badge display page (HTML) |
| `GET` | `/health` | Health check |

### Authenticated Endpoints (require `X-API-Key` header)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/badges/award` | Award a badge to a user |
| `POST` | `/api/badges/karma/refresh/:username` | Recalculate user karma |

**Award a badge:**
```bash
curl -X POST http://localhost:3001/api/badges/award \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"username": "alice", "badge_name": "Research Pioneer", "awarded_by": "admin", "reason": "First paper published"}'
```

**Refresh karma:**
```bash
curl -X POST http://localhost:3001/api/badges/karma/refresh/alice \
  -H "X-API-Key: your-api-key"
```

## Configuration

All configuration is managed through the `.env` file:

| Variable | Description |
|----------|-------------|
| `HOSTNAME` | Server IP or domain name |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `PICTRS_API_KEY` | Pictrs image service API key |
| `BADGE_API_KEY` | API key for protected badge endpoints |
| `NODE_ENV` | Node environment (default: production) |

> **Note:** `lemmy.hjson` does not support environment variable interpolation. Update it manually to match your `.env` values.

## Badge Categories

| Category | Bonus Karma | Badges |
|----------|------------|--------|
| Admin | 500 | HAAG Admin |
| Academic | 200 | PhD Student |
| Research | 150 | Research Pioneer, Progress Tracker, Data Analyst |
| Conservation | 100 | Conservation Hero, Field Expert |
| Technology | 80 | Tech Innovator, Gamification Expert, ML Specialist |
| Community | 60 | Mentor, Community Builder |

## Database

The schema is automatically initialized on first PostgreSQL startup via `init.sql`. Tables:

- `badge` — badge definitions (name, icon, color, category)
- `user_badge` — user-badge relationships with award metadata
- `user_badge_details` — view joining badges with user info
- `user_karma` — karma scores (post upvotes + comment upvotes + badge bonus)

## Development

```bash
# Install dependencies
npm install

# Run with hot reload
npm run dev

# Syntax check
node -c badge-api.js
```
