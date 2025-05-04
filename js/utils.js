// Utility functions for Brain Hope Admin Dashboard

/**
 * Extract roles from a user object
 * @param {Object} user - The user object
 * @returns {Array} - Array of role names
 */
function extractUserRoles(user) {
    let userRoles = [];

    if (!user) return userRoles;

    // Check for roles in different formats
    if (user.roles && Array.isArray(user.roles)) {
        userRoles = user.roles.map(role => {
            if (typeof role === 'string') return role;
            return role.name || role.roleName || role.id || role;
        }).filter(Boolean);
    } else if (user.role) {
        const roleName = typeof user.role === 'string' ? user.role : user.role.name || user.role.roleName || user.role.id;
        if (roleName) userRoles.push(roleName);
    } else if (user.roleName) {
        userRoles.push(user.roleName);
    } else if (user.userRoles && Array.isArray(user.userRoles)) {
        userRoles = user.userRoles.map(userRole => {
            const role = userRole.role || userRole;
            return typeof role === 'string' ? role : role.name || role.roleName || role.id;
        }).filter(Boolean);
    } else {
        // Try to find roles in other possible properties
        const possibleRoleProps = ['roleNames', 'roleIds', 'userRole', 'roleList'];
        for (const prop of possibleRoleProps) {
            if (user[prop]) {
                if (Array.isArray(user[prop])) {
                    userRoles = user[prop].map(r => typeof r === 'string' ? r : r.name || r.roleName || r.id || r).filter(Boolean);
                } else if (typeof user[prop] === 'string') {
                    userRoles.push(user[prop]);
                }
                break;
            }
        }
    }

    return userRoles;
}

/**
 * Format roles as HTML badges
 * @param {Array} roles - Array of role names
 * @param {boolean} showEmpty - Whether to show a message when empty (ignored now)
 * @returns {string} - HTML string with badges
 */
function formatRolesAsBadges(roles, showEmpty = false) {
    if (!roles || roles.length === 0) {
        // Return empty string regardless of showEmpty parameter
        return '';
    }

    // Map roles to badges with different colors based on role name
    return roles.map(role => {
        let bgClass = 'bg-info';
        let icon = 'fa-user-shield';

        // Assign different colors and icons based on role name
        if (role.toLowerCase() === 'admin') {
            bgClass = 'bg-danger';
            icon = 'fa-user-cog';
        } else if (role.toLowerCase() === 'doctor') {
            bgClass = 'bg-success';
            icon = 'fa-user-md';
        } else if (role.toLowerCase() === 'patient') {
            bgClass = 'bg-primary';
            icon = 'fa-user';
        }

        return `<span class="badge ${bgClass} me-1"><i class="fas ${icon} me-1"></i>${role}</span>`;
    }).join(' ');
}
