// HAAG Badge System - Dynamic Backend-Driven Version
// Fetches badge data from the badge API backend

(function() {
    'use strict';

    const API_BASE = '';  // Use relative URLs, proxied through nginx
    console.log('🏆 Badge API will use relative URLs through nginx proxy');
    
    // Cache for user badges to avoid repeated API calls
    const badgeCache = new Map();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Badge progress indicators for certain badges
    const progressBadges = ['progress-tracker', 'gamification-expert'];

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
            
            /* Sidebar badges box */
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
            
            .haag-badges-sidebar .card-body {
                padding: 1rem;
            }
            
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
            
            .haag-badge-item:hover {
                transform: translateY(-2px) scale(1.05);
            }
            
            .haag-badge-icon {
                font-size: 14px;
                margin-bottom: 2px;
                display: block;
            }
            
            .haag-badge-name {
                line-height: 1.1;
            }
            
            .haag-loading {
                color: #666;
                font-style: italic;
                font-size: 11px;
            }
            
            .haag-error {
                color: #e74c3c;
                font-size: 11px;
            }
        `;
        document.head.appendChild(style);
    }

    // Fetch user badges from API
    async function fetchUserBadges(username) {
        const cacheKey = username.toLowerCase();
        const cached = badgeCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cacheExpiry) {
            return cached.data;
        }
        
        try {
            const apiUrl = `${API_BASE}/api/badges/user/${username}`;
            console.log(`🏆 Fetching badges from: ${apiUrl}`);
            
            const response = await fetch(apiUrl);
            console.log(`🏆 API Response status:`, response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`🏆 API Response data:`, data);
            
            // Cache the result
            badgeCache.set(cacheKey, {
                data: data.badges || [],
                timestamp: Date.now()
            });
            
            return data.badges || [];
        } catch (error) {
            console.error(`🏆 Failed to fetch badges for ${username}:`, error);
            console.error(`🏆 API URL was: ${API_BASE}/api/badges/user/${username}`);
            return [];
        }
    }

    // Calculate karma from badges (since API karma isn't working yet)
    function calculateKarma(badges) {
        const badgeBonus = badges.reduce((total, badge) => {
            switch(badge.badge_name) {
                case 'HAAG Admin': return total + 500;
                case 'PhD Student': return total + 200;
                case 'Research Pioneer': return total + 150;
                case 'Conservation Hero': return total + 120;
                case 'ML Specialist': return total + 100;
                case 'Tech Innovator': return total + 100;
                case 'Field Expert': return total + 80;
                case 'Data Analyst': return total + 80;
                case 'Community Builder': return total + 60;
                case 'Gamification Expert': return total + 60;
                case 'Mentor': return total + 40;
                case 'Progress Tracker': return total + 40;
                default: return total + 20;
            }
        }, 0);
        
        // For now, return just badge bonus (we'd need upvote data from API later)
        return {
            badge_bonus: badgeBonus,
            total_karma: badgeBonus,
            post_upvotes: 0, // Would come from API
            comment_upvotes: 0 // Would come from API
        };
    }

    // Create badge element from API data
    function createBadge(badgeData, showProgress = false) {
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

    // Create loading placeholder
    function createLoadingPlaceholder() {
        const loadingEl = document.createElement('span');
        loadingEl.className = 'haag-loading';
        loadingEl.textContent = '🏆 Loading badges...';
        return loadingEl;
    }

    // Create error indicator
    function createErrorIndicator() {
        const errorEl = document.createElement('span');
        errorEl.className = 'haag-error';
        errorEl.textContent = '⚠️ Failed to load badges';
        return errorEl;
    }

    // Add badges to user names (async version)
    async function addBadgesToUser(element, username) {
        // We only want sidebar badges on profile pages, no inline badges under usernames
        // This function is kept for compatibility but does nothing
        return;
    }
    
    function addInlineBadges(element, username, badges) {
        // Disabled - we only want sidebar badges, no inline badges under usernames
        return;
    }
    
    async function addProfileBadges(element, username, badges) {
        // Disabled - we only want sidebar badges, no profile header badges
        return;
    }
    
    async function addBadgesSidebar(username, badges) {
        console.log(`🏆 Adding badges sidebar for ${username} with ${badges.length} badges`);
        
        const sidebar = findProfileSidebar();
        console.log('🏆 Found sidebar:', !!sidebar);
        
        if (!sidebar) {
            console.log('🏆 No sidebar found');
            return;
        }
        
        if (sidebar.querySelector('.haag-badges-sidebar')) {
            console.log('🏆 Badge sidebar already exists');
            return;
        }
        
        // Create badges sidebar box
        console.log('🏆 Creating badges sidebar box');
        const badgesBox = await createBadgesSidebarBox(username, badges);
        console.log('🏆 Created badges box:', !!badgesBox);
        
        // Insert the badges box
        const existingBoxes = sidebar.querySelectorAll('.card, .border, .rounded');
        console.log(`🏆 Found ${existingBoxes.length} existing boxes in sidebar`);
        
        if (existingBoxes.length > 0) {
            sidebar.insertBefore(badgesBox, existingBoxes[0]);
        } else {
            sidebar.appendChild(badgesBox);
        }
        
        console.log('🏆 Badge sidebar added successfully');
    }
    
    function findProfileSidebar() {
        const possibleSidebars = [
            document.querySelector('.col-md-4'),
            document.querySelector('.sidebar'),
            document.querySelector('[class*="sidebar"]'),
            document.querySelector('.col-4'),
            document.querySelector('.person-details + div'),
        ].filter(Boolean);
        
        for (const sidebar of possibleSidebars) {
            const text = sidebar.textContent.toLowerCase();
            if (text.includes('moderated') || text.includes('subscribed') || text.includes('communities')) {
                return sidebar;
            }
        }
        
        return possibleSidebars[0] || null;
    }
    
    async function createBadgesSidebarBox(username, badges) {
        // Detect theme colors for the container
        const sidebarSections = document.querySelectorAll('.card, [class*="card"], .bg-dark, [style*="background"]');
        let containerBg = null;
        let containerTextColor = null;
        
        // Get theme colors from CSS variables and computed styles
        const rootStyles = getComputedStyle(document.documentElement);
        const bodyStyles = getComputedStyle(document.body);
        
        // Try to get theme colors from Bootstrap/Lemmy CSS variables
        containerBg = rootStyles.getPropertyValue('--bs-body-bg').trim() ||
                     rootStyles.getPropertyValue('--body-bg').trim() ||
                     rootStyles.getPropertyValue('--background').trim() ||
                     bodyStyles.backgroundColor;
        
        containerTextColor = rootStyles.getPropertyValue('--bs-body-color').trim() ||
                            rootStyles.getPropertyValue('--body-color').trim() ||
                            rootStyles.getPropertyValue('--text-color').trim() ||
                            bodyStyles.color;
        
        // Get border color from theme
        let borderColor = rootStyles.getPropertyValue('--bs-border-color').trim() ||
                         rootStyles.getPropertyValue('--border-color').trim() ||
                         rootStyles.getPropertyValue('--bs-gray-300').trim() ||
                         '#dee2e6';
        
        // If we couldn't get colors from CSS variables, look at existing elements
        if (!containerBg || containerBg === 'rgba(0, 0, 0, 0)' || containerBg === 'transparent') {
            for (const section of sidebarSections) {
                const sectionStyle = getComputedStyle(section);
                const bgColor = sectionStyle.backgroundColor;
                
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    containerBg = bgColor;
                    containerTextColor = sectionStyle.color;
                    break;
                }
            }
        }
        
        console.log('🎨 Theme colors detected:', { containerBg, containerTextColor, borderColor });
        
        const badgesBox = document.createElement('div');
        badgesBox.className = 'haag-badges-sidebar card border mb-3';
        badgesBox.style.cssText = `
            background: ${containerBg} !important;
            color: ${containerTextColor} !important;
            border-color: ${borderColor} !important;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-header';
        header.style.cssText = `
            background: ${containerBg} !important;
            color: ${containerTextColor} !important;
            border-bottom: 1px solid ${borderColor} !important;
        `;
        header.innerHTML = '🏆 Badges & Achievements';
        
        // Create body
        const body = document.createElement('div');
        body.className = 'card-body';
        body.style.cssText = `
            background: ${containerBg} !important;
            color: ${containerTextColor} !important;
        `;
        
        // Add karma display section (will be populated async)
        const karmaDiv = document.createElement('div');
        
        // Use the same theme colors as the container but with accent colors for karma
        let backgroundColor = containerBg;
        let textColor = rootStyles.getPropertyValue('--bs-success').trim() ||
                       rootStyles.getPropertyValue('--success').trim() ||
                       rootStyles.getPropertyValue('--green').trim() ||
                       '#28a745'; // Green accent for karma
        
        // Use the same border color as container
        let karmaBorderColor = borderColor;
        
        console.log('🏆 Detected sidebar colors:', { backgroundColor, textColor, karmaBorderColor });
        
        karmaDiv.style.cssText = `
            background: ${backgroundColor} !important;
            color: ${textColor} !important;
            padding: 16px;
            border-radius: 0.375rem;
            text-align: center;
            margin: 0 0 16px 0;
            border: 1px solid ${karmaBorderColor} !important;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 10 !important;
            width: 100%;
            box-sizing: border-box;
        `;
        karmaDiv.innerHTML = `
            <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
            <div style="position: absolute; bottom: -15px; left: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.3;"></div>
            <div style="position: relative; z-index: 2;">
                <div style="font-size: 32px; font-weight: 800; margin-bottom: 6px; color: inherit; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">⭐ Loading...</div>
                <div style="font-size: 14px; font-weight: 600; opacity: 0.9; color: inherit; letter-spacing: 0.5px;">Total Karma</div>
            </div>
        `;
        body.appendChild(karmaDiv);
        
        // Fetch real karma data from API
        try {
            const karmaResponse = await fetch(`${API_BASE}/api/badges/karma/${username}`);
            if (karmaResponse.ok) {
                const karma = await karmaResponse.json();
                karmaDiv.innerHTML = `
                    <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
                    <div style="position: absolute; bottom: -15px; left: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.3;"></div>
                    <div style="position: relative; z-index: 2;">
                        <div style="font-size: 32px; font-weight: 800; margin-bottom: 6px; color: inherit; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">⭐ ${karma.total_karma}</div>
                        <div style="font-size: 14px; font-weight: 600; opacity: 0.9; color: inherit; letter-spacing: 0.5px;">Total Karma</div>
                        <div style="font-size: 11px; opacity: 0.8; margin-top: 8px; color: inherit; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; display: inline-block;">
                            Badge: ${karma.badge_bonus} • Post: ${karma.post_upvotes} • Comment: ${karma.comment_upvotes}
                        </div>
                    </div>
                `;
            } else {
                // Fallback to client-side calculation
                const karma = calculateKarma(badges);
                karmaDiv.innerHTML = `
                    <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
                    <div style="position: absolute; bottom: -15px; left: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.3;"></div>
                    <div style="position: relative; z-index: 2;">
                        <div style="font-size: 32px; font-weight: 800; margin-bottom: 6px; color: inherit; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">⭐ ${karma.total_karma}</div>
                        <div style="font-size: 14px; font-weight: 600; opacity: 0.9; color: inherit; letter-spacing: 0.5px;">Total Karma (Badge Bonus)</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching karma:', error);
            // Fallback to client-side calculation
            const karma = calculateKarma(badges);
            karmaDiv.innerHTML = `
                <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
                <div style="position: absolute; bottom: -15px; left: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%; opacity: 0.3;"></div>
                <div style="position: relative; z-index: 2;">
                    <div style="font-size: 32px; font-weight: 800; margin-bottom: 6px; color: inherit; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">⭐ ${karma.total_karma}</div>
                    <div style="font-size: 14px; font-weight: 600; opacity: 0.9; color: inherit; letter-spacing: 0.5px;">Total Karma (Badge Bonus)</div>
                </div>
            `;
        }
        
        // Add badges grid
        const badgesGrid = document.createElement('div');
        badgesGrid.className = 'haag-badge-grid';
        
        badges.forEach(badgeData => {
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'haag-badge-item';
            badgeDiv.style.setProperty('--badge-color', badgeData.badge_color);
            badgeDiv.innerHTML = `
                <div class="haag-badge-icon">${badgeData.badge_icon}</div>
                <div class="haag-badge-name">${badgeData.badge_name}</div>
            `;
            badgeDiv.title = `${badgeData.badge_name} - ${badgeData.badge_description}`;
            badgesGrid.appendChild(badgeDiv);
        });
        
        body.appendChild(badgesGrid);
        
        // Add summary stats
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
            <span>🏆 ${badges.length} badges</span>
            <span>📋 ${categoryCount} categories</span>
        `;
        body.appendChild(summaryDiv);
        
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

    // Main function to add badges to all users
    async function addBadgesToUsers() {
        try {
            console.log('🏆 Starting addBadgesToUsers...');
            
            // Only add badges if we're actually on a profile page
            if (!window.location.pathname.includes('/u/')) {
                console.log('🏆 Not on profile page, skipping badge injection');
                return; // Exit early if not on a profile page
            }
            
            // Handle profile pages only
            const match = window.location.pathname.match(/\/u\/([^\/]+)/);
            if (match) {
                const username = match[1];
                console.log(`🏆 Profile page detected for: ${username}`);
                await handleProfilePageBadges(username);
            }
            
            console.log('🏆 Profile badge operations completed');
        } catch (error) {
            console.error('🏆 Error in addBadgesToUsers:', error);
        }
    }
    
    async function handleProfilePageBadges(username) {
        console.log(`🏆 Handling profile page badges for: ${username}`);
        
        try {
            const badges = await fetchUserBadges(username);
            console.log(`🏆 Found ${badges.length} badges for ${username}:`, badges);
            
            // Always try to add sidebar (even if no badges, to show karma)
            await addBadgesSidebar(username, badges);
        } catch (error) {
            console.error(`🏆 Error handling profile badges for ${username}:`, error);
        }
    }

    // Initialize badge system
    function init() {
        try {
            console.log('🏆 HAAG Dynamic Badge System: Initializing...');
            console.log('Current URL:', window.location.href);
            console.log('API Base:', API_BASE);
            
            injectStyles();
            addBadgesToUsers();
            
            console.log('🏆 HAAG Dynamic Badge System: Initial setup complete');
        } catch (error) {
            console.error('🏆 HAAG Badge System Error during init:', error);
        }
        
        // Re-run when new content loads (for SPAs) - disabled temporarily
        /*
        const observer = new MutationObserver(() => {
            console.log('🏆 HAAG Dynamic Badge System: DOM changed, re-scanning for users...');
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
                console.log('🏆 HAAG Dynamic Badge System: Navigation detected to:', lastUrl);
                setTimeout(() => {
                    addBadgesToUsers();
                }, 1000);
            }
        }, 1000);
        */
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run after delays to catch dynamically loaded content
    setTimeout(init, 2000);
    setTimeout(init, 5000);

})();