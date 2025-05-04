// User creation functionality for Brain Hope Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    if (!checkAuthStatus()) return;

    // Handle form submission
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }
});

// Function to handle user creation form submission
async function handleCreateUser(event) {
    event.preventDefault();

    const createUserAlert = document.getElementById('createUserAlert');

    // Get form values
    const userName = document.getElementById('userName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const nationalId = document.getElementById('nationalId').value;
    const profilePhoto = document.getElementById('profilePhoto').files[0];

    // Get selected roles
    const roleCheckboxes = document.querySelectorAll('input[name="roles"]:checked');
    const roles = Array.from(roleCheckboxes).map(checkbox => checkbox.value);

    // Validate form
    if (password !== confirmPassword) {
        showAlert(createUserAlert, 'Passwords do not match.', 'danger');
        return;
    }

    if (nationalId.length !== 14 || !/^\d+$/.test(nationalId)) {
        showAlert(createUserAlert, 'National ID must be exactly 14 digits.', 'danger');
        return;
    }

    if (roles.length === 0) {
        showAlert(createUserAlert, 'Please select at least one role.', 'danger');
        return;
    }

    try {
        // Create form data for the API request
        const formData = new FormData();
        formData.append('UserName', userName);
        formData.append('Email', email);
        formData.append('Password', password);
        formData.append('ConfirmPassword', confirmPassword);
        formData.append('NationalId', nationalId);

        // Add roles - API expects 'Roles' field with role names
        if (roles.length > 0) {
            roles.forEach(role => {
                formData.append('Roles', role);
            });
        } else {
            // Default to Patient if no role selected
            formData.append('Roles', 'Patient');
        }

        // Add profile photo if provided
        if (profilePhoto) {
            formData.append('ProfilePhoto', profilePhoto);
        }

        console.log('Creating user with data:', {
            userName, email, nationalId, roles,
            hasPhoto: !!profilePhoto
        });

        // Make API request to create user
        const response = await fetch(API_ENDPOINTS.CREATE_USER, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Accept': '*/*'
            }
        });

        console.log('Create user response status:', response.status);

        // Try to parse the response
        let data;
        try {
            const rawText = await response.clone().text();
            console.log('Raw create user response:', rawText);

            try {
                data = JSON.parse(rawText);
                console.log('Parsed create user response:', data);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                // If JSON parsing fails, try to continue with response.json()
                data = await response.json();
            }
        } catch (textError) {
            console.error('Error reading response text:', textError);
            // Fall back to standard json parsing
            data = await response.json();
        }

        if (response.ok) {
            // Check if the response indicates success
            const isSuccess = data?.isSuccess === true ||
                             data?.status === "Success" ||
                             response.status === 200;

            if (isSuccess) {
                // Show success message
                const successMsg = data?.message || 'User created successfully!';
                showAlert(createUserAlert, successMsg, 'success');

                // Reset form
                document.getElementById('createUserForm').reset();

                // Redirect to users page after a delay
                setTimeout(() => {
                    window.location.href = 'users.html';
                }, 2000);
            } else {
                // API returned 200 but with an error message
                const errorMsg = data?.message || data?.error || 'Failed to create user';
                showAlert(createUserAlert, errorMsg, 'danger');
            }
        } else {
            // Show error message
            const errorMsg = data?.message || data?.error || `Failed to create user: ${response.status}`;
            showAlert(createUserAlert, errorMsg, 'danger');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showAlert(createUserAlert, 'An error occurred. Please try again later.', 'danger');
    }
}

// Function to show alert messages
function showAlert(alertElement, message, type) {
    if (!alertElement) return;

    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.classList.remove('d-none');

    // Scroll to the alert
    alertElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
