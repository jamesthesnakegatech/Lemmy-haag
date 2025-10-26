const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

// Database configuration
const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'lemmy',
    user: 'lemmy',
    password: 'changeme123'
});

// Middleware
app.use(cors());
app.use(express.json());

// Get badges for a specific user
app.get('/api/badges/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const result = await pool.query(`
            SELECT 
                badge_name,
                badge_description,
                badge_icon,
                badge_color,
                badge_category,
                awarded_at,
                progress
            FROM user_badge_details 
            WHERE username = $1
            ORDER BY awarded_at DESC
        `, [username]);
        
        res.json({
            username,
            badges: result.rows
        });
    } catch (error) {
        console.error('Error fetching user badges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all available badges
app.get('/api/badges', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                name,
                description,
                icon,
                color,
                category,
                created
            FROM badge 
            WHERE active = true
            ORDER BY category, name
        `);
        
        res.json({
            badges: result.rows
        });
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Award a badge to a user
app.post('/api/badges/award', async (req, res) => {
    try {
        const { username, badge_name, awarded_by, reason } = req.body;
        
        // Get user ID
        const userResult = await pool.query('SELECT id FROM person WHERE name = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const person_id = userResult.rows[0].id;
        
        // Get badge ID
        const badgeResult = await pool.query('SELECT id FROM badge WHERE name = $1 AND active = true', [badge_name]);
        if (badgeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Badge not found' });
        }
        const badge_id = badgeResult.rows[0].id;
        
        // Award the badge
        await pool.query(`
            INSERT INTO user_badge (person_id, badge_id, awarded_by, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (person_id, badge_id) DO NOTHING
        `, [person_id, badge_id, awarded_by, reason]);
        
        res.json({ message: 'Badge awarded successfully' });
    } catch (error) {
        console.error('Error awarding badge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user badge statistics including karma
app.get('/api/badges/stats/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
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
        
        res.json({
            username,
            stats: result.rows[0] || {
                total_badges: 0,
                research_badges: 0,
                community_badges: 0,
                technology_badges: 0,
                conservation_badges: 0,
                admin_badges: 0,
                academic_badges: 0,
                karma: 0,
                post_upvotes: 0,
                comment_upvotes: 0,
                badge_bonus: 0
            }
        });
    } catch (error) {
        console.error('Error fetching user badge stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user karma
app.get('/api/badges/karma/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const result = await pool.query(`
            SELECT 
                username,
                post_upvotes,
                comment_upvotes,
                badge_bonus,
                total_karma
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
        console.error('Error fetching user karma:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard with karma
app.get('/api/badges/leaderboard', async (req, res) => {
    try {
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
            LIMIT 20
        `);
        
        res.json({
            leaderboard: result.rows
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User badge display page
app.get('/u/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const result = await pool.query(`
            SELECT 
                badge_name,
                badge_description,
                badge_icon,
                badge_color,
                badge_category,
                awarded_at,
                progress
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
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${username}'s Badges - Lemmy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .username {
            font-size: 2.5rem;
            font-weight: 700;
            margin: 0 0 10px 0;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0 0 0;
            flex-wrap: wrap;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            display: block;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 20px 0;
            color: #333;
        }
        .badges-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .badge {
            background: white;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .badge-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        .badge-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-right: 15px;
            flex-shrink: 0;
        }
        .badge-info h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
        }
        .badge-category {
            font-size: 0.8rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 2px 0 0 0;
        }
        .badge-description {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 10px 0;
        }
        .badge-date {
            font-size: 0.8rem;
            color: #999;
            margin: 10px 0 0 0;
        }
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
        .no-badges {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px;
        }
        @media (max-width: 768px) {
            .stats {
                gap: 15px;
            }
            .badges-grid {
                grid-template-columns: 1fr;
            }
            .header {
                padding: 30px 20px;
            }
            .content {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="username">@${username}</h1>
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
            ${badges.length > 0 ? `
                <div class="badges-grid">
                    ${badges.map(badge => `
                        <div class="badge category-${badge.badge_category}">
                            <div class="badge-header">
                                <div class="badge-icon">${badge.badge_icon || '🏆'}</div>
                                <div class="badge-info">
                                    <h3>${badge.badge_name}</h3>
                                    <div class="badge-category">${badge.badge_category}</div>
                                </div>
                            </div>
                            <div class="badge-description">${badge.badge_description || ''}</div>
                            <div class="badge-date">Earned: ${new Date(badge.awarded_at).toLocaleDateString()}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="no-badges">
                    No badges earned yet. Start contributing to earn your first badge!
                </div>
            `}
        </div>
    </div>
</body>
</html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Error rendering user badge page:', error);
        res.status(500).send(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h1>Error</h1>
                    <p>Unable to load badges for user: ${req.params.username}</p>
                </body>
            </html>
        `);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Badge API server running on port ${port}`);
});