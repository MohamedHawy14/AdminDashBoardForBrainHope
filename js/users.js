// User management functionality for Brain Hope Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    if (!checkAuthStatus()) return;

    // Load all users
    loadUsers();

    // Set up real-time search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            loadUsers();
        });
    }

    // Set up role filter functionality
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function() {
            loadUsers();
        });
    }

    // Keep the search button for compatibility
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            loadUsers();
        });
    }

    // Set up role assignment
    const assignRoleBtn = document.getElementById('assignRoleBtn');
    if (assignRoleBtn) {
        assignRoleBtn.addEventListener('click', assignRole);
    }

    // Load roles for the dropdowns
    loadRoles();
    loadRoleFilters();
});

// Function to load all users
async function loadUsers() {
    const usersTable = document.getElementById('usersTable');
    const totalRecordsElement = document.getElementById('totalRecords');

    if (!usersTable) return;

    // Get search parameters
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const roleFilterElement = document.getElementById('roleFilter');
    const roleFilter = roleFilterElement ? roleFilterElement.value : '';

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
                usersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error parsing user data</td></tr>';
                return;
            }

            // Check if the response is an array (direct list of users)
            // or if it's wrapped in a response object
            let users = Array.isArray(data) ? data :
                        (data.isSuccess && data.response) ? data.response :
                        (data.response) ? data.response :
                        [];

            // Apply search filter if provided
            if (searchInput) {
                // Create a more flexible search that prioritizes matches at the beginning of words
                users = users.filter(user => {
                    const userName = (user.userName || '').toLowerCase();
                    const email = (user.email || '').toLowerCase();
                    const nationalId = (user.nationalId || '').toLowerCase();

                    // Check if any field starts with the search input (higher priority)
                    if (userName.startsWith(searchInput) ||
                        email.startsWith(searchInput) ||
                        nationalId.startsWith(searchInput)) {
                        return true;
                    }

                    // Check if any word in the username starts with the search input
                    const userNameWords = userName.split(/\s+/);
                    for (const word of userNameWords) {
                        if (word.startsWith(searchInput)) {
                            return true;
                        }
                    }

                    // Fall back to includes for broader matches
                    return userName.includes(searchInput) ||
                           email.includes(searchInput) ||
                           nationalId.includes(searchInput);
                });
            }

            // Apply role filter if provided
            if (roleFilter && roleFilter.trim() !== '') {
                users = users.filter(user => {
                    const userRoles = extractUserRoles(user);

                    // Check if any of the user's roles match the selected role filter
                    return userRoles.some(role =>
                        role.toLowerCase() === roleFilter.toLowerCase()
                    );
                });
            }

            // Update total records count
            if (totalRecordsElement) {
                totalRecordsElement.textContent = users.length;
            }

            // Clear loading message
            usersTable.innerHTML = '';

            if (users.length === 0) {
                usersTable.innerHTML = '<tr><td colspan="4" class="text-center">No users found</td></tr>';
                return;
            }

            // Add each user to the table
            users.forEach(user => {
                const row = document.createElement('tr');

                // Get user roles and format as badges
                const userRoles = extractUserRoles(user);
                const rolesBadges = formatRolesAsBadges(userRoles, true);

                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-circle bg-primary text-white me-2">
                                ${(user.userName || '').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="fw-bold">${user.userName || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-envelope text-muted me-2"></i>
                            <span>${user.email || ''}</span>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-id-card text-muted me-2"></i>
                            <span>${user.nationalId || ''}</span>
                        </div>
                    </td>
                    <td>
                        <div class="mb-2">${rolesBadges}</div>
                        <button class="btn btn-sm btn-primary me-1 assign-role-btn" data-id="${user.id}" data-national-id="${user.nationalId || ''}">
                            <i class="fas fa-user-tag"></i> Assign Role
                        </button>
                    </td>
                `;
                usersTable.appendChild(row);
            });

            // Add event listeners to assign role buttons
            const assignRoleBtns = document.querySelectorAll('.assign-role-btn');
            assignRoleBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    const nationalId = this.getAttribute('data-national-id');
                    openAssignRoleModal(userId, nationalId);
                });
            });
        } else {
            usersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error loading users: ' + response.status + '</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        usersTable.innerHTML = '<tr><td colspan="4" class="text-center">Error loading users: ' + error.message + '</td></tr>';
    }
}

// Function to load roles for the dropdown
async function loadRoles() {
    const roleSelect = document.getElementById('roleSelect');
    if (!roleSelect) return;

    try {
        // Clear existing options (except the first one)
        while (roleSelect.options.length > 1) {
            roleSelect.remove(1);
        }

        // Try to fetch roles from API
        const response = await fetch(API_ENDPOINTS.GET_ALL_ROLES, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Accept': '*/*'
            }
        });

        console.log('Get roles response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Roles data:', data);

            // Check if we have roles data
            let roles = [];
            if (Array.isArray(data)) {
                roles = data;
            } else if (data.response && Array.isArray(data.response)) {
                roles = data.response;
            } else if (data.isSuccess && data.response && Array.isArray(data.response)) {
                roles = data.response;
            }

            if (roles.length === 0) {
                // Fallback to default roles if API returns empty
                roles = [
                    { id: 'a1884f1d-3eaf-46b8-b71b-26878bbb0283', name: 'Doctor' },
                    { id: '2', name: 'Admin' },
                    { id: '3', name: 'Patient' }
                ];
            }

            // Add role options
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.name || role.roleName || role.id;
                roleSelect.appendChild(option);
            });
        } else {
            console.error('Failed to fetch roles:', response.status);
            // Fallback to default roles
            const defaultRoles = [
                { id: 'a1884f1d-3eaf-46b8-b71b-26878bbb0283', name: 'Doctor' },
                { id: '2', name: 'Admin' },
                { id: '3', name: 'Patient' }
            ];

            defaultRoles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.name;
                roleSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        // Fallback to default roles
        const defaultRoles = [
            { id: 'a1884f1d-3eaf-46b8-b71b-26878bbb0283', name: 'Doctor' },
            { id: '2', name: 'Admin' },
            { id: '3', name: 'Patient' }
        ];

        defaultRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            roleSelect.appendChild(option);
        });
    }
}

// Function to open the assign role modal
function openAssignRoleModal(userId, nationalId) {
    const userIdInput = document.getElementById('userId');
    const nationalIdInput = document.getElementById('nationalId');

    if (userIdInput && nationalIdInput) {
        userIdInput.value = userId;
        nationalIdInput.value = nationalId;

        // Open the modal
        const modal = new bootstrap.Modal(document.getElementById('assignRoleModal'));
        modal.show();
    }
}

// Function to assign a role to a user
async function assignRole() {
    const userId = document.getElementById('userId').value;
    const roleId = document.getElementById('roleSelect').value;

    if (!userId || !roleId) {
        alert('Please select a role');
        return;
    }

    try {
        // Get the nationalId from the hidden input
        const nationalId = document.getElementById('nationalId').value;

        // Create JSON data for the request
        const jsonData = {
            nationalId: nationalId,
            roleId: roleId
        };

        console.log('Assigning role:', jsonData);

        const response = await fetch(API_ENDPOINTS.ASSIGN_ROLE, {
            method: 'POST',
            body: JSON.stringify(jsonData),
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json',
                'Accept': '*/*'
            }
        });

        console.log('Assign role response status:', response.status);

        // Try to parse the response
        let data;
        try {
            const rawText = await response.clone().text();
            console.log('Raw assign role response:', rawText);

            try {
                data = JSON.parse(rawText);
                console.log('Parsed assign role response:', data);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
            }
        } catch (textError) {
            console.error('Error reading response text:', textError);
        }

        if (response.ok) {
            // Check if the response indicates success
            const isSuccess = data?.isSuccess === true ||
                             data?.status === "Success" ||
                             response.status === 200;

            if (isSuccess) {
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('assignRoleModal'));
                modal.hide();

                // Reload users
                loadUsers();

                // Show success message
                const successMsg = data?.message || 'Role assigned successfully';
                alert(successMsg);
            } else {
                // API returned 200 but with an error message
                const errorMsg = data?.message || data?.error || 'Failed to assign role';
                alert(errorMsg);
            }
        } else {
            const errorMsg = data?.message || data?.error || `Failed to assign role: ${response.status}`;
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Error assigning role:', error);
        alert('An error occurred while assigning the role: ' + error.message);
    }
}

// Function to load roles for the filter dropdown
async function loadRoleFilters() {
    const roleFilter = document.getElementById('roleFilter');
    if (!roleFilter) return;

    try {
        // Clear existing options (except the first one)
        while (roleFilter.options.length > 1) {
            roleFilter.remove(1);
        }

        // Try to fetch roles from API
        const response = await fetch(API_ENDPOINTS.GET_ALL_ROLES, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Accept': '*/*'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Check if we have roles data
            let roles = [];
            if (Array.isArray(data)) {
                roles = data;
            } else if (data.response && Array.isArray(data.response)) {
                roles = data.response;
            } else if (data.isSuccess && data.response && Array.isArray(data.response)) {
                roles = data.response;
            }

            if (roles.length === 0) {
                // Fallback to default roles if API returns empty
                roles = [
                    { id: 'a1884f1d-3eaf-46b8-b71b-26878bbb0283', name: 'Doctor' },
                    { id: '2', name: 'Admin' },
                    { id: '3', name: 'Patient' }
                ];
            }

            // Add role options
            roles.forEach(role => {
                const option = document.createElement('option');
                // Use the name property for both value and display text
                const roleName = role.name || role.roleName || role.id;
                option.value = roleName;
                option.textContent = roleName;
                roleFilter.appendChild(option);
            });
        } else {
            console.error('Failed to fetch roles for filter:', response.status);
            // Fallback to default roles
            const defaultRoles = ['Admin', 'Doctor', 'Patient'];

            defaultRoles.forEach(roleName => {
                const option = document.createElement('option');
                option.value = roleName;
                option.textContent = roleName;
                roleFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading roles for filter:', error);
        // Fallback to default roles
        const defaultRoles = ['Admin', 'Doctor', 'Patient'];

        defaultRoles.forEach(roleName => {
            const option = document.createElement('option');
            option.value = roleName;
            option.textContent = roleName;
            roleFilter.appendChild(option);
        });
    }
}
