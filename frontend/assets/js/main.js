// Placement Preparation Portal - Main JavaScript

// Theme Toggle Functions
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        if (theme === 'dark') {
            icon.className = 'bi bi-sun-fill';
        } else {
            icon.className = 'bi bi-moon-stars-fill';
        }
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Initialize theme on page load
initTheme();

// Authentication Helper Functions
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

function removeAuthToken() {
    localStorage.removeItem('authToken');
}

function getUserName() {
    return localStorage.getItem('userName');
}

function setUserName(name) {
    localStorage.setItem('userName', name);
}

function removeUserName() {
    localStorage.removeItem('userName');
}

// Load Auth Modals Dynamically for pages without inline modals
async function loadAuthModals() {
    try {
        if (document.getElementById('loginModal')) {
            initializeAuthForms();
            initGoogleSignIn();
            return;
        }

        const response = await fetch('auth-modals.html');
        const html = await response.text();
        
        const temp = document.createElement('div');
        temp.innerHTML = html;
        document.body.appendChild(temp);
        
        initializeAuthForms();
        initGoogleSignIn();
    } catch (error) {
        console.error('Error loading auth modals:', error);
    }
}

// Check Authentication Status and Update Navigation
function checkAuth() {
    const token = getAuthToken();
    const userName = getUserName();
    const authNav = document.getElementById('authNav');
    
    if (!authNav) return;
    
    if (token && userName) {
        // User is logged in
        const firstName = userName.split(' ')[0];
        authNav.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle user-dropdown" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <span class="user-avatar">👋</span>
                    <span class="user-name">${firstName}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end user-dropdown-menu" aria-labelledby="navbarDropdown">
                    <li><a class="dropdown-item" href="profile.html"><i class="me-2">👤</i>My Profile</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout(); return false;"><i class="me-2">🚪</i>Logout</a></li>
                </ul>
            </li>
        `;
        
        // Show welcome section on home page if present
        const welcomeSection = document.getElementById('welcomeSection');
        const guestSection = document.getElementById('guestSection');
        if (welcomeSection && guestSection) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = userName;
            welcomeSection.style.display = 'block';
            guestSection.style.display = 'none';
        }
    } else {
        // User is not logged in
        authNav.innerHTML = `
            <button class="btn btn-outline-light btn-sm me-2" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
            <button class="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#registerModal">Register</button>
        `;
    }
}

// ============================================================================
// Google OAuth Sign-In Integration
// ============================================================================

let googleClientId = null;

// Check for OAuth tokens or errors in URL parameters on page load
function handleOAuthUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('auth_token') || urlParams.get('token');
    const name = urlParams.get('user_name') || urlParams.get('name');
    const error = urlParams.get('error');

    if (error) {
        showToast(`Google Sign-In failed: ${decodeURIComponent(error)}`, 'danger');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token) {
        setAuthToken(token);
        if (name) setUserName(decodeURIComponent(name));
        showToast('Successfully signed in with Google!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
        checkAuth();
    }
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
        showToast('Google Sign-In was cancelled or failed.', 'warning');
        return;
    }

    try {
        showLoading();
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            setAuthToken(data.token);
            setUserName(data.name || data.username);

            // Hide any open modals
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) loginModal.hide();
            const regModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            if (regModal) regModal.hide();

            showToast('Google Sign-In successful!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            const errorDiv = document.getElementById('loginError') || document.getElementById('registerError');
            if (errorDiv) {
                errorDiv.textContent = data.message || 'Google Sign-In failed';
                errorDiv.classList.remove('d-none');
            } else {
                showToast(data.message || 'Google Sign-In failed', 'danger');
            }
        }
    } catch (err) {
        hideLoading();
        console.error('Google Auth Error:', err);
        showToast('Network error during Google Sign-In. Please try again.', 'danger');
    }
}

async function initGoogleSignIn() {
    handleOAuthUrlParams();

    // Check if Google GSI client library is loaded
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        const clientId = await fetchGoogleClientId();
        if (clientId) {
            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
            } catch (err) {
                console.warn('Google GSI initialization notice:', err);
            }
        }
    }
}

// ============================================================================
// Initialize Authentication Forms
// ============================================================================
function initializeAuthForms() {
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.dataset.initialized) {
        loginForm.dataset.initialized = "true";
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const errorDiv = document.getElementById('loginError');
            
            const username = usernameInput ? usernameInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";
            
            if (!username || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please enter both username and password.';
                    errorDiv.classList.remove('d-none');
                }
                return;
            }

            try {
                showLoading();
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                hideLoading();
                
                if (data.success) {
                    setAuthToken(data.token);
                    setUserName(data.name || data.username);
                    
                    const modalElement = document.getElementById('loginModal');
                    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                    modal.hide();
                    
                    window.location.reload();
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = data.message || 'Invalid username or password';
                        errorDiv.classList.remove('d-none');
                    }
                }
            } catch (error) {
                hideLoading();
                if (errorDiv) {
                    errorDiv.textContent = 'An error occurred connecting to the server. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            }
        });
    }
    
    // Register Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !registerForm.dataset.initialized) {
        registerForm.dataset.initialized = "true";
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const errorDiv = document.getElementById('registerError');
            const successDiv = document.getElementById('registerSuccess');

            const data = {
                name: (document.getElementById('regName')?.value || "").trim(),
                email: (document.getElementById('regEmail')?.value || "").trim(),
                username: (document.getElementById('regUsername')?.value || "").trim(),
                password: document.getElementById('regPassword')?.value || "",
                phone: (document.getElementById('regPhone')?.value || "").trim(),
                college: (document.getElementById('regCollege')?.value || "").trim(),
                course: (document.getElementById('regCourse')?.value || "").trim(),
                skills: (document.getElementById('regSkills')?.value || "").trim()
            };
            
            if (!data.name || !data.email || !data.username || !data.password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please fill in all required fields (Name, Email, Username, Password).';
                    errorDiv.classList.remove('d-none');
                }
                return;
            }

            try {
                showLoading();
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                hideLoading();
                
                if (result.success) {
                    if (successDiv) {
                        successDiv.textContent = 'Registration successful! Opening login...';
                        successDiv.classList.remove('d-none');
                    }
                    if (errorDiv) errorDiv.classList.add('d-none');
                    
                    registerForm.reset();
                    
                    setTimeout(() => {
                        const registerModalElement = document.getElementById('registerModal');
                        const registerModal = bootstrap.Modal.getInstance(registerModalElement) || new bootstrap.Modal(registerModalElement);
                        registerModal.hide();
                        
                        const loginModalElement = document.getElementById('loginModal');
                        const loginModal = bootstrap.Modal.getInstance(loginModalElement) || new bootstrap.Modal(loginModalElement);
                        loginModal.show();
                    }, 1500);
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = result.message || 'Registration failed';
                        errorDiv.classList.remove('d-none');
                    }
                    if (successDiv) successDiv.classList.add('d-none');
                }
            } catch (error) {
                hideLoading();
                if (errorDiv) {
                    errorDiv.textContent = 'An error occurred connecting to the server. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            }
        });
    }

    initGoogleSignIn();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthForms();
    checkAuth();
    initGoogleSignIn();
});

// Logout Function
async function logout() {
    const token = getAuthToken();
    if (token) {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    removeAuthToken();
    removeUserName();
    window.location.href = '/';
}

// Generic Fetch API Helper
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return {};
    }
}

// Loading Spinner Helpers
function showLoading() {
    if (document.getElementById('loadingSpinner')) return;
    const loader = document.createElement('div');
    loader.id = 'loadingSpinner';
    loader.className = 'position-fixed top-50 start-50 translate-middle p-3 rounded-circle shadow bg-white';
    loader.style.zIndex = '9999';
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.remove();
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 show shadow-lg`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-medium">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '10000';
    document.body.appendChild(container);
    return container;
}
