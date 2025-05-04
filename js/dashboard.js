// Dashboard functionality for Brain Hope Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    if (!checkAuthStatus()) return;

    // Display username
    displayUsername();

    // Load dashboard data
    loadDashboardData();

    // Load recent users
    loadRecentUsers();
});

// Function to display the logged-in username
function displayUsername() {
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.username) {
            usernameElement.textContent = userInfo.username;
        }
    }
}

// Function to load dashboard data (user counts)
async function loadDashboardData() {
    try {
        // First try to get user statistics from the dedicated endpoint
        try {
            const statsResponse = await apiRequest(API_ENDPOINTS.GET_USER_STATS);

            if (statsResponse.ok) {
                const statsText = await statsResponse.clone().text();
                console.log('Raw user stats response:', statsText);

                try {
                    const statsData = JSON.parse(statsText);
                    console.log('Parsed user stats:', statsData);

                    // Handle different response formats
                    let stats = {};
                    if (statsData.isSuccess && statsData.response) {
                        stats = statsData.response;
                    } else if (statsData.response) {
                        stats = statsData.response;
                    } else if (typeof statsData === 'object') {
                        stats = statsData;
                    }

                    // Update UI with statistics
                    const totalUsersElement = document.getElementById('totalUsers');
                    const totalDoctorsElement = document.getElementById('totalDoctors');
                    const totalPatientsElement = document.getElementById('totalPatients');

                    if (totalUsersElement) {
                        totalUsersElement.textContent = stats.totalUsers || stats.total || 0;
                    }

                    if (totalDoctorsElement) {
                        totalDoctorsElement.textContent = stats.doctorCount || stats.doctors || 0;
                    }

                    if (totalPatientsElement) {
                        totalPatientsElement.textContent = stats.patientCount || stats.patients || 0;
                    }

                    // If we successfully got and displayed stats, return early
                    return;
                } catch (parseError) {
                    console.error('Error parsing stats JSON:', parseError);
                    // Continue to fallback method
                }
            } else {
                console.error('Failed to get user statistics:', statsResponse.status);
                // Continue to fallback method
            }
        } catch (statsError) {
            console.error('Error fetching user statistics:', statsError);
            // Continue to fallback method
        }

        // Fallback: Get all users and count them manually
        console.log('Falling back to manual user counting');
        const response = await apiRequest(API_ENDPOINTS.GET_ALL_USERS);

        if (response.ok) {
            // Get the response data
            const rawText = await response.clone().text();

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return;
            }

            // Handle different response formats
            let users = [];
            if (Array.isArray(data)) {
                // API returned an array directly
                users = data;
            } else if (data.isSuccess && Array.isArray(data.response)) {
                // API returned {isSuccess: true, response: [...]}
                users = data.response;
            } else if (data.response && Array.isArray(data.response)) {
                // API returned {response: [...]}
                users = data.response;
            }

            console.log('Users data:', users);

            // Update total users count
            const totalUsersElement = document.getElementById('totalUsers');
            if (totalUsersElement) {
                totalUsersElement.textContent = users.length;
            }

            // Count users by role
            let doctorCount = 0;
            let patientCount = 0;

            // Try to count users by role if the data includes role information
            users.forEach(user => {
                // Get user roles
                const userRoles = extractUserRoles(user);

                // Check if any role is doctor or patient
                let isDoctor = false;
                let isPatient = false;

                userRoles.forEach(role => {
                    const roleLower = role.toLowerCase();
                    if (roleLower === 'doctor') {
                        isDoctor = true;
                    } else if (roleLower === 'patient') {
                        isPatient = true;
                    }
                });

                if (isDoctor) {
                    doctorCount++;
                }

                if (isPatient) {
                    patientCount++;
                }

                // As a last resort, check if the user's name or email contains doctor/patient
                if (!isDoctor && !isPatient) {
                    const userName = (user.userName || user.username || '').toLowerCase();
                    const email = (user.email || '').toLowerCase();

                    if (userName.includes('doctor') || userName.includes('dr') || email.includes('doctor') || email.includes('dr')) {
                        doctorCount++;
                    } else if (userName.includes('patient') || email.includes('patient')) {
                        patientCount++;
                    }
                }
            });

            // Update role counts
            const totalDoctorsElement = document.getElementById('totalDoctors');
            const totalPatientsElement = document.getElementById('totalPatients');

            if (totalDoctorsElement) {
                totalDoctorsElement.textContent = doctorCount;
            }

            if (totalPatientsElement) {
                totalPatientsElement.textContent = patientCount;
            }
        } else {
            console.error('Failed to load dashboard data:', response.status);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Function to load recent users
async function loadRecentUsers() {
    const recentUsersTable = document.getElementById('recentUsersTable');
    if (!recentUsersTable) return;

    try {
        // Get all users
        const response = await apiRequest(API_ENDPOINTS.GET_ALL_USERS);

        if (response.ok) {
            // Get the response data
            const rawText = await response.clone().text();

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                recentUsersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error parsing user data</td></tr>';
                return;
            }

            // Handle different response formats
            let users = [];
            if (Array.isArray(data)) {
                // API returned an array directly
                users = data;
            } else if (data.isSuccess && Array.isArray(data.response)) {
                // API returned {isSuccess: true, response: [...]}
                users = data.response;
            } else if (data.response && Array.isArray(data.response)) {
                // API returned {response: [...]}
                users = data.response;
            }

            console.log('Users data for recent users table:', users);

            // Clear loading message
            recentUsersTable.innerHTML = '';

            // Display only the 5 most recent users (or fewer if there are less than 5)
            const recentUsers = users.slice(0, 5);

            if (recentUsers.length === 0) {
                recentUsersTable.innerHTML = '<tr><td colspan="4" class="text-center">No users found</td></tr>';
                return;
            }

            // Add each user to the table
            recentUsers.forEach(user => {
                const row = document.createElement('tr');

                // Handle different property names that might be used in the API response
                const username = user.userName || user.username || user.name || 'N/A';
                const email = user.email || 'N/A';
                const nationalId = user.nationalId || user.national_id || 'N/A';
                const userId = user.id || user.userId || '';

                // Get user roles and format as badges
                const userRoles = extractUserRoles(user);
                const rolesBadges = formatRolesAsBadges(userRoles);

                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-circle bg-primary text-white me-2">
                                ${username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="fw-bold">${username}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-envelope text-muted me-2"></i>
                            <span>${email}</span>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-id-card text-muted me-2"></i>
                            <span>${nationalId}</span>
                        </div>
                    </td>
                    <td>
                        <div class="mb-2">${rolesBadges}</div>
                        <div class="btn-group">
                            <a href="users.html?id=${userId}" class="btn btn-sm btn-info me-1">
                                <i class="fas fa-eye me-1"></i> View
                            </a>
                            <a href="#" class="btn btn-sm btn-primary assign-role-btn" data-id="${userId}" data-national-id="${nationalId}">
                                <i class="fas fa-user-tag me-1"></i> Assign Role
                            </a>
                        </div>
                    </td>
                `;
                recentUsersTable.appendChild(row);
            });
        } else {
            console.error('Failed to load recent users:', response.status);
            recentUsersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error loading users: ' + response.status + '</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent users:', error);
        recentUsersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error loading users: ' + error.message + '</td></tr>';
    }
}
