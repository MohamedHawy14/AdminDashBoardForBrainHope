// Configuration settings for Brain Hope Admin Dashboard

// API base URL - Change this to your production server URL
const API_BASE_URL = "http://braincancer.runasp.net";

// Don't modify below this line
const API_ENDPOINTS = {
    // Updated login endpoint with correct path
    LOGIN: `${API_BASE_URL}/Account/Account/LogIn`,
    // No separate refresh token endpoint - using login endpoint instead
    REFRESH_TOKEN: `${API_BASE_URL}/Account/Account/LogIn`,
    // Other endpoints - update these if needed
    GET_ALL_USERS: `${API_BASE_URL}/Admin/Admin/GetAllUsers`,
    CREATE_USER: `${API_BASE_URL}/Admin/Admin/CreateUserWithRole`,
    ASSIGN_ROLE: `${API_BASE_URL}/Admin/Admin/AssignRoleToUser`,
    GET_ALL_ROLES: `${API_BASE_URL}/Admin/Admin/GetAllRoles`,
    GET_USER_STATS: `${API_BASE_URL}/Admin/Admin/GetUserStatistics`
};
