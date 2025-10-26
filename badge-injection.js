// HAAG Badge System - Injects badges into Lemmy UI and Alexandrite
// Specializations: Dima (Research Progress Tracking), Leyang (Gamification)

(function() {
    'use strict';

    const API_BASE = 'http://134.199.214.141:3001';
    
    // Cache for user badges to avoid repeated API calls
    const badgeCache = new Map();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes

    // Inject CSS styles
    function injectStyles() {
        if (document.getElementById('haag-badge-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'haag-badge-styles';
        style.textContent = `
            .haag-badge {
                display: inline-block;
                padding: 3px 6px;
                margin: 0 2px;
                border-radius: var(--radius, 12px);
                font-size: 11px;
                font-weight: 600;
                color: white;
                text-decoration: none !important;
                cursor: help;
                vertical-align: middle;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .haag-badge:hover {
                transform: translateY(-1px);
                box-shadow: var(--shadow-hover, 0 2px 8px rgba(0,0,0,0.2));
            }
            
            .haag-user-level {
                display: inline-block;
                padding: 2px 8px;
                margin-left: 8px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 600;
                background: linear-gradient(135deg, var(--accent-orange, #ff6b35), var(--accent-orange, #ff8c42));
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .haag-specialization {
                display: block;
                font-size: 11px;
                color: var(--text-muted, #666);
                font-style: italic;
                margin-top: 2px;
            }
            
            .haag-user-stats {
                display: inline-block;
                margin-left: 8px;
                font-size: 11px;
                color: var(--text-muted, #888);
            }
            
            .haag-progress-indicator {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--accent-orange, #ff6b35);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 107, 53, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
            }
            
            .haag-leaderboard {
                position: fixed;
                top: 100px;
                right: 20px;
                background: var(--card-white, white);
                border-radius: var(--radius, 12px);
                padding: 16px;
                box-shadow: var(--shadow-soft, 0 4px 20px rgba(0,0,0,0.1));
                z-index: 1000;
                max-width: 250px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 1px solid var(--border-light, #e8f4ea);
            }
            
            .haag-leaderboard h3 {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: var(--primary-green, #2c7a3f);
                font-weight: 700;
            }
            
            .haag-leaderboard-item {
                display: flex;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--border-light, #eee);
                font-size: 12px;
            }
            
            .haag-leaderboard-item:last-child {
                border-bottom: none;
            }
            
            .haag-leaderboard-rank {
                font-weight: 700;
                color: var(--primary-green, #2c7a3f);
                width: 20px;
            }
            
            .haag-leaderboard-name {
                flex: 1;
                margin-left: 8px;
                color: var(--text-dark, #2d3436);
            }
            
            .haag-leaderboard-points {
                font-weight: 600;
                color: var(--text-muted, #666);
            }
            
            /* Alexandrite specific adjustments */
            .alexandrite .haag-badge {
                font-size: 10px;
                padding: 2px 5px;
            }
            
            /* Lemmy UI specific adjustments */
            .lemmy-ui .haag-badge {
                margin-left: 4px;
            }
            
            /* Profile page specific styles */
            .haag-profile-badges {
                background: var(--background-light, rgba(44, 122, 63, 0.05));
                border-radius: var(--radius, 8px);
                padding: 12px;
                border-left: 4px solid var(--primary-green, #2c7a3f);
                margin: 16px 0;
                border: 1px solid var(--border-light, #e8f4ea);
            }
            
            .haag-profile-badges .haag-badge {
                font-size: 12px !important;
                padding: 6px 10px !important;
                margin: 3px !important;
                border-radius: 15px !important;
            }
            
            .haag-user-stats-detailed {
                font-weight: 500 !important;
                background: var(--card-white, rgba(255, 255, 255, 0.7));
                padding: 8px;
                border-radius: 6px;
                margin-top: 8px !important;
                color: var(--text-dark, #2d3436);
            }
            
            .haag-specialization {
                font-weight: 600 !important;
                color: var(--primary-green, #2c7a3f) !important;
                background: var(--background-light, rgba(44, 122, 63, 0.1));
                padding: 4px 8px;
                border-radius: 4px;
                display: inline-block;
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // Fetch user badges from API
    async function fetchUserBadges(username) {
        const cacheKey = username.toLowerCase();
        
        // Check cache first
        if (badgeCache.has(cacheKey)) {
            const cached = badgeCache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheExpiry) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/badges/user/${username}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            badgeCache.set(cacheKey, {
                data: data.badges || [],
                timestamp: Date.now()
            });
            
            return data.badges || [];
        } catch (error) {
            console.warn(`Failed to fetch badges for ${username}:`, error);
            return [];
        }
    }

    // Create badge element from API data
    function createBadge(badgeData, showProgress = false) {
        if (!badgeData) return null;
        
        const badgeEl = document.createElement('span');
        badgeEl.className = 'haag-badge';
        badgeEl.style.backgroundColor = badgeData.badge_color;
        badgeEl.textContent = `${badgeData.badge_icon} ${badgeData.badge_name}`;
        badgeEl.title = `${badgeData.badge_name} - ${badgeData.badge_description}`;
        
        if (showProgress && badgeData.progress < 100) {
            const indicator = document.createElement('div');
            indicator.className = 'haag-progress-indicator';
            badgeEl.appendChild(indicator);
        }
        
        return badgeEl;
    }


    // Add badges to user names - ONLY on profile pages
    function addBadgesToUsers() {
        // Only add badges if we're actually on a profile page
        if (!window.location.pathname.includes('/u/')) {
            return; // Exit early if not on a profile page
        }
        
        // Special handling for profile pages - look for the profile title
        handleProfilePageBadges();
    }
    
    function handleProfilePageBadges() {
        // Look for profile page patterns and add badges
        const profilePatterns = [
            // Check URL for profile page
            () => {
                const match = window.location.pathname.match(/\/u\/([^\/]+)/);
                if (match) {
                    const username = match[1];
                    addBadgesToProfilePage(username);
                }
            }
        ];
        
        profilePatterns.forEach(pattern => pattern());
    }
    
    async function addBadgesToProfilePage(username) {
        console.log('🏆 Adding badges to profile page for:', username);
        
        try {
            const badges = await fetchUserBadges(username);
            if (!badges || badges.length === 0) {
                console.log('🏆 No badges found for user:', username);
                return;
            }
            
            console.log('🏆 User badges:', badges);
            
            // Try to add badges to sidebar first
            console.log('🏆 Attempting to add sidebar badges...');
            await addBadgesSidebar(username, badges);
            
        } catch (error) {
            console.error('🏆 Error adding badges to profile page:', error);
        }
    }
    
    async function addBadgesSidebar(username, badges) {
        // Look for the sidebar that contains "Moderated" and "Subscribed" boxes
        console.log('🏆 Looking for profile sidebar...');
        const sidebar = findProfileSidebar();
        if (!sidebar) {
            console.log('🏆 No sidebar found');
            return;
        }
        
        console.log('🏆 Found sidebar:', sidebar);
        
        // Check if badges box already exists
        if (sidebar.querySelector('.haag-badges-sidebar')) {
            console.log('🏆 Badges box already exists');
            return;
        }
        
        // Create badges sidebar box
        console.log('🏆 Creating badges sidebar box...');
        const badgesBox = await createBadgesSidebarBox(username, badges);
        
        // Insert the badges box - try to put it first, or after other boxes
        const existingBoxes = sidebar.querySelectorAll('.card, .border, .rounded');
        console.log('🏆 Found existing boxes:', existingBoxes.length);
        
        if (existingBoxes.length > 0) {
            // Insert before the first existing box
            console.log('🏆 Inserting badges box before first existing box');
            sidebar.insertBefore(badgesBox, existingBoxes[0]);
        } else {
            // If no existing boxes found, append to sidebar
            console.log('🏆 Appending badges box to sidebar');
            sidebar.appendChild(badgesBox);
        }
        
        console.log('🏆 Badges sidebar box added successfully');
    }
    
    function findProfileSidebar() {
        // Try different selectors to find the sidebar
        const possibleSidebars = [
            document.querySelector('.col-md-4'), // Bootstrap sidebar column
            document.querySelector('.sidebar'), // Generic sidebar
            document.querySelector('[class*="sidebar"]'), // Any element with sidebar in class
            document.querySelector('.col-4'), // Another possible sidebar column
            document.querySelector('.person-details + div'), // Div after person details
        ].filter(Boolean);
        
        // Look for the one that contains "Moderated" or "Subscribed" text
        for (const sidebar of possibleSidebars) {
            const text = sidebar.textContent.toLowerCase();
            if (text.includes('moderated') || text.includes('subscribed') || text.includes('communities')) {
                return sidebar;
            }
        }
        
        // If not found, try to find any right column
        return possibleSidebars[0] || null;
    }
    
    async function createBadgesSidebarBox(username, badges) {
        const badgesBox = document.createElement('div');
        badgesBox.className = 'haag-badges-sidebar card border mb-3';
        badgesBox.style.cssText = `
            background: var(--card-white, white);
            border: 1px solid var(--border-light, #dee2e6) !important;
            border-radius: var(--radius, 0.375rem);
            margin-bottom: 1rem;
            box-shadow: var(--shadow-soft, 0 0.125rem 0.25rem rgba(0,0,0,0.075));
        `;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-header';
        header.style.cssText = `
            background-color: var(--background-light, #f8f9fa);
            border-bottom: 1px solid var(--border-light, #dee2e6);
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--primary-green, #2c7a3f);
        `;
        header.innerHTML = '🏆 Badges & Achievements';
        
        // Create body
        const body = document.createElement('div');
        body.className = 'card-body';
        body.style.cssText = 'padding: 1rem;';
        
        // Calculate badge statistics
        const categoryStats = badges.reduce((acc, badge) => {
            acc[badge.badge_category] = (acc[badge.badge_category] || 0) + 1;
            return acc;
        }, {});
        
        const totalBadges = badges.length;
        
        // Add user level based on badges
        if (totalBadges > 0) {
            const level = totalBadges >= 5 ? 'Expert' : totalBadges >= 3 ? 'Advanced' : 'Member';
            const levelDiv = document.createElement('div');
            levelDiv.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding: 8px 12px;
                background: var(--background-light, #f8f9fa);
                border-radius: 6px;
                font-size: 12px;
            `;
            levelDiv.innerHTML = `
                <span style="font-weight: 600; color: var(--primary-green, #2c7a3f);">Level: ${level}</span>
                <span style="color: var(--text-muted, #666);">${totalBadges} badges</span>
            `;
            body.appendChild(levelDiv);
        }
        
        // Add badges grid
        const badgesGrid = document.createElement('div');
        badgesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: 8px;
            margin-bottom: 12px;
        `;
        
        badges.forEach(badge => {
            const badgeDiv = document.createElement('div');
            badgeDiv.style.cssText = `
                background: ${badge.badge_color};
                color: white;
                padding: 6px 4px;
                border-radius: 8px;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                cursor: help;
                transition: transform 0.2s ease;
            `;
            badgeDiv.innerHTML = `
                <div style="font-size: 14px; margin-bottom: 2px;">${badge.badge_icon}</div>
                <div style="line-height: 1.1;">${badge.badge_name}</div>
            `;
            badgeDiv.title = `${badge.badge_name} - ${badge.badge_description}`;
            
            badgeDiv.addEventListener('mouseenter', () => {
                badgeDiv.style.transform = 'translateY(-2px) scale(1.05)';
            });
            badgeDiv.addEventListener('mouseleave', () => {
                badgeDiv.style.transform = 'none';
            });
            
            badgesGrid.appendChild(badgeDiv);
        });
        
        body.appendChild(badgesGrid);
        
        // Add summary stats
        if (totalBadges > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.style.cssText = `
                border-top: 1px solid var(--border-light, #eee);
                padding-top: 8px;
                font-size: 11px;
                color: var(--text-muted, #666);
                display: flex;
                justify-content: space-between;
            `;
            
            const categoryCount = [...new Set(badges.map(b => b.badge_category))].length;
            summaryDiv.innerHTML = `
                <span>📊 ${categoryCount} categories</span>
                <span>🏆 ${totalBadges} badges</span>
            `;
            body.appendChild(summaryDiv);
        }
        
        badgesBox.appendChild(header);
        badgesBox.appendChild(body);
        
        return badgesBox;
    }

    // Extract username from various element types
    function extractUsername(element) {
        let username = '';
        
        // Try href attribute
        if (element.href) {
            const match = element.href.match(/\/u\/([^\/\?#]+)/);
            if (match) username = match[1];
        }
        
        // Try text content
        if (!username) {
            username = element.textContent.trim().replace('@', '');
        }
        
        return username;
    }

    // Create leaderboard widget
    async function createLeaderboard() {
        if (document.getElementById('haag-leaderboard')) return;
        
        const leaderboard = document.createElement('div');
        leaderboard.id = 'haag-leaderboard';
        leaderboard.className = 'haag-leaderboard';
        
        try {
            const response = await fetch(`${API_BASE}/api/badges/leaderboard`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const leaderboardData = data.leaderboard || [];
            
            leaderboard.innerHTML = `
                <h3>🏆 Research Leaders</h3>
                ${leaderboardData.map((user, index) => `
                    <div class="haag-leaderboard-item">
                        <div class="haag-leaderboard-rank">${index + 1}</div>
                        <div class="haag-leaderboard-name">${user.username}</div>
                        <div class="haag-leaderboard-points">${user.badge_count}</div>
                    </div>
                `).join('')}
            `;
        } catch (error) {
            console.warn('Failed to fetch leaderboard:', error);
            leaderboard.innerHTML = `
                <h3>🏆 Research Leaders</h3>
                <div style="text-align: center; color: #666; font-size: 11px; padding: 10px;">
                    Unable to load leaderboard
                </div>
            `;
        }
        
        document.body.appendChild(leaderboard);
        
        // Auto-hide after 10 seconds, show on hover
        setTimeout(() => {
            leaderboard.style.opacity = '0.3';
            leaderboard.style.transform = 'translateX(200px)';
        }, 10000);
        
        leaderboard.addEventListener('mouseenter', () => {
            leaderboard.style.opacity = '1';
            leaderboard.style.transform = 'translateX(0)';
        });
        
        leaderboard.addEventListener('mouseleave', () => {
            leaderboard.style.opacity = '0.3';
            leaderboard.style.transform = 'translateX(200px)';
        });
    }

    // Initialize badge system
    function init() {
        console.log('🏆 HAAG Badge System: Initializing...');
        console.log('Current URL:', window.location.href);
        
        injectStyles();
        addBadgesToUsers();
        
        // Only show leaderboard on profile pages
        if (window.location.pathname.includes('/u/')) {
            createLeaderboard().catch(console.error);
        }
        
        console.log('🏆 HAAG Badge System: Initial setup complete');
        
        // Re-run when new content loads (for SPAs)
        const observer = new MutationObserver(() => {
            console.log('🏆 HAAG Badge System: DOM changed, re-scanning for users...');
            addBadgesToUsers();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also run on navigation changes
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('🏆 HAAG Badge System: Navigation detected to:', lastUrl);
                setTimeout(() => {
                    addBadgesToUsers();
                    // Also create leaderboard if navigating to a profile page
                    if (location.href.includes('/u/') && !document.getElementById('haag-leaderboard')) {
                        createLeaderboard().catch(console.error);
                    }
                    // Remove leaderboard if navigating away from profile pages
                    else if (!location.href.includes('/u/')) {
                        const leaderboard = document.getElementById('haag-leaderboard');
                        if (leaderboard) {
                            leaderboard.remove();
                        }
                    }
                }, 1000);
            }
        }, 1000);
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run after a delay to catch dynamically loaded content
    setTimeout(init, 2000);
    setTimeout(init, 5000);

})();