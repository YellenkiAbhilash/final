document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.email) {
        // Redirect to login if not authenticated
        window.location.href = '/';
        return;
    }

    // Update user information in the dashboard
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('welcomeMessage').textContent = `Welcome, ${user.name}!`;
    const userCredits = document.getElementById('userCredits');
    const dashboardCredits = document.getElementById('dashboardCredits');
    function updateCreditsDisplay(credits) {
        if (userCredits) userCredits.textContent = `Credits: ${credits ?? 0}`;
        if (dashboardCredits) dashboardCredits.textContent = credits ?? 0;
        if (infoBox) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-user'></i> Welcome, ${user.name || user.email}!</div><div class='info-box-content'>You have <strong>${credits ?? 0} credits</strong>. Use the options above to manage your account.</div>`;
        }
    }

    // Fetch latest user profile from backend and update credits
    async function refreshUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateCreditsDisplay(data.user.credits);
                }
            }
        } catch (err) {
            // Ignore network errors for now
        }
    }
    refreshUserProfile();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function() {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/';
    });

    // Contact Admin functionality
    document.getElementById('contactAdminBtn').addEventListener('click', function() {
        const infoBox = document.getElementById('infoBoxMessage');
        if (infoBox) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-headset'></i> Contact Admin</div><div class='info-box-content'>Email: <a href='mailto:admin@example.com'>admin@example.com</a><br>Phone: <a href='tel:+1234567890'>+1 234 567 890</a></div>`;
        }
        showNotification('Contact information displayed in info box', 'info');
    });

    // Get main elements
    const dashboardInfoBox = document.getElementById('dashboardInfoBox');
    const infoBox = document.getElementById('infoBoxMessage');
    const questionsSection = document.getElementById('questionsSection');
    const statCards = document.querySelectorAll('.stat-card');

    createScheduleCallModal(); // Ensure modal is created on page load

    // Centralized click handler for stat cards
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            if (title === 'Questions') {
                toggleQuestionsSection();
            } else if (title === 'Scheduling Call') {
                showScheduleCallForm();
            } else if (title === 'Scheduled Calls') {
                loadScheduledCalls();
            } else if (title === 'Report') {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Your report will appear here. (Feature coming soon!)</div>`;
            }
        });
    });

    // Question Section Management
    const questionsList = document.getElementById('questionsList');
    const addQuestionForm = document.getElementById('addQuestionForm');
    let sortableInstance = null; // To hold the Sortable instance

    // Edit Modal Elements
    const editModal = document.getElementById('editQuestionModal');
    const editForm = document.getElementById('editQuestionForm');
    const editQuestionId = document.getElementById('editQuestionId');
    const editQuestionText = document.getElementById('editQuestionText');
    const closeEditModalBtn = document.getElementById('closeEditQuestionModal');
    const cancelEditBtn = document.getElementById('cancelEditQuestion');

    function openEditModal(id, text) {
        editQuestionId.value = id;
        editQuestionText.value = text;
        editModal.style.display = 'block';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
    }

    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    // Toggle function for the Questions Section
    async function toggleQuestionsSection() {
        const isHidden = questionsSection.style.display === 'none';
        if (isHidden) {
            await loadQuestionsList(); // This now also initializes SortableJS
        }
        questionsSection.style.display = isHidden ? 'block' : 'none';
        dashboardInfoBox.style.display = isHidden ? 'none' : 'block';
    }

    async function loadQuestionsList() {
        try {
            const response = await fetch('/api/questions');
            const data = await response.json();
            
            if (data.success) {
                const questionsHtml = data.questions.map(q => `
                    <div class="question-item" data-question-id="${q.id}">
                        <div class="question-content">
                            <i class="fas fa-grip-vertical drag-handle"></i>
                            <span class="question-text">${q.question}</span>
                        </div>
                        <div class="question-actions">
                            <button class="btn-icon btn-edit" title="Edit Question"><i class="fas fa-pencil-alt"></i></button>
                            <button class="btn-icon btn-delete" title="Delete Question"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `).join('');
                questionsList.innerHTML = questionsHtml || '<p style="text-align: center; color: #6b7280; padding: 2rem;">No questions have been added yet.</p>';
                
                // Initialize or re-initialize SortableJS
                if (sortableInstance) {
                    sortableInstance.destroy();
                }
                sortableInstance = new Sortable(questionsList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'sortable-ghost',
                    onEnd: handleDragEnd,
                });
            } else {
                 questionsList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Unable to load questions.</p>';
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            questionsList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Unable to load questions. Please try again later.</p>';
        }
    }

    // Event listener for actions on the questions list
    questionsList.addEventListener('click', function(e) {
        const editButton = e.target.closest('.btn-edit');
        if (editButton) {
            const questionItem = editButton.closest('.question-item');
            const id = questionItem.dataset.questionId;
            const text = questionItem.querySelector('.question-text').textContent;
            openEditModal(id, text);
            return;
        }

        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const questionItem = deleteButton.closest('.question-item');
            const id = questionItem.dataset.questionId;
            handleDelete(id);
        }
    });

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }
        try {
            const response = await fetch(`/api/questions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('Question deleted successfully!', 'success');
                loadQuestionsList(); // Reload the list
            } else {
                showNotification(data.message || 'Failed to delete question', 'error');
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            showNotification('An error occurred while deleting.', 'error');
        }
    }

    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = editQuestionId.value;
        const question = editQuestionText.value.trim();

        if (!question) {
            showNotification('Question cannot be empty', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/questions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('Question updated successfully!', 'success');
                closeEditModal();
                loadQuestionsList();
            } else {
                showNotification(data.message || 'Failed to update question', 'error');
            }
        } catch (error) {
            console.error('Error updating question:', error);
            showNotification('An error occurred while updating.', 'error');
        }
    });

    async function handleDragEnd(evt) {
        const orderedIds = Array.from(evt.target.children).map(item => item.dataset.questionId);
        try {
            const response = await fetch('/api/questions/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderedIds })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('Question order saved!', 'success');
            } else {
                showNotification(data.message || 'Failed to save order', 'error');
                loadQuestionsList(); // Revert to server state on failure
            }
        } catch (error) {
            console.error('Error saving order:', error);
            showNotification('An error occurred while saving the new order.', 'error');
            loadQuestionsList(); // Revert to server state on failure
        }
    }

    // Handle add question form submission
    addQuestionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const questionText = document.getElementById('questionText').value.trim();
        if (!questionText) {
            showNotification('Please enter a question', 'error');
            return;
        }

        try {
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question: questionText })
            });

            const data = await response.json();
            
            if (data.success) {
                showNotification('Question added successfully!', 'success');
                addQuestionForm.reset();
                await loadQuestionsList();
            } else {
                showNotification(data.message || 'Failed to add question', 'error');
            }
        } catch (error) {
            console.error('Error adding question:', error);
            showNotification('Failed to add question. Please try again.', 'error');
        }
    });

    // Verify token with backend
    verifyToken(token);

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            font-weight: 500;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    function getNotificationColor(type) {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return '#667eea';
        }
    }

    // Verify token with backend
    async function verifyToken(token) {
        try {
            const response = await fetch(`${window.location.origin}/api/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // Token is invalid, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            const data = await response.json();
            if (data.success) {
                // Token is valid, update user info if needed
                console.log('Token verified successfully');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            // On network error, we'll keep the user logged in
            // but could implement a retry mechanism
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + L for logout
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            document.getElementById('logoutBtn').click();
        }
        
        // Escape key to close any open modals
        if (e.key === 'Escape') {
            if (questionsSection.style.display === 'block') {
                toggleQuestionsSection();
            }
        }
    });

    // Add hover effects for stat cards
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Auto-refresh token (optional - implement if needed)
    // setInterval(() => {
    //     verifyToken(token);
    // }, 5 * 60 * 1000); // Check every 5 minutes

    // Show welcome message
    setTimeout(() => {
        showNotification(`Welcome back, ${user.name || user.email}!`, 'success');
    }, 1000);

    // --- Call Scheduling Modal ---
    function createScheduleCallModal() {
        const modal = document.createElement('div');
        modal.id = 'scheduleCallModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" id="closeScheduleCallModal">&times;</span>
                <h2>Schedule a Call</h2>
                <form id="scheduleCallForm">
                    <div class="form-group">
                        <label for="callName">Name:</label>
                        <input type="text" id="callName" required />
                    </div>
                    <div class="form-group">
                        <label for="callPhone">Phone:</label>
                        <input type="text" id="callPhone" required />
                    </div>
                    <div class="form-group">
                        <label for="callTime">Scheduled Time:</label>
                        <input type="datetime-local" id="callTime" required />
                    </div>
                    <button type="submit" class="btn-primary">Schedule</button>
                    <div id="scheduleCallError" class="error-message"></div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal logic
        document.getElementById('closeScheduleCallModal').onclick = () => {
            modal.style.display = 'none';
        };
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Form submit logic
        document.getElementById('scheduleCallForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('callName').value.trim();
            const phone = document.getElementById('callPhone').value.trim();
            const time = document.getElementById('callTime').value;
            const errorDiv = document.getElementById('scheduleCallError');
            errorDiv.textContent = '';
            if (!name || !phone || !time) {
                errorDiv.textContent = 'All fields are required!';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/schedule-call', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, phone, time })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Call scheduled successfully!', 'success');
                    modal.style.display = 'none';
                    await loadScheduledCalls();
                } else {
                    errorDiv.textContent = data.message || 'Failed to schedule call.';
                }
            } catch (error) {
                errorDiv.textContent = 'Failed to schedule call. Please try again.';
            }
        });
    }

    // --- Scheduled Calls Display ---
    async function loadScheduledCalls() {
        const token = localStorage.getItem('token');
        const infoBox = document.getElementById('infoBoxMessage');
        if (!token) return;
        try {
            const response = await fetch('/api/scheduled-calls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                if (data.calls.length === 0) {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>No scheduled calls.</div>`;
                } else {
                    const callsHtml = data.calls.map(call => `
                        <div class=\"scheduled-call-card\">\n                            <div class=\"call-title\">${call.name}</div>\n                            <div class=\"call-phone\">${call.phone}</div>\n                            <div class=\"call-date\">Date: ${new Date(call.scheduledTime).toLocaleString()}</div>\n                            <div class=\"call-status ${call.status}\">${call.status.charAt(0).toUpperCase() + call.status.slice(1)}</div>\n                            <div style=\"display: flex; gap: 0.5rem; justify-content: flex-end;\">\n                                <button class=\"btn-edit-call\" data-id=\"${call.id}\" ${call.status === 'completed' ? 'disabled' : ''}>Edit</button>\n                                <button class=\"btn-delete-call\" data-id=\"${call.id}\">Delete</button>\n                            </div>\n                        </div>\n                    `).join('');
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content scheduled-call-list'>${callsHtml}</div>`;
                    // Attach edit button listeners
                    document.querySelectorAll('.btn-edit-call').forEach(btn => {
                        if (btn.disabled) return;
                        btn.addEventListener('click', function() {
                            const callId = this.getAttribute('data-id');
                            const call = data.calls.find(c => c.id == callId);
                            showEditCallModal(call);
                        });
                    });
                    // Attach delete button listeners
                    document.querySelectorAll('.btn-delete-call').forEach(btn => {
                        if (btn.disabled) return;
                        btn.addEventListener('click', async function() {
                            const callId = this.getAttribute('data-id');
                            if (!confirm('Are you sure you want to delete this call?')) return;
                            try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`/api/scheduled-calls/${callId}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const data = await response.json();
                                if (data.success) {
                                    showNotification('Call deleted successfully!', 'success');
                                    loadScheduledCalls();
                                } else {
                                    showNotification(data.message || 'Failed to delete call.', 'error');
                                }
                            } catch (error) {
                                showNotification('Failed to delete call. Please try again.', 'error');
                            }
                        });
                    });
                }
            } else {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Failed to load scheduled calls.</div>`;
            }
        } catch (error) {
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Failed to load scheduled calls.</div>`;
        }
    }

    // Remove inline edit form logic and add modal popup for editing calls
    function createEditCallModal() {
        let modal = document.getElementById('editCallModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editCallModal';
            modal.className = 'modal';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" id="closeEditCallModal">&times;</span>
                    <h2>Edit Call</h2>
                    <form id="editCallForm">
                        <div class="form-group">
                            <label for="editCallName">Name:</label>
                            <input type="text" id="editCallName" required />
                        </div>
                        <div class="form-group">
                            <label for="editCallPhone">Phone:</label>
                            <input type="text" id="editCallPhone" required />
                        </div>
                        <div class="form-group">
                            <label for="editCallTime">Scheduled Time:</label>
                            <input type="datetime-local" id="editCallTime" required />
                        </div>
                        <button type="submit" class="btn-primary">Save</button>
                        <button type="button" id="cancelEditCall" class="btn-secondary">Cancel</button>
                        <div id="editCallError" class="error-message"></div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }
        // Close logic
        document.getElementById('closeEditCallModal').onclick = () => {
            modal.style.display = 'none';
        };
        document.getElementById('cancelEditCall').onclick = () => {
            modal.style.display = 'none';
        };
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    function showEditCallModal(call) {
        createEditCallModal();
        const modal = document.getElementById('editCallModal');
        document.getElementById('editCallName').value = call.name;
        document.getElementById('editCallPhone').value = call.phone;
        document.getElementById('editCallTime').value = call.scheduledTime ? call.scheduledTime.substring(0,16) : '';
        document.getElementById('editCallError').textContent = '';
        modal.style.display = 'block';
        document.getElementById('editCallForm').onsubmit = async function(e) {
            e.preventDefault();
            const name = document.getElementById('editCallName').value.trim();
            const phone = document.getElementById('editCallPhone').value.trim();
            const scheduledTime = document.getElementById('editCallTime').value;
            const errorDiv = document.getElementById('editCallError');
            errorDiv.textContent = '';
            if (!name || !phone || !scheduledTime) {
                errorDiv.textContent = 'All fields are required!';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/scheduled-calls/${call.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, phone, scheduledTime })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Call updated successfully!', 'success');
                    modal.style.display = 'none';
                    loadScheduledCalls();
                } else {
                    errorDiv.textContent = data.message || 'Failed to update call.';
                }
            } catch (error) {
                errorDiv.textContent = 'Failed to update call. Please try again.';
            }
        };
    }

    // Add function to render the inline scheduling form in the info box
    function getISTDateTimeLocalString() {
        const now = new Date();
        // Convert to IST by adding the IST offset
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const IST_OFFSET = 5.5 * 60 * 60000; // 5 hours 30 minutes in ms
        const ist = new Date(utc + IST_OFFSET);
        // Format as yyyy-MM-ddTHH:mm for datetime-local
        const pad = n => n < 10 ? '0' + n : n;
        return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}`;
    }

    function showScheduleCallForm() {
        const infoBox = document.getElementById('infoBoxMessage');
        infoBox.innerHTML = `
            <div class='schedule-call-card'>
                <h3><i class='fas fa-calendar-plus'></i> Schedule a Call</h3>
                <form id="scheduleCallForm">
                    <div class="form-group">
                        <label for="callName">Name:</label>
                        <input type="text" id="callName" placeholder="Enter name" required />
                    </div>
                    <div class="form-group">
                        <label for="callPhone">Phone:</label>
                        <input type="text" id="callPhone" placeholder="Enter phone number" required />
                    </div>
                    <div class="form-group">
                        <label for="callTime">Scheduled Time (IST):</label>
                        <input type="datetime-local" id="callTime" required />
                    </div>
                    <button type="submit" class="btn-primary">Schedule</button>
                    <div id="scheduleCallError" class="error-message"></div>
                </form>
            </div>
        `;
        // Set IST min and default value
        const callTimeInput = document.getElementById('callTime');
        const istNow = getISTDateTimeLocalString();
        callTimeInput.min = istNow;
        callTimeInput.value = istNow;
        // Attach submit handler
        document.getElementById('scheduleCallForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('callName').value.trim();
            const phone = document.getElementById('callPhone').value.trim();
            const time = document.getElementById('callTime').value;
            const errorDiv = document.getElementById('scheduleCallError');
            errorDiv.textContent = '';
            if (!name || !phone || !time) {
                errorDiv.textContent = 'All fields are required!';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/schedule-call', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, phone, time })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Call scheduled successfully!', 'success');
                    loadScheduledCalls();
                } else {
                    errorDiv.textContent = data.message || 'Failed to schedule call.';
                }
            } catch (error) {
                errorDiv.textContent = 'Failed to schedule call. Please try again.';
            }
        });
    }

    const testCallBtn = document.getElementById('testCallBtn');
    const testCallModal = document.getElementById('testCallModal');
    const closeTestCallModal = document.getElementById('closeTestCallModal');
    const cancelTestCall = document.getElementById('cancelTestCall');
    const testCallForm = document.getElementById('testCallForm');
    const testCallPhone = document.getElementById('testCallPhone');
    const testCallError = document.getElementById('testCallError');

    if (testCallBtn) {
        testCallBtn.addEventListener('click', function() {
            testCallPhone.value = '';
            testCallError.textContent = '';
            testCallModal.style.display = 'block';
            testCallPhone.focus();
        });
    }
    if (closeTestCallModal) closeTestCallModal.onclick = () => testCallModal.style.display = 'none';
    if (cancelTestCall) cancelTestCall.onclick = () => testCallModal.style.display = 'none';
    window.addEventListener('click', (event) => {
        if (event.target === testCallModal) {
            testCallModal.style.display = 'none';
        }
    });
    if (testCallForm) {
        testCallForm.onsubmit = async function(e) {
            e.preventDefault();
            const phone = testCallPhone.value.trim();
            testCallError.textContent = '';
            if (!phone) {
                testCallError.textContent = 'Please enter a phone number.';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/test-call', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ phone })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Test call initiated!', 'success');
                    testCallModal.style.display = 'none';
                } else {
                    testCallError.textContent = data.message || 'Failed to initiate test call.';
                }
            } catch (error) {
                testCallError.textContent = 'Failed to initiate test call. Please try again.';
            }
        };
    }
}); 