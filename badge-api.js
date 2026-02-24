const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = 3001;

// Database configuration from environment variables
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'lemmy',
    user: process.env.DB_USER || 'lemmy',
    password: process.env.DB_PASS || 'changeme123'
});

const BADGE_API_KEY = process.env.BADGE_API_KEY || '';

// --- Middleware ---

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    });
    next();
});

// Rate limiting — generous for reads, strict for writes
const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/badges', readLimiter);

// --- Helpers ---

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function requireApiKey(req, res, next) {
    if (!BADGE_API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: BADGE_API_KEY not set' });
    }
    const key = req.headers['x-api-key'];
    if (!key || key !== BADGE_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: invalid or missing X-API-Key header' });
    }
    next();
}

function validateUsername(username) {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(username);
}

// --- Routes ---

// Get badges for a specific user
app.get('/api/badges/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!validateUsername(username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }

        const result = await pool.query(`
            SELECT badge_name, badge_description, badge_icon, badge_color,
                   badge_category, awarded_at, progress
            FROM user_badge_details
            WHERE username = $1
            ORDER BY awarded_at DESC
        `, [username]);

        res.json({ username, badges: result.rows });
    } catch (error) {
        console.error('Error fetching user badges:', error.message);
        res.status(500).json({ error: 'Failed to fetch user badges' });
    }
});

// Get all available badges
app.get('/api/badges', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, icon, color, category, created
            FROM badge
            WHERE active = true
            ORDER BY category, name
        `);
        res.json({ badges: result.rows });
    } catch (error) {
        console.error('Error fetching badges:', error.message);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

// Award a badge to a user (requires API key)
app.post('/api/badges/award', writeLimiter, requireApiKey, async (req, res) => {
    try {
        const { username, badge_name, awarded_by, reason } = req.body;

        if (!username || !badge_name) {
            return res.status(400).json({ error: 'username and badge_name are required' });
        }
        if (!validateUsername(username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }
        if (badge_name.length > 100) {
            return res.status(400).json({ error: 'badge_name too long (max 100 chars)' });
        }

        const userResult = await pool.query('SELECT id FROM person WHERE name = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const person_id = userResult.rows[0].id;

        const badgeResult = await pool.query('SELECT id FROM badge WHERE name = $1 AND active = true', [badge_name]);
        if (badgeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Badge not found' });
        }
        const badge_id = badgeResult.rows[0].id;

        await pool.query(`
            INSERT INTO user_badge (person_id, badge_id, awarded_by, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (person_id, badge_id) DO NOTHING
        `, [person_id, badge_id, awarded_by || null, reason || null]);

        res.json({ message: 'Badge awarded successfully' });
    } catch (error) {
        console.error('Error awarding badge:', error.message);
        res.status(500).json({ error: 'Failed to award badge' });
    }
});

// Get user badge statistics including karma
app.get('/api/badges/stats/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!validateUsername(username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }

        const result = await pool.query(`
            SELECT
                COUNT(ubd.*) as total_badges,
                COUNT(CASE WHEN badge_category = 'research' THEN 1 END) as research_badges,
                COUNT(CASE WHEN badge_category = 'community' THEN 1 END) as community_badges,
                COUNT(CASE WHEN badge_category = 'technology' THEN 1 END) as technology_badges,
                COUNT(CASE WHEN badge_category = 'conservation' THEN 1 END) as conservation_badges,
                COUNT(CASE WHEN badge_category = 'admin' THEN 1 END) as admin_badges,
                COUNT(CASE WHEN badge_category = 'academic' THEN 1 END) as academic_badges,
                COALESCE(uk.total_karma, 0) as karma,
                COALESCE(uk.post_upvotes, 0) as post_upvotes,
                COALESCE(uk.comment_upvotes, 0) as comment_upvotes,
                COALESCE(uk.badge_bonus, 0) as badge_bonus
            FROM user_badge_details ubd
            LEFT JOIN user_karma uk ON ubd.username = uk.username
            WHERE ubd.username = $1
            GROUP BY uk.total_karma, uk.post_upvotes, uk.comment_upvotes, uk.badge_bonus
        `, [username]);

        const defaults = {
            total_badges: 0, research_badges: 0, community_badges: 0,
            technology_badges: 0, conservation_badges: 0, admin_badges: 0,
            academic_badges: 0, karma: 0, post_upvotes: 0,
            comment_upvotes: 0, badge_bonus: 0
        };

        res.json({ username, stats: result.rows[0] || defaults });
    } catch (error) {
        console.error('Error fetching user badge stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch badge stats' });
    }
});

// Get user karma
app.get('/api/badges/karma/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!validateUsername(username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }

        const result = await pool.query(`
            SELECT username, post_upvotes, comment_upvotes, badge_bonus, total_karma
            FROM user_karma
            WHERE username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.json({
                username,
                post_upvotes: 0,
                comment_upvotes: 0,
                badge_bonus: 0,
                total_karma: 0
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user karma:', error.message);
        res.status(500).json({ error: 'Failed to fetch karma' });
    }
});

// Refresh karma for a user (requires API key)
app.post('/api/badges/karma/refresh/:username', writeLimiter, requireApiKey, async (req, res) => {
    try {
        const { username } = req.params;
        if (!validateUsername(username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }

        const userResult = await pool.query('SELECT id FROM person WHERE name = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const person_id = userResult.rows[0].id;

        // Count post upvotes received
        const postLikes = await pool.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM post_like pl
            JOIN post p ON pl.post_id = p.id
            WHERE p.creator_id = $1 AND pl.person_id != $1 AND pl.score = 1
        `, [person_id]);

        // Count comment upvotes received
        const commentLikes = await pool.query(`
            SELECT COALESCE(COUNT(*), 0) as count
            FROM comment_like cl
            JOIN comment c ON cl.comment_id = c.id
            WHERE c.creator_id = $1 AND cl.person_id != $1 AND cl.score = 1
        `, [person_id]);

        // Calculate badge bonus
        const badgeBonus = await pool.query(`
            SELECT COALESCE(SUM(
                CASE b.category
                    WHEN 'admin' THEN 500
                    WHEN 'academic' THEN 200
                    WHEN 'research' THEN 150
                    WHEN 'conservation' THEN 100
                    WHEN 'technology' THEN 80
                    WHEN 'community' THEN 60
                    ELSE 20
                END
            ), 0) as bonus
            FROM user_badge ub
            JOIN badge b ON ub.badge_id = b.id
            WHERE ub.person_id = $1 AND b.active = true
        `, [person_id]);

        const post_upvotes = parseInt(postLikes.rows[0].count, 10);
        const comment_upvotes = parseInt(commentLikes.rows[0].count, 10);
        const badge_bonus = parseInt(badgeBonus.rows[0].bonus, 10);
        const total_karma = post_upvotes + comment_upvotes + badge_bonus;

        await pool.query(`
            INSERT INTO user_karma (person_id, username, post_upvotes, comment_upvotes, badge_bonus, total_karma, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (person_id) DO UPDATE SET
                post_upvotes = $3,
                comment_upvotes = $4,
                badge_bonus = $5,
                total_karma = $6,
                updated_at = NOW()
        `, [person_id, username, post_upvotes, comment_upvotes, badge_bonus, total_karma]);

        res.json({ username, post_upvotes, comment_upvotes, badge_bonus, total_karma });
    } catch (error) {
        console.error('Error refreshing karma:', error.message);
        res.status(500).json({ error: 'Failed to refresh karma' });
    }
});

// Get leaderboard with karma
app.get('/api/badges/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

        const result = await pool.query(`
            SELECT
                uk.username,
                p.display_name,
                COALESCE(uk.total_karma, 0) as total_karma,
                COALESCE(uk.post_upvotes, 0) as post_upvotes,
                COALESCE(uk.comment_upvotes, 0) as comment_upvotes,
                COALESCE(uk.badge_bonus, 0) as badge_bonus,
                COUNT(ub.badge_id) as badge_count,
                COUNT(CASE WHEN b.category = 'research' THEN 1 END) as research_badges,
                COUNT(CASE WHEN b.category = 'community' THEN 1 END) as community_badges,
                COUNT(CASE WHEN b.category = 'technology' THEN 1 END) as technology_badges,
                COUNT(CASE WHEN b.category = 'admin' THEN 1 END) as admin_badges
            FROM user_karma uk
            JOIN person p ON uk.person_id = p.id
            LEFT JOIN user_badge ub ON p.id = ub.person_id AND ub.visible = true
            LEFT JOIN badge b ON ub.badge_id = b.id AND b.active = true
            WHERE uk.total_karma > 0
            GROUP BY uk.person_id, uk.username, p.display_name, uk.total_karma,
                     uk.post_upvotes, uk.comment_upvotes, uk.badge_bonus
            ORDER BY uk.total_karma DESC, badge_count DESC
            LIMIT $1
        `, [limit]);

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// User badge display page (HTML)
app.get('/u/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!validateUsername(username)) {
            return res.status(400).send('Invalid username');
        }

        const result = await pool.query(`
            SELECT badge_name, badge_description, badge_icon, badge_color,
                   badge_category, awarded_at, progress
            FROM user_badge_details
            WHERE username = $1
            ORDER BY awarded_at DESC
        `, [username]);

        const stats = await pool.query(`
            SELECT
                COUNT(*) as total_badges,
                COUNT(CASE WHEN badge_category = 'research' THEN 1 END) as research_badges,
                COUNT(CASE WHEN badge_category = 'community' THEN 1 END) as community_badges,
                COUNT(CASE WHEN badge_category = 'technology' THEN 1 END) as technology_badges,
                COUNT(CASE WHEN badge_category = 'conservation' THEN 1 END) as conservation_badges,
                COUNT(CASE WHEN badge_category = 'admin' THEN 1 END) as admin_badges
            FROM user_badge_details
            WHERE username = $1
        `, [username]);

        const badges = result.rows;
        const userStats = stats.rows[0];
        const safeUsername = escapeHtml(username);

        const badgeCards = badges.map(badge => `
            <div class="badge category-${escapeHtml(badge.badge_category)}">
                <div class="badge-header">
                    <div class="badge-icon">${escapeHtml(badge.badge_icon) || '&#127942;'}</div>
                    <div class="badge-info">
                        <h3>${escapeHtml(badge.badge_name)}</h3>
                        <div class="badge-category">${escapeHtml(badge.badge_category)}</div>
                    </div>
                </div>
                <div class="badge-description">${escapeHtml(badge.badge_description)}</div>
                <div class="badge-date">Earned: ${new Date(badge.awarded_at).toLocaleDateString()}</div>
            </div>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeUsername}'s Badges - Lemmy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px;
            background: #f5f5f5; color: #333;
        }
        .container {
            max-width: 1200px; margin: 0 auto;
            background: white; border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1); overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 40px; text-align: center;
        }
        .username { font-size: 2.5rem; font-weight: 700; margin: 0 0 10px 0; }
        .stats {
            display: flex; justify-content: center; gap: 30px;
            margin: 20px 0 0 0; flex-wrap: wrap;
        }
        .stat { text-align: center; }
        .stat-number { font-size: 2rem; font-weight: 700; display: block; }
        .stat-label { font-size: 0.9rem; opacity: 0.9; }
        .content { padding: 40px; }
        .section-title { font-size: 1.5rem; font-weight: 600; margin: 0 0 20px 0; color: #333; }
        .badges-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px; margin: 20px 0;
        }
        .badge {
            background: white; border: 2px solid #e1e5e9;
            border-radius: 12px; padding: 20px;
            transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .badge:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .badge-header { display: flex; align-items: center; margin-bottom: 12px; }
        .badge-icon {
            width: 40px; height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; margin-right: 15px; flex-shrink: 0;
        }
        .badge-info h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #333; }
        .badge-category {
            font-size: 0.8rem; color: #666; text-transform: uppercase;
            letter-spacing: 0.5px; margin: 2px 0 0 0;
        }
        .badge-description { color: #666; font-size: 0.9rem; line-height: 1.5; margin: 10px 0; }
        .badge-date { font-size: 0.8rem; color: #999; margin: 10px 0 0 0; }
        .category-research { border-color: #4CAF50; }
        .category-research .badge-icon { background: #E8F5E8; color: #4CAF50; }
        .category-community { border-color: #2196F3; }
        .category-community .badge-icon { background: #E3F2FD; color: #2196F3; }
        .category-technology { border-color: #FF9800; }
        .category-technology .badge-icon { background: #FFF3E0; color: #FF9800; }
        .category-conservation { border-color: #8BC34A; }
        .category-conservation .badge-icon { background: #F1F8E9; color: #8BC34A; }
        .category-admin { border-color: #9C27B0; }
        .category-admin .badge-icon { background: #F3E5F5; color: #9C27B0; }
        .category-academic { border-color: #FF6B00; }
        .category-academic .badge-icon { background: #FFF3E0; color: #FF6B00; }
        .no-badges { text-align: center; color: #666; font-style: italic; padding: 40px; }
        @media (max-width: 768px) {
            .stats { gap: 15px; }
            .badges-grid { grid-template-columns: 1fr; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="username">@${safeUsername}</h1>
            <div class="stats">
                <div class="stat">
                    <span class="stat-number">${userStats.total_badges}</span>
                    <span class="stat-label">Total Badges</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${userStats.research_badges}</span>
                    <span class="stat-label">Research</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${userStats.community_badges}</span>
                    <span class="stat-label">Community</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${userStats.technology_badges}</span>
                    <span class="stat-label">Technology</span>
                </div>
            </div>
        </div>
        <div class="content">
            <h2 class="section-title">Earned Badges</h2>
            ${badges.length > 0
                ? `<div class="badges-grid">${badgeCards}</div>`
                : `<div class="no-badges">No badges earned yet. Start contributing to earn your first badge!</div>`
            }
        </div>
    </div>
</body>
</html>`;

        res.send(html);
    } catch (error) {
        console.error('Error rendering user badge page:', error.message);
        const safeUsername = escapeHtml(req.params.username);
        res.status(500).send(`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;text-align:center;margin-top:100px;"><h1>Error</h1><p>Unable to load badges for user: ${safeUsername}</p></body></html>`);
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Badge API server running on port ${port}`);
});

// Graceful shutdown
function shutdown() {
    console.log('Shutting down...');
    server.close(() => {
        pool.end().then(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
    setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
