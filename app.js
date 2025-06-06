// ===================================================================
// !! IMPORTANT !!
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyismenIwu0cWWYDYIN_j51hUK41nBfaxhTz9fNRFf6g7asob1E8x3KRBsE7YpfvKsb8w/exec";
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/') {
        handleLoginPage();
    } else if (path.includes('dashboard.html')) {
        handleDashboardPage();
    }
});

// --- Login Page Logic ---
function handleLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const loginBtn = document.getElementById('login-btn');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMessage.textContent = '';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', username, password }),
            });
            const result = await response.json();

            if (result.status === 'success') {
                sessionStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = result.message;
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred. Please try again.';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}

// --- Dashboard Page Logic ---
function handleDashboardPage() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Setup UI based on user role
    setupDashboardUI(user);
    loadDomains(user);

    // Event Listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('search-bar').addEventListener('input', handleSearch);
    
    // Admin-only listeners
    if(user.role === 'admin') {
        const addDomainBtn = document.getElementById('add-domain-btn');
        const domainForm = document.getElementById('domain-form');
        const modal = document.getElementById('domain-modal');
        const closeBtn = modal.querySelector('.close-btn');

        addDomainBtn.addEventListener('click', openAddModal);
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        domainForm.addEventListener('submit', handleDomainFormSubmit);
    }
    
    // Profile Modal Listeners
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileCloseBtn = profileModal.querySelector('.close-btn');
    const profileForm = document.getElementById('profile-form');

    profileBtn.addEventListener('click', openProfileModal);
    profileCloseBtn.addEventListener('click', () => profileModal.style.display = 'none');
    profileForm.addEventListener('submit', handleProfileFormSubmit);
}

function setupDashboardUI(user) {
    document.getElementById('user-fullname').textContent = user.fullName;
    document.getElementById('user-role').textContent = user.role;

    if (user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'revert');
    }
}

async function loadDomains(user) {
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'block';
    
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getDomains', user }),
    });
    const result = await response.json();
    spinner.style.display = 'none';

    if (result.status === 'success') {
        renderDomains(result.data, user.role);
    } else {
        alert('Error loading domains: ' + result.message);
    }
}

function renderDomains(domains, role) {
    const tableBody = document.getElementById('domain-table-body');
    tableBody.innerHTML = ''; // Clear existing rows

    if (domains.length === 0) {
        const colSpan = role === 'admin' ? 7 : 6;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;">No domains found.</td></tr>`;
        return;
    }

    domains.forEach(domain => {
        const row = document.createElement('tr');
        row.dataset.domainName = domain.DomainName.toLowerCase();
        
        row.innerHTML = `
            <td>${domain.DomainName}</td>
            <td>${domain.OwnerUsername}</td>
            <td>${domain.RegistrationDate}</td>
            <td>${domain.ExpiryDate}</td>
            <td>${domain.Status}</td>
            <td>${domain.Notes || ''}</td>
            ${role === 'admin' ? 
            `<td class="admin-only">
                <button class="action-btn edit-btn" data-id="${domain.DomainID}" data-row-index="${domain.rowIndex}">Edit</button>
                <button class="action-btn delete-btn" data-id="${domain.DomainID}">Delete</button>
            </td>` : ''}
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners for new buttons
    if (role === 'admin') {
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e.target)));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteDomain(e.target.dataset.id)));
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#domain-table-body tr');
    rows.forEach(row => {
        const domainName = row.dataset.domainName;
        if (domainName && domainName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function openAddModal() {
    document.getElementById('domain-form').reset();
    document.getElementById('modal-title').textContent = 'Add New Domain';
    document.getElementById('domain-id').value = '';
    document.getElementById('domain-row-index').value = '';
    document.getElementById('domain-modal').style.display = 'block';
}

function openEditModal(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');

    document.getElementById('modal-title').textContent = 'Edit Domain';
    document.getElementById('domain-id').value = button.dataset.id;
    document.getElementById('domain-row-index').value = button.dataset.rowIndex;

    document.getElementById('domain-name').value = cells[0].textContent;
    document.getElementById('owner-username').value = cells[1].textContent;
    document.getElementById('reg-date').value = cells[2].textContent;
    document.getElementById('exp-date').value = cells[3].textContent;
    document.getElementById('status').value = cells[4].textContent;
    document.getElementById('notes').value = cells[5].textContent;

    document.getElementById('domain-modal').style.display = 'block';
}

async function handleDomainFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-domain-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const domainData = {
        DomainID: document.getElementById('domain-id').value,
        rowIndex: document.getElementById('domain-row-index').value,
        DomainName: document.getElementById('domain-name').value,
        OwnerUsername: document.getElementById('owner-username').value,
        RegistrationDate: document.getElementById('reg-date').value,
        ExpiryDate: document.getElementById('exp-date').value,
        Status: document.getElementById('status').value,
        Notes: document.getElementById('notes').value,
    };
    
    const action = domainData.DomainID ? 'updateDomain' : 'addDomain';
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, domainData }),
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert(result.message);
            document.getElementById('domain-modal').style.display = 'none';
            loadDomains(JSON.parse(sessionStorage.getItem('user'))); // Reload table
        } else {
            alert('Error: ' + result.message);
        }
    } catch(err) {
        alert('An error occurred during submission.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Domain';
    }
}

async function deleteDomain(domainId) {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteDomain', domainId }),
    });
    const result = await response.json();

    if (result.status === 'success') {
        alert(result.message);
        loadDomains(JSON.parse(sessionStorage.getItem('user'))); // Reload table
    } else {
        alert('Error: ' + result.message);
    }
}

async function openProfileModal() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getUserProfile', username: user.username }),
    });
    const result = await response.json();

    if (result.status === 'success') {
        document.getElementById('profile-username').value = result.data.username;
        document.getElementById('profile-fullname').value = result.data.fullName;
        document.getElementById('profile-row-index').value = result.data.rowIndex;
        document.getElementById('profile-new-password').value = ''; // Clear password field
        document.getElementById('profile-modal').style.display = 'block';
    } else {
        alert('Error fetching profile: ' + result.message);
    }
}

async function handleProfileFormSubmit(e) {
    e.preventDefault();
    const profileData = {
        rowIndex: document.getElementById('profile-row-index').value,
        fullName: document.getElementById('profile-fullname').value,
        newPassword: document.getElementById('profile-new-password').value,
    };

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUserProfile', profileData }),
    });
    const result = await response.json();

    if (result.status === 'success') {
        alert(result.message);
        // Update sessionStorage if full name changed
        const user = JSON.parse(sessionStorage.getItem('user'));
        user.fullName = profileData.fullName;
        sessionStorage.setItem('user', JSON.stringify(user));
        document.getElementById('user-fullname').textContent = user.fullName;
        document.getElementById('profile-modal').style.display = 'none';

        if(profileData.newPassword){
            alert("Password updated. Please log out and log in again.");
        }
    } else {
        alert('Error updating profile: ' + result.message);
    }
}

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}
