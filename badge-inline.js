// Compact HAAG Badge System for Inline Injection
(function() {
    'use strict';
    console.log('🏆 HAAG Badge System: Starting inline injection');
    
    // Inject theme-aware CSS
    function injectThemeStyles() {
        if (document.getElementById('haag-inline-badge-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'haag-inline-badge-styles';
        style.textContent = `
            .haag-inline-header {
                background-color: var(--background-light, #f8f9fa) !important;
                border-bottom: 1px solid var(--border-light, #dee2e6) !important;
                padding: 0.75rem 1rem;
                font-weight: 600;
                color: var(--primary-green, #2c7a3f) !important;
            }
            
            .haag-inline-specialization {
                background: linear-gradient(135deg, var(--primary-green, #2c7a3f), var(--primary-light, #4a9d5f)) !important;
                color: white !important;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 12px;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
            }
            
            .haag-inline-level {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding: 8px 12px;
                background: var(--background-light, #f8f9fa) !important;
                border-radius: 6px;
                font-size: 12px;
            }
            
            .haag-inline-level .level-text {
                font-weight: 600;
                color: var(--primary-green, #2c7a3f) !important;
            }
            
            .haag-inline-level .points-text {
                color: var(--text-muted, #666) !important;
            }
            
            .haag-inline-stats {
                border-top: 1px solid var(--border-light, #eee) !important;
                padding-top: 8px;
                font-size: 11px;
                color: var(--text-muted, #666) !important;
                display: flex;
                justify-content: space-between;
            }
        `;
        document.head.appendChild(style);
    }
    
    const badges = {
        'research-pioneer': { name: 'Research Pioneer', icon: '🔬', color: '#2c7a3f' },
        'progress-tracker': { name: 'Progress Tracker', icon: '📈', color: '#ff6b35' },
        'gamification-expert': { name: 'Gamification Expert', icon: '🎮', color: '#9b59b6' },
        'data-analyst': { name: 'Data Analyst', icon: '📊', color: '#3498db' },
        'field-expert': { name: 'Field Expert', icon: '🌲', color: '#27ae60' },
        'tech-innovator': { name: 'Tech Innovator', icon: '💡', color: '#f39c12' },
        'community-builder': { name: 'Community Builder', icon: '🤝', color: '#e74c3c' },
        'mentor': { name: 'Mentor', icon: '👨‍🏫', color: '#34495e' },
        'conservation-hero': { name: 'Conservation Hero', icon: '🦋', color: '#1abc9c' },
        'ml-specialist': { name: 'ML Specialist', icon: '🤖', color: '#8e44ad' },
        'haag-admin': { name: 'HAAG Admin', icon: '👑', color: '#8B0000' },
        'phd-student-gator': { name: 'PhD Student', icon: '🐊', color: '#FF6B00' }
    };

    const userBadges = {
        'dima': ['research-pioneer', 'progress-tracker', 'data-analyst', 'mentor'],
        'leyang': ['gamification-expert', 'tech-innovator', 'community-builder', 'ml-specialist'],
        'jamesthesnake': ['research-pioneer', 'tech-innovator', 'conservation-hero', 'field-expert', 'haag-admin'],
        'charlie': ['phd-student-gator', 'research-pioneer']
    };

    const userSpecializations = {
        'dima': 'Research Progress Tracking',
        'leyang': 'Gamification & Engagement',
        'jamesthesnake': 'Conservation Technology & Administration',
        'charlie': 'PhD Student - Gator Research'
    };

    const userStats = {
        'dima': { level: 'Expert', points: 1250, posts: 15 },
        'leyang': { level: 'Expert', points: 1100, posts: 12 },
        'jamesthesnake': { level: 'Admin', points: 950, posts: 3 },
        'charlie': { level: 'PhD Student', points: 680, posts: 8 }
    };

    function createBadgesSidebarBox(username) {
        const userBadgeList = userBadges[username.toLowerCase()];
        if (!userBadgeList) return null;
        
        const stats = userStats[username.toLowerCase()];
        const specialization = userSpecializations[username.toLowerCase()];
        
        const badgesBox = document.createElement('div');
        badgesBox.className = 'haag-badges-sidebar card mb-3';
        badgesBox.style.cssText = `
            background: var(--card-white, white);
            border: 1px solid var(--border-light, #dee2e6) !important;
            border-radius: var(--radius, 0.375rem);
            margin-bottom: 1rem !important;
            box-shadow: var(--shadow-soft, 0 0.125rem 0.25rem rgba(0,0,0,0.075));
        `;
        
        let content = '<div class="card-header haag-inline-header">🏆 Badges & Achievements</div>';
        content += '<div class="card-body" style="padding: 1rem;">';
        
        if (specialization) {
            content += `<div class="haag-inline-specialization">🎯 ${specialization}</div>`;
        }
        
        if (stats) {
            content += `<div class="haag-inline-level"><span class="level-text">Level: ${stats.level}</span><span class="points-text">${stats.points} pts</span></div>`;
        }
        
        content += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; margin-bottom: 12px;">';
        userBadgeList.forEach(badgeKey => {
            const badge = badges[badgeKey];
            if (badge) {
                content += `<div style="background: ${badge.color}; color: white; padding: 6px 4px; border-radius: 8px; text-align: center; font-size: 10px; font-weight: 600; cursor: help;" title="${badge.name} - Earned through research contributions"><div style="font-size: 14px; margin-bottom: 2px;">${badge.icon}</div><div style="line-height: 1.1;">${badge.name}</div></div>`;
            }
        });
        content += '</div>';
        
        if (stats) {
            content += `<div class="haag-inline-stats"><span>📝 ${stats.posts} posts</span><span>🏆 ${userBadgeList.length} badges</span></div>`;
        }
        
        content += '</div>';
        badgesBox.innerHTML = content;
        return badgesBox;
    }

    function addBadgesIfProfilePage() {
        const urlMatch = window.location.pathname.match(/\/u\/([^\/]+)/);
        if (!urlMatch) return;
        
        const username = urlMatch[1];
        console.log('🏆 Profile page detected for:', username);
        
        if (!userBadges[username.toLowerCase()]) {
            console.log('🏆 No badges for user:', username);
            return;
        }

        // Look for sidebar
        const possibleSidebars = [
            document.querySelector('.col-md-4'),
            document.querySelector('.col-4'),
            document.querySelector('[class*="sidebar"]')
        ].filter(Boolean);
        
        for (const sidebar of possibleSidebars) {
            const text = sidebar.textContent.toLowerCase();
            if (text.includes('moderated') || text.includes('subscribed') || text.includes('communities')) {
                console.log('🏆 Found sidebar, adding badges...');
                
                if (sidebar.querySelector('.haag-badges-sidebar')) {
                    console.log('🏆 Badges already exist');
                    return;
                }
                
                const badgesBox = createBadgesSidebarBox(username);
                if (badgesBox) {
                    const existingBoxes = sidebar.querySelectorAll('.card');
                    if (existingBoxes.length > 0) {
                        sidebar.insertBefore(badgesBox, existingBoxes[0]);
                    } else {
                        sidebar.appendChild(badgesBox);
                    }
                    console.log('🏆 Badges box added successfully!');
                }
                return;
            }
        }
        console.log('🏆 No suitable sidebar found');
    }

    // Initialize
    function init() {
        console.log('🏆 HAAG Badge System: Initializing...');
        injectThemeStyles();
        addBadgesIfProfilePage();
        
        // Re-check when DOM changes
        const observer = new MutationObserver(() => {
            addBadgesIfProfilePage();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Check on navigation changes
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(addBadgesIfProfilePage, 1000);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    setTimeout(init, 2000);
})();