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

    // Add click handlers for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            showNotification(`${title} feature coming soon!`, 'info');
        });
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
        
        // Escape key to close any open modals (if implemented)
        if (e.key === 'Escape') {
            // Close any open modals or dropdowns
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

    // Dynamic Info Box logic
    const infoBox = document.getElementById('infoBoxMessage');
    if (statCards.length && infoBox) {
        if (statCards[0]) statCards[0].addEventListener('click', () => {
            // Scheduling Call logic
            infoBox.innerHTML = `
                <div class='info-box-title'><i class='fas fa-calendar-plus'></i> Scheduling Call</div>
                <div class='info-box-content'>
                    <form id="scheduleCallForm" class="schedule-call-form">
                        <div style="margin-bottom: 1rem;">
                            <label for="callName">Name</label><br>
                            <input type="text" id="callName" name="callName" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callPhone">Phone Number</label><br>
                            <input type="tel" id="callPhone" name="callPhone" required pattern="[0-9\\-\\+\\s\\(\\)]{7,}" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="callTime">Time</label><br>
                            <input type="datetime-local" id="callTime" name="callTime" required style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 0.25rem;">
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">Schedule</button>
                    </form>
                </div>
            `;
            // Add form submit handler
            const scheduleForm = document.getElementById('scheduleCallForm');
            if (scheduleForm) {
                scheduleForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const name = document.getElementById('callName').value.trim();
                    const phone = document.getElementById('callPhone').value.trim();
                    const time = document.getElementById('callTime').value;
                    if (!name || !phone || !time) {
                        showNotification('Please fill in all fields', 'error');
                        return;
                    }
                    try {
                        const response = await fetch('/api/schedule-call', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ name, phone, time })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                            showNotification('Call scheduled successfully!', 'success');
                            scheduleForm.reset();
                        } else {
                            showNotification(data.message || 'Failed to schedule call', 'error');
                        }
                    } catch (err) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                });
            }
        });
        if (statCards[1]) statCards[1].addEventListener('click', async () => {
            // Scheduled Calls logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Loading your scheduled calls...</div>`;
            try {
                const response = await fetch('/api/scheduled-calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    if (data.calls.length === 0) {
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>You have no scheduled calls.</div>`;
                    } else {
                        const callsList = data.calls.map(call => {
                            // Format the time for display (IST)
                            const callTime = new Date(call.time);
                            const formattedTime = callTime.toLocaleString('en-IN', { 
                                timeZone: 'Asia/Kolkata',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            const status = call.completed ? 'Completed' : call.failed ? 'Failed' : 'Pending';
                            const statusClass = call.completed ? 'completed' : call.failed ? 'failed' : 'pending';
                            
                            const triggerBtn = !call.completed && !call.failed ? 
                                `<button onclick="triggerCall(${call.id})" style="background: #667eea; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-left: 0.5rem;">Trigger Now</button>` : '';
                            
                            return `<li style="margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <strong>${call.name}</strong> (${call.phone})<br>
                                ${formattedTime}<br>
                                Status: <span class="${statusClass}">${status}</span> ${triggerBtn}
                            </li>`;
                        }).join('');
                        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'><ul style="list-style: none; padding: 0;">${callsList}</ul></div>`;
                    }
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Failed to load scheduled calls.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-calendar-check'></i> Scheduled Calls</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
        if (statCards[2]) statCards[2].addEventListener('click', () => {
            // Report logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-file-alt'></i> Report</div><div class='info-box-content'>Your report will appear here. (Feature coming soon!)</div>`;
        });
        if (statCards[3]) statCards[3].addEventListener('click', async () => {
            // Manage Questions logic
            infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Loading questions...</div>`;
            try {
                const response = await fetch('/api/questions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    renderQuestionsBox(data.questions);
                } else {
                    infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Failed to load questions.</div>`;
                }
            } catch (err) {
                infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>Network error. Please try again.</div>`;
            }
        });
    }

    // Helper to render the questions management UI
    function renderQuestionsBox(questions) {
        let html = `<div style='margin-bottom:1rem; display: flex; gap: 0.5rem; align-items: center;'>
            <button id='addQuestionBtn' style='background: #667eea; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;'>
                <i class="fas fa-plus"></i> Add Question
            </button>
            <button id='saveAllQuestionsBtn' style='background: #10b981; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;'>
                <i class="fas fa-save"></i> Save All
            </button>
        </div>`;
        
        if (questions.length === 0) {
            html += `<div style='color: #6b7280; font-style: italic; margin: 1rem 0;'>No questions defined. Add some questions to get started.</div>`;
        } else {
            html += `<div id='questionsList'>`;
            questions.forEach((q, idx) => {
                html += `<div style='margin-bottom:0.8rem; padding: 0.8rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;'>
                    <div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;'>
                        <span style='font-weight: 600; color: #374151;'>${idx + 1}.</span>
                        <input type='text' value="${q}" data-idx='${idx}' class='question-input' style='flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; font-size: 0.9rem;' placeholder='Enter question text...'>
                    </div>
                    <div style='display: flex; gap: 0.5rem; justify-content: flex-end;'>
                        <button class='deleteQuestionBtn' data-idx='${idx}' style='background: #ef4444; color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;'>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        
        infoBox.innerHTML = `<div class='info-box-title'><i class='fas fa-question'></i> Manage Questions</div><div class='info-box-content'>${html}</div>`;

        // Add event listeners
        const addQuestionBtn = document.getElementById('addQuestionBtn');
        const saveAllQuestionsBtn = document.getElementById('saveAllQuestionsBtn');
        
        if (addQuestionBtn) {
            addQuestionBtn.onclick = () => {
                const updated = [...questions, "New question"];
                renderQuestionsBox(updated);
            };
        }
        
        if (saveAllQuestionsBtn) {
            saveAllQuestionsBtn.onclick = async () => {
                const questionInputs = document.querySelectorAll('.question-input');
                const updatedQuestions = Array.from(questionInputs).map(input => input.value.trim()).filter(q => q !== '');
                
                if (updatedQuestions.length === 0) {
                    showNotification('Please add at least one question before saving.', 'error');
                    return;
                }
                
                await updateQuestions(updatedQuestions);
            };
        }
        
        document.querySelectorAll('.deleteQuestionBtn').forEach(btn => {
            btn.onclick = async (e) => {
                const confirmed = confirm('Are you sure you want to delete this question?');
                if (confirmed) {
                    const idx = parseInt(btn.dataset.idx);
                    const updated = questions.filter((_, i) => i !== idx);
                    await updateQuestions(updated);
                }
            };
        });
    }

    // Helper to update questions via backend
    async function updateQuestions(newQuestions) {
        try {
            const response = await fetch('/api/questions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ questions: newQuestions })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                renderQuestionsBox(data.questions);
                showNotification('Questions updated successfully!', 'success');
            } else {
                showNotification(data.message || 'Failed to update questions', 'error');
            }
        } catch (err) {
            console.error('Error updating questions:', err);
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Add event listener for Contact Admin button in navbar
    const contactAdminBtn = document.getElementById('contactAdminBtn');
    if (contactAdminBtn) {
        contactAdminBtn.addEventListener('click', function() {
            showNotification('admin@example.com | +1 234 567 890', 'info');
        });
    }

    // Direct Call button functionality
    document.getElementById('directCallBtn').addEventListener('click', function() {
        showDirectCallModal();
    });

    // Function to show direct call modal
    function showDirectCallModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="directCallModal" class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div class="modal-content" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                            <i class="fas fa-phone" style="color: #10b981; margin-right: 0.5rem;"></i>
                            Make Direct Call
                        </h2>
                        <button id="closeDirectCallModal" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #6b7280;
                        ">&times;</button>
                    </div>
                    
                    <form id="directCallForm">
                        <div style="margin-bottom: 1rem;">
                            <label for="directCallName" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Name</label>
                            <input type="text" id="directCallName" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="Enter name">
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label for="directCallPhone" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Phone Number</label>
                            <input type="tel" id="directCallPhone" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            " placeholder="+1234567890" pattern="[0-9\\-\\+\\s\\(\\)]{7,}">
                            <small style="color: #6b7280; font-size: 0.875rem;">Include country code (e.g., +1 for US)</small>
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button type="submit" style="
                                flex: 1;
                                background: #10b981;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-phone" style="margin-right: 0.5rem;"></i>
                                Make Call
                            </button>
                            <button type="button" id="cancelDirectCall" style="
                                flex: 1;
                                background: #6b7280;
                                color: white;
                                border: none;
                                padding: 0.75rem;
                                border-radius: 8px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('closeDirectCallModal').addEventListener('click', closeDirectCallModal);
        document.getElementById('cancelDirectCall').addEventListener('click', closeDirectCallModal);
        document.getElementById('directCallForm').addEventListener('submit', handleDirectCall);
        
        // Close modal when clicking outside
        document.getElementById('directCallModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDirectCallModal();
            }
        });
    }
    
    // Function to close direct call modal
    function closeDirectCallModal() {
        const modal = document.getElementById('directCallModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Function to handle direct call submission
    async function handleDirectCall(e) {
        e.preventDefault();
        
        const name = document.getElementById('directCallName').value.trim();
        const phone = document.getElementById('directCallPhone').value.trim();
        
        if (!name || !phone) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            // Create a call record for immediate execution
            const response = await fetch('/api/direct-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showNotification('Call initiated successfully!', 'success');
                closeDirectCallModal();
            } else {
                showNotification(data.message || 'Failed to make call', 'error');
            }
        } catch (err) {
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Function to trigger a call manually
    window.triggerCall = async function(callId) {
        try {
            const response = await fetch(`/api/trigger-call/${callId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('Call triggered successfully!', 'success');
                // Refresh the calls list
                statCards[1].click();
            } else {
                showNotification(data.message || 'Failed to trigger call', 'error');
            }
        } catch (err) {
            showNotification('Network error. Please try again.', 'error');
        }
    };
}); 