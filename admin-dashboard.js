document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Check for token and admin role
    if (!token || !user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Elements
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const userTableBody = document.querySelector('#userTable tbody');

    // Add User Modal Elements
    const addUserModal = document.getElementById('addUserModal');
    const addUserBtn = document.getElementById('addUserBtn');
    const closeModalBtn = addUserModal.querySelector('.close-btn');
    const addUserForm = document.getElementById('addUserForm');
    const addUserError = document.getElementById('addUserError');
    const newUserCredits = document.getElementById('newUserCredits');

    // Edit User Modal Elements
    const editUserModal = document.getElementById('editUserModal');
    const closeEditModalBtn = editUserModal.querySelector('.close-btn');
    const editUserForm = document.getElementById('editUserForm');
    const editUserError = document.getElementById('editUserError');
    const editUserId = document.getElementById('editUserId');
    const editUserName = document.getElementById('editUserName');
    const editUserEmail = document.getElementById('editUserEmail');
    const editUserRole = document.getElementById('editUserRole');
    const editUserCredits = document.getElementById('editUserCredits');

    // Display welcome message
    welcomeMessage.textContent = `Welcome, ${user.name}!`;

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    // Fetch and display users
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                // If token is invalid or expired
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json(); // Get the full response object
            if (data && data.users && Array.isArray(data.users)) {
                const users = data.users; // Correctly access the nested users array
                userTableBody.innerHTML = ''; // Clear existing table data
                users.forEach(u => {
                    const row = document.createElement('tr');
                    // Store the user object in a data attribute, ensuring proper HTML encoding
                    const userJSON = JSON.stringify(u).replace(/'/g, "&apos;");
                    row.innerHTML = `
                        <td>${u.id}</td>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td><span class="role-chip role-${u.role}">${u.role}</span></td>
                        <td>${u.credits ?? 0}</td>
                        <td>${formatDate(u.created_at)}</td>
                        <td>${formatDate(u.last_login)}</td>
                        <td>
                            <div class="actions-container">
                                <button class="actions-btn edit-btn" data-user='${userJSON}'>Edit</button>
                                <button class="actions-btn delete-btn" data-id="${u.id}">Delete</button>
                            </div>
                        </td>
                    `;
                    userTableBody.appendChild(row);
                });

                // Add event listeners for edit buttons
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userToEdit = JSON.parse(e.currentTarget.dataset.user);
                        openEditModal(userToEdit);
                    });
                });

                // Add event listeners for delete buttons
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userId = e.currentTarget.dataset.id;
                        handleDeleteUser(userId);
                    });
                });
            } else {
                userTableBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            userTableBody.innerHTML = '<tr><td colspan="7">Error loading users.</td></tr>';
        }
    };

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // --- Add User Modal Logic ---
    
    // Open modal
    addUserBtn.addEventListener('click', () => {
        addUserModal.style.display = 'flex';
        addUserForm.reset();
        addUserError.textContent = '';
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        addUserModal.style.display = 'none';
    });

    // Handle Add User Form Submission
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addUserError.textContent = '';

        const name = document.getElementById('newUserName').value;
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const credits = parseInt(newUserCredits.value, 10) || 0;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Admin must be authenticated to register new users
                },
                body: JSON.stringify({ name, email, password, role: 'user', credits }) // Default new user role to 'user'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to create user');
            }

            // Success
            addUserModal.style.display = 'none'; // Close modal
            fetchUsers(); // Refresh the user list
            // Optionally, show a success notification
            alert('User created successfully!');

        } catch (error) {
            addUserError.textContent = error.message;
        }
    });

    // --- Edit User Modal Logic ---

    // Open the modal and populate it with user data
    const openEditModal = (userData) => {
        editUserId.value = userData.id;
        editUserName.value = userData.name;
        editUserEmail.value = userData.email;
        editUserRole.value = userData.role;
        editUserCredits.value = userData.credits ?? 0;
        editUserError.textContent = '';
        editUserModal.style.display = 'flex';
    };

    // Close edit modal
    closeEditModalBtn.addEventListener('click', () => {
        editUserModal.style.display = 'none';
    });
    
    // Combined window click listener for closing modals
    window.addEventListener('click', (event) => {
        if (event.target === addUserModal) {
            addUserModal.style.display = 'none';
        }
        if (event.target === editUserModal) {
            editUserModal.style.display = 'none';
        }
    });

    // Handle Edit User Form Submission
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editUserError.textContent = '';

        const id = editUserId.value;
        const name = editUserName.value;
        const email = editUserEmail.value;
        const role = editUserRole.value;
        const credits = parseInt(editUserCredits.value, 10) || 0;

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, role, credits })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to update user');
            }

            // Success
            editUserModal.style.display = 'none';
            fetchUsers(); // Refresh the user list
            alert('User updated successfully!');

        } catch (error) {
            editUserError.textContent = error.message;
        }
    });

    // --- Delete User Logic ---
    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete user');
            }

            // Success
            fetchUsers(); // Refresh the user list
            alert('User deleted successfully!');

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Initial data fetch
    fetchUsers();
}); 