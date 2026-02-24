-- Lemmy-HAAG Badge System Schema
-- This file runs automatically on first PostgreSQL startup via docker-entrypoint-initdb.d.
-- It is safe to re-run (uses IF NOT EXISTS / OR REPLACE throughout).

-- Badge definitions
CREATE TABLE IF NOT EXISTS badge (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon VARCHAR(10) NOT NULL DEFAULT '',
    color VARCHAR(7) NOT NULL DEFAULT '#2c7a3f',
    category VARCHAR(50) NOT NULL DEFAULT 'community',
    active BOOLEAN NOT NULL DEFAULT true,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_category ON badge(category);
CREATE INDEX IF NOT EXISTS idx_badge_active ON badge(active) WHERE active = true;

-- User-badge relationships
CREATE TABLE IF NOT EXISTS user_badge (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badge(id) ON DELETE CASCADE,
    awarded_by VARCHAR(100),
    reason TEXT,
    visible BOOLEAN NOT NULL DEFAULT true,
    progress INTEGER NOT NULL DEFAULT 100,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(person_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badge_person ON user_badge(person_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_badge ON user_badge(badge_id);

-- View joining badge details with user info
CREATE OR REPLACE VIEW user_badge_details AS
SELECT
    p.name AS username,
    b.name AS badge_name,
    b.description AS badge_description,
    b.icon AS badge_icon,
    b.color AS badge_color,
    b.category AS badge_category,
    ub.awarded_at,
    ub.progress
FROM user_badge ub
JOIN badge b ON ub.badge_id = b.id
JOIN person p ON ub.person_id = p.id
WHERE ub.visible = true AND b.active = true;

-- Karma tracking
CREATE TABLE IF NOT EXISTS user_karma (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL UNIQUE REFERENCES person(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    post_upvotes INTEGER NOT NULL DEFAULT 0,
    comment_upvotes INTEGER NOT NULL DEFAULT 0,
    badge_bonus INTEGER NOT NULL DEFAULT 0,
    total_karma INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_karma_username ON user_karma(username);
CREATE INDEX IF NOT EXISTS idx_user_karma_total ON user_karma(total_karma DESC);

-- Seed default badges (skip if they already exist)
INSERT INTO badge (name, description, icon, color, category) VALUES
    ('Research Pioneer',    'Leading research contributions',                      '🔬', '#2c7a3f', 'research'),
    ('Progress Tracker',    'Consistent progress tracking and reporting',          '📈', '#ff6b35', 'research'),
    ('Data Analyst',        'Data analysis and visualization expertise',           '📊', '#3498db', 'research'),
    ('Mentor',              'Guiding and supporting other researchers',            '👨‍🏫', '#34495e', 'community'),
    ('Community Builder',   'Fostering community engagement and collaboration',    '🤝', '#e74c3c', 'community'),
    ('Tech Innovator',      'Innovative technology contributions',                 '💡', '#f39c12', 'technology'),
    ('Gamification Expert', 'Expertise in gamification and engagement systems',    '🎮', '#9b59b6', 'technology'),
    ('ML Specialist',       'Machine learning and AI expertise',                   '🤖', '#8e44ad', 'technology'),
    ('Conservation Hero',   'Outstanding conservation technology contributions',   '🦋', '#1abc9c', 'conservation'),
    ('Field Expert',        'Extensive field research experience',                 '🌲', '#27ae60', 'conservation'),
    ('HAAG Admin',          'HAAG platform administrator',                         '👑', '#8B0000', 'admin'),
    ('PhD Student',         'Active PhD research student',                         '🐊', '#FF6B00', 'academic')
ON CONFLICT (name) DO NOTHING;
