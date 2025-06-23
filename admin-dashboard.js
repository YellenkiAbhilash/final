document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    console.log('Admin Dashboard loaded');
    console.log('Token exists:', !!token);
    console.log('User:', user);
    
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

    // --- Download Responses Logic ---
    const downloadResponsesBtn = document.getElementById('downloadResponsesBtn');
    
    downloadResponsesBtn.addEventListener('click', async () => {
        try {
            // Disable button and show loading state
            downloadResponsesBtn.disabled = true;
            downloadResponsesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-responses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download responses');
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'call_responses.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show success message
            alert('Responses downloaded successfully!');

        } catch (error) {
            console.error('Error downloading responses:', error);
            alert(`Error downloading responses: ${error.message}`);
        } finally {
            // Re-enable button and restore original text
            downloadResponsesBtn.disabled = false;
            downloadResponsesBtn.innerHTML = '<i class="fas fa-download"></i> Download Responses';
        }
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

    // --- Reports Section Logic ---
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load data for the selected tab
            loadTabData(tabName);
        });
    });

    // Load data for specific tab
    function loadTabData(tabName) {
        console.log(`🔄 Loading data for tab: ${tabName}`);
        switch(tabName) {
            case 'calls':
                loadCalls();
                break;
            case 'responses':
                loadResponses();
                break;
            case 'transcripts':
                loadTranscripts();
                break;
            case 'users':
                loadUsersAnalytics();
                break;
            default:
                console.log('Unknown tab:', tabName);
        }
    }

    // Load calls data
    const loadCallsData = async () => {
        try {
            console.log('Loading calls data...');
            const response = await fetch('/api/calls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`Failed to fetch calls: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Calls data received:', data);
            
            const callsTableBody = document.querySelector('#callsTable tbody');
            if (!callsTableBody) {
                console.error('Calls table body not found!');
                return;
            }
            
            callsTableBody.innerHTML = '';
            
            if (!data.calls || data.calls.length === 0) {
                callsTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No calls found</td></tr>';
                return;
            }
            
            data.calls.forEach(call => {
                const row = document.createElement('tr');
                const status = call.completed ? 'completed' : call.failed ? 'failed' : 'pending';
                const statusText = call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending';
                
                row.innerHTML = `
                    <td>${call.id}</td>
                    <td>${call.userId || 'N/A'}</td>
                    <td>${call.name}</td>
                    <td>${call.phone}</td>
                    <td>${new Date(call.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td><span class="status-badge ${status}">${statusText}</span></td>
                    <td>${call.duration || 'N/A'}</td>
                    <td>${call.recording_url ? '<a href="' + call.recording_url + '" target="_blank">Listen</a>' : 'N/A'}</td>
                    <td>
                        <button class="individual-download-btn" onclick="downloadCallReport('${call.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </td>
                `;
                callsTableBody.appendChild(row);
            });
            
            console.log(`Loaded ${data.calls.length} calls successfully`);
        } catch (error) {
            console.error('Error loading calls:', error);
            const callsTableBody = document.querySelector('#callsTable tbody');
            if (callsTableBody) {
                callsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: red;">Error loading calls: ${error.message}</td></tr>`;
            }
        }
    };

    // Load responses data
    const loadResponsesData = async () => {
        try {
            console.log('Loading responses data...');
            const response = await fetch('/api/responses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Responses response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Responses response error:', errorText);
                throw new Error(`Failed to fetch responses: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Responses data received:', data);
            
            const responsesTableBody = document.querySelector('#responsesTable tbody');
            if (!responsesTableBody) {
                console.error('Responses table body not found!');
                return;
            }
            
            responsesTableBody.innerHTML = '';
            
            if (!data.responses || data.responses.length === 0) {
                responsesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No responses found</td></tr>';
                return;
            }
            
            data.responses.forEach(resp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${resp.id || 'N/A'}</td>
                    <td>${resp.callSid || 'N/A'}</td>
                    <td>${resp.userName || 'N/A'}</td>
                    <td>${resp.phone || 'N/A'}</td>
                    <td>${resp.answers ? resp.answers.length : 0}</td>
                    <td>${new Date(resp.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td><span class="status-badge completed">Completed</span></td>
                    <td>
                        <button class="individual-download-btn" onclick="downloadResponseReport('${resp.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </td>
                `;
                responsesTableBody.appendChild(row);
            });
            
            console.log(`Loaded ${data.responses.length} responses successfully`);
        } catch (error) {
            console.error('Error loading responses:', error);
            const responsesTableBody = document.querySelector('#responsesTable tbody');
            if (responsesTableBody) {
                responsesTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: red;">Error loading responses: ${error.message}</td></tr>`;
            }
        }
    };

    // Load analytics data
    const loadAnalyticsData = async () => {
        try {
            const [usersResponse, callsResponse] = await Promise.all([
                fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/calls', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!usersResponse.ok || !callsResponse.ok) throw new Error('Failed to fetch analytics data');
            
            const usersData = await usersResponse.json();
            const callsData = await callsResponse.json();
            
            const totalUsers = usersData.users.length;
            const totalCalls = callsData.calls.length;
            const completedCalls = callsData.calls.filter(call => call.completed).length;
            const failedCalls = callsData.calls.filter(call => call.failed).length;
            
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('totalCalls').textContent = totalCalls;
            document.getElementById('completedCalls').textContent = completedCalls;
            document.getElementById('failedCalls').textContent = failedCalls;
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    // Download functions (global scope for onclick handlers)
    window.downloadCallReport = async (callId) => {
        try {
            const response = await fetch(`/api/download-call-report/${callId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download call report');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `call_report_${callId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert(`Error downloading call report: ${error.message}`);
        }
    };

    window.downloadResponseReport = async (responseId) => {
        try {
            const response = await fetch(`/api/download-response-report/${responseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download response report');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `response_report_${responseId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert(`Error downloading response report: ${error.message}`);
        }
    };

    // Download all reports button
    const downloadAllReportsBtn = document.getElementById('downloadAllReportsBtn');
    downloadAllReportsBtn.addEventListener('click', async () => {
        try {
            downloadAllReportsBtn.disabled = true;
            downloadAllReportsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-all-reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download all reports');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all_reports_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('All reports downloaded successfully!');
        } catch (error) {
            alert(`Error downloading all reports: ${error.message}`);
        } finally {
            downloadAllReportsBtn.disabled = false;
            downloadAllReportsBtn.innerHTML = '<i class="fas fa-download"></i> Download All Reports';
        }
    });

    // Refresh reports button
    const refreshReportsBtn = document.getElementById('refreshReportsBtn');
    refreshReportsBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            loadTabData(activeTab.dataset.tab);
        }
    });

    // Individual tab download buttons
    const downloadCallsBtn = document.getElementById('downloadCallsBtn');
    downloadCallsBtn.addEventListener('click', async () => {
        try {
            downloadCallsBtn.disabled = true;
            downloadCallsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-calls-report', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download calls report');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calls_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Calls report downloaded successfully!');
        } catch (error) {
            alert(`Error downloading calls report: ${error.message}`);
        } finally {
            downloadCallsBtn.disabled = false;
            downloadCallsBtn.innerHTML = '<i class="fas fa-download"></i> Download Calls';
        }
    });

    const downloadResponsesTabBtn = document.getElementById('downloadResponsesTabBtn');
    downloadResponsesTabBtn.addEventListener('click', async () => {
        try {
            downloadResponsesTabBtn.disabled = true;
            downloadResponsesTabBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-responses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download responses');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `responses_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Responses report downloaded successfully!');
        } catch (error) {
            alert(`Error downloading responses report: ${error.message}`);
        } finally {
            downloadResponsesTabBtn.disabled = false;
            downloadResponsesTabBtn.innerHTML = '<i class="fas fa-download"></i> Download Responses';
        }
    });

    const downloadUsersBtn = document.getElementById('downloadUsersBtn');
    downloadUsersBtn.addEventListener('click', async () => {
        try {
            downloadUsersBtn.disabled = true;
            downloadUsersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch('/api/download-users-analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to download users analytics');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('Users analytics downloaded successfully!');
        } catch (error) {
            alert(`Error downloading users analytics: ${error.message}`);
        } finally {
            downloadUsersBtn.disabled = false;
            downloadUsersBtn.innerHTML = '<i class="fas fa-download"></i> Download Analytics';
        }
    });

    // Load initial reports data
    console.log('Loading initial reports data...');
    loadTabData('calls');

    // Load and display responses
    async function loadResponses() {
        try {
            console.log('🔍 Loading responses...');
            const response = await fetch('/api/responses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Responses data:', data);
            
            if (data.success && data.responses) {
                displayResponses(data.responses);
            } else {
                console.error('❌ Failed to load responses:', data.message);
                document.getElementById('responsesTable').innerHTML = '<tr><td colspan="8" class="no-data">No response data available</td></tr>';
            }
        } catch (error) {
            console.error('❌ Error loading responses:', error);
            document.getElementById('responsesTable').innerHTML = '<tr><td colspan="8" class="no-data">Error loading responses</td></tr>';
        }
    }

    // Display responses in table
    function displayResponses(responses) {
        const tbody = document.querySelector('#responsesTable tbody');
        tbody.innerHTML = '';
        
        if (responses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No responses found</td></tr>';
            return;
        }
        
        responses.forEach(response => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${response.id || 'N/A'}</td>
                <td>${response.callSid || 'N/A'}</td>
                <td>${response.userName || 'N/A'}</td>
                <td>${response.phone || 'N/A'}</td>
                <td>${response.answers ? response.answers.length : 0}</td>
                <td>${new Date(response.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td><span class="status-badge completed">Completed</span></td>
                <td>
                    <button class="action-btn download-btn" onclick="downloadResponseReport('${response.id}')" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Load and display transcripts
    async function loadTranscripts() {
        try {
            console.log('🔍 Loading transcripts...');
            const response = await fetch('/api/transcripts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Transcripts data:', data);
            
            if (data.success && data.transcripts) {
                displayTranscripts(data.transcripts);
            } else {
                console.error('❌ Failed to load transcripts:', data.message);
                document.getElementById('transcriptsTable').innerHTML = '<tr><td colspan="10" class="no-data">No transcript data available</td></tr>';
            }
        } catch (error) {
            console.error('❌ Error loading transcripts:', error);
            document.getElementById('transcriptsTable').innerHTML = '<tr><td colspan="10" class="no-data">Error loading transcripts</td></tr>';
        }
    }

    // Display transcripts in table
    function displayTranscripts(transcripts) {
        const tbody = document.querySelector('#transcriptsTable tbody');
        tbody.innerHTML = '';
        
        if (transcripts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">No transcripts found</td></tr>';
            return;
        }
        
        transcripts.forEach(transcript => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transcript.id}</td>
                <td>${transcript.callSid}</td>
                <td>${transcript.userName || 'N/A'}</td>
                <td>${transcript.contactName}</td>
                <td>${transcript.phone}</td>
                <td>${new Date(transcript.callDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td>${transcript.duration}</td>
                <td>${transcript.wordsCount}</td>
                <td><span class="confidence-badge ${getConfidenceClass(transcript.confidence)}">${(transcript.confidence * 100).toFixed(1)}%</span></td>
                <td>
                    <button class="action-btn view-btn" onclick="viewTranscript('${transcript.id}')" title="View Transcript">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadTranscriptReport('${transcript.id}')" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Get confidence class for styling
    function getConfidenceClass(confidence) {
        if (confidence >= 0.9) return 'high';
        if (confidence >= 0.7) return 'medium';
        return 'low';
    }

    // View transcript details
    function viewTranscript(transcriptId) {
        // This would open a modal with detailed transcript view
        alert(`Viewing transcript ${transcriptId} - Feature coming soon!`);
    }

    // Download individual transcript report
    async function downloadTranscriptReport(transcriptId) {
        try {
            console.log(`📥 Downloading transcript report for ${transcriptId}...`);
            const response = await fetch(`/api/download-transcript/${transcriptId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_report_${transcriptId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ Transcript report downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading transcript report:', error);
            alert('Failed to download transcript report: ' + error.message);
        }
    }

    // Download all transcripts report
    async function downloadTranscriptsReport() {
        try {
            console.log('📥 Downloading all transcripts report...');
            const response = await fetch('/api/download-transcripts-report', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `transcripts_report_${timestamp}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ All transcripts report downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading transcripts report:', error);
            alert('Failed to download transcripts report: ' + error.message);
        }
    }

    // Event listeners for download buttons
    document.getElementById('downloadCallsBtn').addEventListener('click', downloadCallsReport);
    document.getElementById('downloadResponsesBtn').addEventListener('click', downloadResponsesReport);
    document.getElementById('downloadUsersBtn').addEventListener('click', downloadUsersAnalytics);
    document.getElementById('downloadResponsesTabBtn').addEventListener('click', downloadResponsesReport);
    document.getElementById('downloadTranscriptsBtn').addEventListener('click', downloadTranscriptsReport);
    document.getElementById('refreshTranscriptsBtn').addEventListener('click', () => loadTabData('transcripts'));

    // Display calls in table
    function displayCalls(calls) {
        const tbody = document.getElementById('callsTableBody');
        tbody.innerHTML = '';
        
        if (calls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No calls found</td></tr>';
            return;
        }
        
        calls.forEach(call => {
            const row = document.createElement('tr');
            const statusClass = call.completed ? 'completed' : call.failed ? 'failed' : 'pending';
            const statusText = call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending';
            
            row.innerHTML = `
                <td>${call.id}</td>
                <td>${call.name}</td>
                <td>${call.phone}</td>
                <td>${new Date(call.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${call.userName || 'N/A'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editCall('${call.id}')" title="Edit Call" ${call.completed || call.failed ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteCall('${call.id}')" title="Delete Call">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn trigger-btn" onclick="triggerCall('${call.id}')" title="Trigger Now" ${call.completed || call.failed ? 'disabled' : ''}>
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadCallReport('${call.id}')" title="Download Report">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Trigger call immediately
    async function triggerCall(callId) {
        try {
            const confirmed = confirm('Are you sure you want to trigger this call immediately?');
            if (!confirmed) {
                return;
            }
            
            console.log(`🚀 Triggering call: ${callId}`);
            
            const response = await fetch(`/api/trigger-call/${callId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to trigger call');
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Call triggered successfully');
                alert('Call triggered successfully!');
                loadCalls(); // Refresh the calls list
            } else {
                throw new Error(data.message || 'Failed to trigger call');
            }
            
        } catch (error) {
            console.error('❌ Error triggering call:', error);
            alert('Failed to trigger call: ' + error.message);
        }
    }

    // Edit call function
    async function editCall(callId) {
        try {
            console.log(`✏️ Editing call: ${callId}`);
            
            // Fetch call details
            const response = await fetch(`/api/calls/${callId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch call details');
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch call details');
            }
            
            const call = data.call;
            
            // Populate the form with existing data
            document.getElementById('contactName').value = call.name;
            document.getElementById('phoneNumber').value = call.phone;
            
            // Convert UTC time to local time for the datetime-local input
            const localTime = new Date(call.time);
            const year = localTime.getFullYear();
            const month = String(localTime.getMonth() + 1).padStart(2, '0');
            const day = String(localTime.getDate()).padStart(2, '0');
            const hours = String(localTime.getHours()).padStart(2, '0');
            const minutes = String(localTime.getMinutes()).padStart(2, '0');
            const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            document.getElementById('scheduledTime').value = localDateTime;
            
            // Change form mode to edit
            document.getElementById('scheduleForm').setAttribute('data-edit-mode', 'true');
            document.getElementById('scheduleForm').setAttribute('data-edit-id', callId);
            document.getElementById('scheduleCallBtn').textContent = 'Update Call';
            document.getElementById('scheduleCallBtn').innerHTML = '<i class="fas fa-edit"></i> Update Call';
            
            // Show cancel button
            document.getElementById('cancelEditBtn').style.display = 'inline-flex';
            
            // Scroll to form
            document.getElementById('scheduleForm').scrollIntoView({ behavior: 'smooth' });
            
            console.log('✅ Form populated for editing');
            
        } catch (error) {
            console.error('❌ Error editing call:', error);
            alert('Failed to load call details: ' + error.message);
        }
    }

    // Delete call function
    async function deleteCall(callId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this call? This action cannot be undone.');
            if (!confirmed) {
                return;
            }
            
            console.log(`🗑️ Deleting call: ${callId}`);
            
            const response = await fetch(`/api/calls/${callId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete call');
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Call deleted successfully');
                alert('Call deleted successfully!');
                loadCalls(); // Refresh the calls list
            } else {
                throw new Error(data.message || 'Failed to delete call');
            }
            
        } catch (error) {
            console.error('❌ Error deleting call:', error);
            alert('Failed to delete call: ' + error.message);
        }
    }

    // Schedule call form submission
    document.getElementById('scheduleForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const contactName = document.getElementById('contactName').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const scheduledTime = document.getElementById('scheduledTime').value;
        
        if (!contactName || !phoneNumber || !scheduledTime) {
            alert('Please fill in all fields');
            return;
        }
        
        const isEditMode = this.getAttribute('data-edit-mode') === 'true';
        const editId = this.getAttribute('data-edit-id');
        
        try {
            const scheduleData = {
                name: contactName,
                phone: phoneNumber,
                time: new Date(scheduledTime).toISOString()
            };
            
            const url = isEditMode ? `/api/calls/${editId}` : '/api/schedule-call';
            const method = isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(scheduleData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(isEditMode ? 'Call updated successfully!' : 'Call scheduled successfully!');
                this.reset();
                
                // Reset form mode
                this.removeAttribute('data-edit-mode');
                this.removeAttribute('data-edit-id');
                document.getElementById('scheduleCallBtn').textContent = 'Schedule Call';
                document.getElementById('scheduleCallBtn').innerHTML = '<i class="fas fa-phone"></i> Schedule Call';
                
                loadCalls(); // Refresh the calls list
            } else {
                alert(data.message || 'Failed to schedule call');
            }
        } catch (error) {
            console.error('Error scheduling call:', error);
            alert('Failed to schedule call: ' + error.message);
        }
    });

    // Cancel edit function
    function cancelEdit() {
        const form = document.getElementById('scheduleForm');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        // Reset form
        form.reset();
        
        // Reset form mode
        form.removeAttribute('data-edit-mode');
        form.removeAttribute('data-edit-id');
        
        // Reset button text
        document.getElementById('scheduleCallBtn').textContent = 'Schedule Call';
        document.getElementById('scheduleCallBtn').innerHTML = '<i class="fas fa-phone"></i> Schedule Call';
        
        // Hide cancel button
        cancelBtn.style.display = 'none';
        
        console.log('✅ Edit mode cancelled');
    }

    // Event listener for cancel edit button
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    // Questions Management
    let questions = [];

    // Load questions
    async function loadQuestions() {
        try {
            console.log('🔍 Loading questions...');
            console.log('Token:', token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/questions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📊 Questions data:', data);
            
            if (data.success && data.questions) {
                questions = data.questions;
                console.log('✅ Questions loaded successfully:', questions);
                displayQuestions();
            } else {
                console.error('❌ Failed to load questions:', data.message);
                questions = [];
                displayQuestions();
            }
        } catch (error) {
            console.error('❌ Error loading questions:', error);
            console.error('Error details:', error.stack);
            questions = [];
            displayQuestions();
        }
    }

    // Display questions
    function displayQuestions() {
        const questionsList = document.getElementById('questionsList');
        if (!questionsList) {
            console.error('❌ Questions list element not found');
            return;
        }
        
        questionsList.innerHTML = '';
        
        if (questions.length === 0) {
            questionsList.innerHTML = '<div class="no-questions">No questions defined. Add some questions to get started.</div>';
            return;
        }
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.innerHTML = `
                <div class="question-content">
                    <span class="question-number">${index + 1}.</span>
                    <input type="text" class="question-input" value="${question}" data-index="${index}" placeholder="Enter question text...">
                </div>
                <div class="question-actions">
                    <button class="action-btn move-up-btn" data-index="${index}" data-direction="up" ${index === 0 ? 'disabled' : ''} title="Move Up">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="action-btn move-down-btn" data-index="${index}" data-direction="down" ${index === questions.length - 1 ? 'disabled' : ''} title="Move Down">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="action-btn delete-btn" data-index="${index}" title="Delete Question">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            questionsList.appendChild(questionDiv);
        });

        // Add event listeners for the buttons
        addQuestionEventListeners();
    }

    // Add event listeners for question actions
    function addQuestionEventListeners() {
        // Move up buttons
        document.querySelectorAll('.move-up-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                moveQuestion(index, 'up');
            });
        });

        // Move down buttons
        document.querySelectorAll('.move-down-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                moveQuestion(index, 'down');
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                deleteQuestion(index);
            });
        });

        // Input change listeners
        document.querySelectorAll('.question-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const value = e.currentTarget.value;
                questions[index] = value;
            });
        });
    }

    // Add question
    function addQuestion() {
        questions.push('New question');
        displayQuestions();
        
        // Focus on the new question input
        setTimeout(() => {
            const newQuestionInput = document.querySelector(`[data-index="${questions.length - 1}"]`);
            if (newQuestionInput) {
                newQuestionInput.focus();
                newQuestionInput.select();
            }
        }, 100);
    }

    // Delete question
    function deleteQuestion(index) {
        const confirmed = confirm('Are you sure you want to delete this question?');
        if (confirmed) {
            questions.splice(index, 1);
            displayQuestions();
        }
    }

    // Move question
    function moveQuestion(index, direction) {
        if (direction === 'up' && index > 0) {
            [questions[index], questions[index - 1]] = [questions[index - 1], questions[index]];
        } else if (direction === 'down' && index < questions.length - 1) {
            [questions[index], questions[index + 1]] = [questions[index + 1], questions[index]];
        }
        displayQuestions();
    }

    // Save questions
    async function saveQuestions() {
        try {
            // Get all question inputs
            const questionInputs = document.querySelectorAll('.question-input');
            const updatedQuestions = Array.from(questionInputs).map(input => input.value.trim()).filter(q => q !== '');
            
            if (updatedQuestions.length === 0) {
                alert('Please add at least one question before saving.');
                return;
            }
            
            console.log('💾 Saving questions...');
            const response = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: updatedQuestions })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save questions');
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Questions saved successfully');
                alert('Questions saved successfully!');
                questions = updatedQuestions;
            } else {
                throw new Error(data.message || 'Failed to save questions');
            }
            
        } catch (error) {
            console.error('❌ Error saving questions:', error);
            alert('Failed to save questions: ' + error.message);
        }
    }

    // Event listeners for questions management
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const saveQuestionsBtn = document.getElementById('saveQuestionsBtn');
    
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', addQuestion);
    }
    
    if (saveQuestionsBtn) {
        saveQuestionsBtn.addEventListener('click', saveQuestions);
    }

    // Load questions on page load
    loadQuestions();
}); 