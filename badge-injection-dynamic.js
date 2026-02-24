// HAAG Badge System - Dynamic Backend-Driven Version
// Fetches badge data from the badge API backend

(function() {
    'use strict';

    const API_BASE = '';  // Relative URLs, proxied through nginx
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const badgeCache = new Map();

    // --- Styles ---

    function injectStyles() {
        if (document.getElementById('haag-badge-styles')) return;

        const style = document.createElement('style');
        style.id = 'haag-badge-styles';
        style.textContent = `
            .haag-badges-sidebar {
                background: var(--card-white, white);
                border: 1px solid var(--border-light, #dee2e6) !important;
                border-radius: var(--radius, 0.375rem);
                margin-bottom: 1rem;
                box-shadow: var(--shadow-soft, 0 0.125rem 0.25rem rgba(0,0,0,0.075));
            }
            .haag-badges-sidebar .card-header {
                background-color: var(--background-light, #f8f9fa);
                border-bottom: 1px solid var(--border-light, #dee2e6);
                padding: 0.75rem 1rem;
                font-weight: 600;
                color: var(--primary-green, #2c7a3f);
            }
            .haag-badges-sidebar .card-body { padding: 1rem; }
            .haag-badge-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 8px;
                margin-bottom: 12px;
            }
            .haag-badge-item {
                background: var(--badge-color, #2c7a3f);
                color: white;
                padding: 6px 4px;
                border-radius: 8px;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                cursor: help;
                transition: transform 0.2s ease;
            }
            .haag-badge-item:hover { transform: translateY(-2px) scale(1.05); }
            .haag-badge-icon { font-size: 14px; margin-bottom: 2px; display: block; }
            .haag-badge-name { line-height: 1.1; }
        `;
        document.head.appendChild(style);
    }

    // --- API ---

    async function fetchUserBadges(username) {
        const cacheKey = username.toLowerCase();
        const cached = badgeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }

        try {
            const response = await fetch(`${API_BASE}/api/badges/user/${username}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const badges = data.badges || [];
            badgeCache.set(cacheKey, { data: badges, timestamp: Date.now() });
            return badges;
        } catch (error) {
            console.error(`Badge API error for ${username}:`, error.message);
            return [];
        }
    }

    async function fetchKarma(username) {
        try {
            const response = await fetch(`${API_BASE}/api/badges/karma/${username}`);
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    }

    // --- Karma HTML builder ---

    function buildKarmaHtml(karma) {
        const total = karma ? karma.total_karma : 0;
        const badge = karma ? karma.badge_bonus : 0;
        const post = karma ? karma.post_upvotes : 0;
        const comment = karma ? karma.comment_upvotes : 0;
        const label = karma ? 'Total Karma' : 'Total Karma';

        return `
            <div style="font-size: 32px; font-weight: 800; margin-bottom: 6px; color: inherit;">
                &#11088; ${total}
            </div>
            <div style="font-size: 14px; font-weight: 600; opacity: 0.9; color: inherit; letter-spacing: 0.5px;">
                ${label}
            </div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 8px; color: inherit; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; display: inline-block;">
                Badge: ${badge} &bull; Post: ${post} &bull; Comment: ${comment}
            </div>
        `;
    }

    // --- DOM helpers ---

    function getThemeColors() {
        const root = getComputedStyle(document.documentElement);
        const body = getComputedStyle(document.body);

        let bg = root.getPropertyValue('--bs-body-bg').trim() ||
                 root.getPropertyValue('--body-bg').trim() ||
                 body.backgroundColor;

        let text = root.getPropertyValue('--bs-body-color').trim() ||
                   root.getPropertyValue('--body-color').trim() ||
                   body.color;

        let border = root.getPropertyValue('--bs-border-color').trim() ||
                     root.getPropertyValue('--border-color').trim() ||
                     '#dee2e6';

        let accent = root.getPropertyValue('--bs-success').trim() ||
                     root.getPropertyValue('--success').trim() ||
                     '#28a745';

        // Fallback: scan existing sidebar elements
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            const cards = document.querySelectorAll('.card, [class*="card"], .bg-dark');
            for (const el of cards) {
                const s = getComputedStyle(el);
                if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    bg = s.backgroundColor;
                    text = s.color;
                    break;
                }
            }
        }

        return { bg, text, border, accent };
    }

    function findProfileSidebar() {
        const candidates = [
            document.querySelector('.col-md-4'),
            document.querySelector('.sidebar'),
            document.querySelector('[class*="sidebar"]'),
            document.querySelector('.col-4'),
            document.querySelector('.person-details + div'),
        ].filter(Boolean);

        for (const el of candidates) {
            const t = el.textContent.toLowerCase();
            if (t.includes('moderated') || t.includes('subscribed') || t.includes('communities')) {
                return el;
            }
        }
        return candidates[0] || null;
    }

    // --- Sidebar badge box ---

    async function createBadgesSidebarBox(username, badges) {
        const colors = getThemeColors();

        const box = document.createElement('div');
        box.className = 'haag-badges-sidebar card border mb-3';
        box.style.cssText = `background:${colors.bg}!important;color:${colors.text}!important;border-color:${colors.border}!important;`;

        // Header
        const header = document.createElement('div');
        header.className = 'card-header';
        header.style.cssText = `background:${colors.bg}!important;color:${colors.text}!important;border-bottom:1px solid ${colors.border}!important;`;
        header.textContent = '\uD83C\uDFC6 Badges & Achievements';

        // Body
        const body = document.createElement('div');
        body.className = 'card-body';
        body.style.cssText = `background:${colors.bg}!important;color:${colors.text}!important;`;

        // Karma section
        const karmaDiv = document.createElement('div');
        karmaDiv.style.cssText = `
            background:${colors.bg}!important;color:${colors.accent}!important;
            padding:16px;border-radius:0.375rem;text-align:center;
            margin:0 0 16px 0;border:1px solid ${colors.border}!important;
        `;
        karmaDiv.innerHTML = buildKarmaHtml(null);
        body.appendChild(karmaDiv);

        // Fetch real karma asynchronously
        fetchKarma(username).then(karma => {
            if (karma) karmaDiv.innerHTML = buildKarmaHtml(karma);
        });

        // Badge grid
        const grid = document.createElement('div');
        grid.className = 'haag-badge-grid';
        badges.forEach(b => {
            const item = document.createElement('div');
            item.className = 'haag-badge-item';
            item.style.setProperty('--badge-color', b.badge_color);
            item.innerHTML = `<div class="haag-badge-icon">${b.badge_icon}</div><div class="haag-badge-name">${b.badge_name}</div>`;
            item.title = `${b.badge_name} - ${b.badge_description}`;
            grid.appendChild(item);
        });
        body.appendChild(grid);

        // Summary
        const summary = document.createElement('div');
        summary.style.cssText = 'border-top:1px solid var(--border-light,#eee);padding-top:8px;font-size:11px;color:var(--text-muted,#666);display:flex;justify-content:space-between;';
        const categories = new Set(badges.map(b => b.badge_category)).size;
        summary.innerHTML = `<span>\uD83C\uDFC6 ${badges.length} badges</span><span>\uD83D\uDCCB ${categories} categories</span>`;
        body.appendChild(summary);

        box.appendChild(header);
        box.appendChild(body);
        return box;
    }

    async function addBadgesSidebar(username, badges) {
        const sidebar = findProfileSidebar();
        if (!sidebar || sidebar.querySelector('.haag-badges-sidebar')) return;

        const box = await createBadgesSidebarBox(username, badges);
        const existing = sidebar.querySelectorAll('.card, .border, .rounded');
        if (existing.length > 0) {
            sidebar.insertBefore(box, existing[0]);
        } else {
            sidebar.appendChild(box);
        }
    }

    // --- Page handler ---

    async function handleProfilePage() {
        if (!window.location.pathname.includes('/u/')) return;
        const match = window.location.pathname.match(/\/u\/([^\/]+)/);
        if (!match) return;

        const username = match[1];
        const badges = await fetchUserBadges(username);
        await addBadgesSidebar(username, badges);
    }

    // --- Initialization ---

    let currentUrl = location.href;

    function onNavigate() {
        if (location.href === currentUrl) return;
        currentUrl = location.href;
        // Small delay to let the SPA render new content
        setTimeout(handleProfilePage, 500);
    }

    function init() {
        injectStyles();
        handleProfilePage();

        // Detect SPA navigation via History API
        const origPushState = history.pushState;
        const origReplaceState = history.replaceState;
        history.pushState = function() {
            origPushState.apply(this, arguments);
            onNavigate();
        };
        history.replaceState = function() {
            origReplaceState.apply(this, arguments);
            onNavigate();
        };
        window.addEventListener('popstate', onNavigate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Single retry for late-loading content
    setTimeout(handleProfilePage, 3000);
})();
