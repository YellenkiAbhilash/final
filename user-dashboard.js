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

    // Centralized click handler for stat cards
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;

            if (title === 'Questions') {
                toggleQuestionsSection();
            } else {
                // This handles all other cards: Scheduling, Scheduled Calls, Report
                showNotification(`${title} feature coming soon!`, 'info');

                // Ensure the questions section is hidden and the info box is visible
                questionsSection.style.display = 'none';
                dashboardInfoBox.style.display = 'block';

                // Update the info box content based on the card clicked
                if (title === 'Scheduling Call') {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-plus'></i> Scheduling Call</div><div class='info-box-content'>Here you can schedule a new call. (Feature coming soon!)</div>`;
                } else if (title === 'Scheduled Calls') {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Your scheduled calls will appear here.<ul><li>Call with John Doe - 2024-06-25 10:00 AM</li><li>Call with Jane Smith - 2024-06-27 2:00 PM</li></ul></div>`;
                } else if (title === 'Report') {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Your report will appear here. (Feature coming soon!)</div>`;
                }
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
}); 