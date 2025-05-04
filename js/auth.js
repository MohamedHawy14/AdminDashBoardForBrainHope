// Authentication handling for Brain Hope Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Check if config.js is loaded
    if (typeof API_ENDPOINTS === 'undefined') {
        console.error('Configuration not loaded. Make sure config.js is included before auth.js');
        return;
    }
    // Check if user is already logged in
    checkAuthStatus();

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Handle logout button clicks
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Function to handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginAlert = document.getElementById('loginAlert');
    const connectionStatus = document.getElementById('connectionStatus');
    const troubleshootingOptions = document.getElementById('troubleshootingOptions');

    try {
        // Try multiple formats for the login data
        // Format 1: Simple JSON with email and password
        const loginDataSimple = {
            email: email,
            password: password
        };

        // Format 2: With additional properties that might be expected by the API
        const loginDataExtended = {
            email: email,
            password: password,
            rememberMe: true
        };

        // Show loading state
        loginAlert.textContent = 'Logging in...';
        loginAlert.className = 'alert alert-info';
        loginAlert.classList.remove('d-none');

        // Check if we're using a temporary API URL from the protocol toggle
        const tempApiBaseUrl = localStorage.getItem('tempApiBaseUrl');
        const loginEndpoint = tempApiBaseUrl
            ? `${tempApiBaseUrl}/Account/LogIn`
            : API_ENDPOINTS.LOGIN;

        // Make API request to login endpoint with timeout
        console.log('Attempting to connect to:', loginEndpoint);

        // Create an AbortController with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            // Try multiple approaches for login
            let response;
            let lastError = null;
            let succeeded = false;

            // Array of approaches to try
            const approaches = [
                // Approach 1: FormData with correct field names (Email, Password)
                async () => {
                    console.log('Trying FormData with Email/Password field names...');
                    const formData = new FormData();
                    formData.append('Email', email); // Note: Capital 'E' in Email
                    formData.append('Password', password); // Note: Capital 'P' in Password

                    return await fetch(loginEndpoint, {
                        method: 'POST',
                        body: formData,
                        mode: 'cors',
                        credentials: 'omit',
                        signal: controller.signal,
                        headers: {
                            'Accept': '*/*'
                        }
                    });
                },

                // Approach 2: FormData with lowercase field names (fallback)
                async () => {
                    console.log('Trying FormData with lowercase field names...');
                    const formData = new FormData();
                    formData.append('email', email);
                    formData.append('password', password);

                    return await fetch(loginEndpoint, {
                        method: 'POST',
                        body: formData,
                        mode: 'cors',
                        credentials: 'omit',
                        signal: controller.signal,
                        headers: {
                            'Accept': '*/*'
                        }
                    });
                },

                // Approach 3: URL-encoded form data with correct field names
                async () => {
                    console.log('Trying URL-encoded form data with Email/Password field names...');
                    const urlEncodedData = new URLSearchParams();
                    urlEncodedData.append('Email', email); // Note: Capital 'E' in Email
                    urlEncodedData.append('Password', password); // Note: Capital 'P' in Password

                    return await fetch(loginEndpoint, {
                        method: 'POST',
                        body: urlEncodedData,
                        mode: 'cors',
                        credentials: 'omit',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': '*/*'
                        }
                    });
                },

                // Approach 4: Simple JSON
                async () => {
                    console.log('Trying simple JSON format...');
                    const jsonData = {
                        Email: email, // Note: Capital 'E' in Email
                        Password: password // Note: Capital 'P' in Password
                    };
                    return await fetch(loginEndpoint, {
                        method: 'POST',
                        body: JSON.stringify(jsonData),
                        mode: 'cors',
                        credentials: 'omit',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': '*/*'
                        }
                    });
                }
            ];

            // Try each approach until one succeeds or all fail
            for (const approach of approaches) {
                try {
                    response = await approach();

                    // If we get a 200 OK or 401 Unauthorized, we've found the right format
                    // 401 means the endpoint works but credentials are wrong
                    if (response.ok || response.status === 401) {
                        console.log('Found working format:', response.status);
                        succeeded = true;
                        break;
                    }

                    // If we get a 400 Bad Request, log the response for debugging
                    if (response.status === 400) {
                        try {
                            const errorData = await response.clone().text();
                            console.log('Bad request response:', errorData);
                        } catch (e) {
                            console.log('Could not read error response');
                        }
                    }

                } catch (innerError) {
                    console.error('Error during fetch attempt:', innerError);
                    lastError = innerError;
                }
            }

            // If all approaches failed, throw the last error
            if (!succeeded && !response) {
                if (lastError) {
                    throw lastError;
                } else {
                    throw new Error('All login approaches failed');
                }
            }

            // Clear the timeout
            clearTimeout(timeoutId);

            console.log('Response status:', response.status);

            // Log the raw response text for debugging
            let data;
            try {
                const rawText = await response.clone().text();
                console.log('Raw response text:', rawText);

                // Try to parse as JSON
                try {
                    data = JSON.parse(rawText);
                    console.log('Response data (parsed):', data);
                } catch (jsonError) {
                    console.error('Error parsing JSON response:', jsonError);
                    // If JSON parsing fails, try to continue with response.json()
                    data = await response.json();
                    console.log('Response data (from json()):', data);
                }
            } catch (textError) {
                console.error('Error reading response text:', textError);
                // Fall back to standard json parsing
                data = await response.json();
                console.log('Response data (from json()):', data);
            }

            // Check if login was successful
            if (response.ok) {
                console.log('Login response was OK (HTTP 200)');

                // Handle different API response formats
                try {
                    // Check if we have a successful response with expected structure
                    // Some APIs don't include an explicit success flag, so we'll also check for token presence
                    const hasSuccessFlag = data && (data.isSuccess === true || data.success === true);
                    const hasTokenData = data && (
                        (data.response && data.response.accessToken) ||
                        data.accessToken ||
                        data.token ||
                        (data.data && data.data.token) ||
                        (typeof data === 'string' && data.split('.').length === 3)
                    );

                    if (hasSuccessFlag || hasTokenData) {
                        console.log('Login reported as successful in response');

                        // Try to find the token in the response (handle different response structures)
                        let accessToken, refreshToken, expiryDate;

                        // Structure 1: data.response.accessToken.token
                        if (data.response && data.response.accessToken && data.response.accessToken.token) {
                            console.log('Found token in data.response.accessToken.token');
                            accessToken = data.response.accessToken.token;
                            refreshToken = data.response.refreshToken?.token;
                            expiryDate = data.response.accessToken.expiryTokenDate;
                        }
                        // Structure 2: data.accessToken
                        else if (data.accessToken) {
                            console.log('Found token in data.accessToken');
                            accessToken = typeof data.accessToken === 'string' ? data.accessToken : data.accessToken.token;
                            refreshToken = data.refreshToken?.token || data.refreshToken;
                            expiryDate = data.expiryDate || data.expiry;
                        }
                        // Structure 3: data.token
                        else if (data.token) {
                            console.log('Found token in data.token');
                            accessToken = data.token;
                            refreshToken = data.refreshToken;
                            expiryDate = data.expiryDate || data.expiry;
                        }
                        // Structure 4: data.data.token
                        else if (data.data && data.data.token) {
                            console.log('Found token in data.data.token');
                            accessToken = data.data.token;
                            refreshToken = data.data.refreshToken;
                            expiryDate = data.data.expiryDate || data.data.expiry;
                        }
                        // Structure 5: data itself is the token
                        else if (typeof data === 'string' && data.split('.').length === 3) {
                            console.log('Response appears to be the token itself');
                            accessToken = data;
                        }

                        if (accessToken) {
                            // Parse the token to get user info
                            const tokenData = parseJwt(accessToken);
                            console.log('Token data:', tokenData);

                            // Look for roles in different possible locations
                            let roles = tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                                        tokenData['role'] ||
                                        tokenData['roles'] ||
                                        [];

                            console.log('User roles:', roles);

                            // Check if user has admin role (handle different role formats)
                            const isAdmin = Array.isArray(roles)
                                ? roles.some(r => r.toLowerCase() === 'admin')
                                : typeof roles === 'string' && roles.toLowerCase() === 'admin';

                            if (isAdmin) {
                                console.log('User has admin role, storing tokens and redirecting');

                                // Store tokens and email in localStorage
                                localStorage.setItem('accessToken', accessToken);
                                if (refreshToken) {
                                    localStorage.setItem('refreshToken', refreshToken);
                                }
                                if (expiryDate) {
                                    localStorage.setItem('tokenExpiry', expiryDate);
                                }
                                localStorage.setItem('userEmail', email); // Store email for token refresh

                                // Redirect to dashboard
                                window.location.href = 'index.html';
                                return; // Exit the function
                            } else {
                                console.log('User does not have admin role');
                                // Show error for non-admin users
                                loginAlert.textContent = 'Access denied. You do not have admin privileges.';
                                loginAlert.className = 'alert alert-danger';
                                loginAlert.classList.remove('d-none');
                            }
                        } else {
                            console.error('Could not find token in response:', data);
                            loginAlert.textContent = 'Login successful but token format is invalid.';
                            loginAlert.className = 'alert alert-danger';
                            loginAlert.classList.remove('d-none');
                        }
                    } else {
                        // API returned success status but data indicates failure
                        const errorMsg = data.message || data.error || data.errorMessage || 'Login failed. Please check your credentials.';
                        console.error('Login failed according to response data:', errorMsg, data);
                        loginAlert.textContent = errorMsg;
                        loginAlert.className = 'alert alert-danger';
                        loginAlert.classList.remove('d-none');
                    }
                } catch (parseError) {
                    console.error('Error processing login response:', parseError);
                    loginAlert.textContent = 'Error processing server response. Please try again.';
                    loginAlert.className = 'alert alert-danger';
                    loginAlert.classList.remove('d-none');
                }
            } else {
                // HTTP error status
                const errorMsg = data?.message || data?.error || `Login failed with status: ${response.status}`;
                console.error('Login HTTP error:', errorMsg, data);
                loginAlert.textContent = errorMsg;
                loginAlert.className = 'alert alert-danger';
                loginAlert.classList.remove('d-none');
            }
        } catch (fetchError) {
            // Clear the timeout if there was an error
            clearTimeout(timeoutId);
            throw fetchError;
        }
    } catch (error) {
        console.error('Login error:', error);

        // Show more detailed error message based on the type of error
        let errorMessage = 'An error occurred. Please try again later.';

        if (error.name === 'AbortError') {
            errorMessage = 'Connection timed out. The server is taking too long to respond.';
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage = 'Connection error: Failed to fetch. Please check your network connection.';
        } else if (error.message) {
            errorMessage = 'Connection error: ' + error.message;
        }

        loginAlert.textContent = errorMessage;
        loginAlert.className = 'alert alert-danger';
        loginAlert.classList.remove('d-none');

        // Show troubleshooting options
        if (troubleshootingOptions) {
            troubleshootingOptions.classList.remove('d-none');
        }

        // Update connection status
        if (connectionStatus) {
            connectionStatus.textContent = 'Cannot connect to server. Please check your network or try HTTP/HTTPS.';
            connectionStatus.className = 'text-center mb-3 small text-danger';
        }
    }
}

// Function to handle logout
function handleLogout() {
    // Clear authentication data from localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('userEmail');

    // Also clear any temporary API URL
    localStorage.removeItem('tempApiBaseUrl');

    // Redirect to login page
    window.location.href = 'login.html';
}

// Function to check authentication status
function checkAuthStatus() {
    const accessToken = localStorage.getItem('accessToken');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    // If no token exists or token is expired, redirect to login page
    if (!accessToken || (tokenExpiry && new Date(tokenExpiry) < new Date())) {
        // Only redirect if not already on login page
        if (!window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }

    // If on login page but already authenticated, redirect to dashboard
    if (window.location.href.includes('login.html')) {
        window.location.href = 'index.html';
    }

    return true;
}

// Function to parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return {};
    }
}

// Function to get authenticated user info from token
function getUserInfo() {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const tokenData = parseJwt(token);
    return {
        id: tokenData.sub || tokenData.nameid,
        email: tokenData.email,
        username: tokenData.unique_name || tokenData.name
    };
}

// Function to make authenticated API requests
async function apiRequest(url, method = 'GET', body = null) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*'
    };

    if (!(body instanceof FormData) && body) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    console.log(`API Request: ${method} ${url}`);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body
        });

        console.log(`API Response status: ${response.status}`);

        // If token expired (401), try to refresh
        if (response.status === 401) {
            console.log('Token expired, attempting to refresh...');
            const refreshed = await refreshToken();
            if (refreshed) {
                console.log('Token refreshed successfully, retrying request');
                // Retry the request with new token
                return apiRequest(url, method, body);
            } else {
                console.log('Token refresh failed, logging out');
                // Redirect to login if refresh failed
                handleLogout();
                throw new Error('Authentication expired');
            }
        }

        // Log response for debugging
        try {
            const rawText = await response.clone().text();
            console.log(`Raw API response: ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`);

            try {
                const data = JSON.parse(rawText);
                console.log('Parsed API response:', data);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
            }
        } catch (textError) {
            console.error('Error reading response text:', textError);
        }

        return response;
    } catch (error) {
        console.error(`API Request error for ${url}:`, error);
        throw error;
    }
}

// Function to refresh the access token
async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const email = localStorage.getItem('userEmail'); // We'll store this during login

    if (!refreshToken || !email) {
        console.error('Missing refresh token or email for token refresh');
        return false;
    }

    try {
        // Since there's no separate refresh token endpoint, we'll use the login endpoint
        console.log('Attempting to refresh token using login endpoint');

        // Try multiple approaches for token refresh
        let response;
        let lastError = null;
        let succeeded = false;

        // Array of approaches to try
        const approaches = [
            // Approach 1: FormData with correct field names
            async () => {
                console.log('Trying FormData with correct field names for refresh...');
                const formData = new FormData();
                formData.append('Email', email); // Note: Capital 'E' in Email
                formData.append('RefreshToken', refreshToken); // Note: Capital 'R' and 'T' in RefreshToken

                return await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    body: formData,
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Accept': '*/*'
                    }
                });
            },

            // Approach 2: FormData with lowercase field names (fallback)
            async () => {
                console.log('Trying FormData with lowercase field names for refresh...');
                const formData = new FormData();
                formData.append('email', email);
                formData.append('refreshToken', refreshToken);

                return await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    body: formData,
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Accept': '*/*'
                    }
                });
            },

            // Approach 3: URL-encoded form data with correct field names
            async () => {
                console.log('Trying URL-encoded form data with correct field names for refresh...');
                const urlEncodedData = new URLSearchParams();
                urlEncodedData.append('Email', email); // Note: Capital 'E' in Email
                urlEncodedData.append('RefreshToken', refreshToken); // Note: Capital 'R' and 'T' in RefreshToken

                return await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    body: urlEncodedData,
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': '*/*'
                    }
                });
            },

            // Approach 4: Simple JSON with correct field names
            async () => {
                console.log('Trying simple JSON format with correct field names for refresh...');
                const jsonData = {
                    Email: email, // Note: Capital 'E' in Email
                    RefreshToken: refreshToken // Note: Capital 'R' and 'T' in RefreshToken
                };
                return await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    body: JSON.stringify(jsonData),
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': '*/*'
                    }
                });
            }
        ];

        // Try each approach until one succeeds or all fail
        for (const approach of approaches) {
            try {
                response = await approach();

                // If we get a 200 OK, we've found the right format
                if (response.ok) {
                    console.log('Found working refresh format:', response.status);
                    succeeded = true;
                    break;
                }

                // If we get a 400 Bad Request, log the response for debugging
                if (response.status === 400) {
                    try {
                        const errorData = await response.clone().text();
                        console.log('Bad request response for refresh:', errorData);
                    } catch (e) {
                        console.log('Could not read error response');
                    }
                }

            } catch (innerError) {
                console.error('Error during refresh token fetch attempt:', innerError);
                lastError = innerError;
            }
        }

        // If all approaches failed, throw the last error
        if (!succeeded && !response) {
            if (lastError) {
                throw lastError;
            } else {
                throw new Error('All refresh token approaches failed');
            }
        }

        if (response.ok) {
            // Log the raw response text for debugging
            let data;
            try {
                const rawText = await response.clone().text();
                console.log('Raw refresh token response text:', rawText);

                // Try to parse as JSON
                try {
                    data = JSON.parse(rawText);
                    console.log('Refresh token response data (parsed):', data);
                } catch (jsonError) {
                    console.error('Error parsing refresh token JSON response:', jsonError);
                    // If JSON parsing fails, try to continue with response.json()
                    data = await response.json();
                    console.log('Refresh token response data (from json()):', data);
                }
            } catch (textError) {
                console.error('Error reading refresh token response text:', textError);
                // Fall back to standard json parsing
                data = await response.json();
                console.log('Refresh token response data (from json()):', data);
            }

            // Handle different API response formats for token refresh
            try {
                // Check if we have a successful response with expected structure
                // Some APIs don't include an explicit success flag, so we'll also check for token presence
                const hasSuccessFlag = data && (data.isSuccess === true || data.success === true);
                const hasTokenData = data && (
                    (data.response && data.response.accessToken) ||
                    data.accessToken ||
                    data.token ||
                    (data.data && data.data.token) ||
                    (typeof data === 'string' && data.split('.').length === 3)
                );

                if (hasSuccessFlag || hasTokenData) {
                    console.log('Token refresh reported as successful in response');

                    // Try to find the token in the response (handle different response structures)
                    let accessToken, refreshToken, expiryDate;

                    // Structure 1: data.response.accessToken.token
                    if (data.response && data.response.accessToken && data.response.accessToken.token) {
                        console.log('Found token in data.response.accessToken.token');
                        accessToken = data.response.accessToken.token;
                        refreshToken = data.response.refreshToken?.token;
                        expiryDate = data.response.accessToken.expiryTokenDate;
                    }
                    // Structure 2: data.accessToken
                    else if (data.accessToken) {
                        console.log('Found token in data.accessToken');
                        accessToken = typeof data.accessToken === 'string' ? data.accessToken : data.accessToken.token;
                        refreshToken = data.refreshToken?.token || data.refreshToken;
                        expiryDate = data.expiryDate || data.expiry;
                    }
                    // Structure 3: data.token
                    else if (data.token) {
                        console.log('Found token in data.token');
                        accessToken = data.token;
                        refreshToken = data.refreshToken;
                        expiryDate = data.expiryDate || data.expiry;
                    }
                    // Structure 4: data.data.token
                    else if (data.data && data.data.token) {
                        console.log('Found token in data.data.token');
                        accessToken = data.data.token;
                        refreshToken = data.data.refreshToken;
                        expiryDate = data.data.expiryDate || data.data.expiry;
                    }
                    // Structure 5: data itself is the token
                    else if (typeof data === 'string' && data.split('.').length === 3) {
                        console.log('Response appears to be the token itself');
                        accessToken = data;
                    }

                    if (accessToken) {
                        console.log('Token refresh successful');
                        localStorage.setItem('accessToken', accessToken);
                        if (refreshToken) {
                            localStorage.setItem('refreshToken', refreshToken);
                        }
                        if (expiryDate) {
                            localStorage.setItem('tokenExpiry', expiryDate);
                        }
                        return true;
                    } else {
                        console.error('Could not find token in refresh response:', data);
                    }
                } else {
                    console.error('Token refresh failed according to response data:', data.message || 'Unknown error');
                }
            } catch (parseError) {
                console.error('Error processing token refresh response:', parseError);
            }

            return false;
        } else {
            console.error('Token refresh request failed with status:', response.status);
        }

        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}
