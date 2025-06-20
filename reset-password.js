document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const tokenInput = document.getElementById('resetTokenPage');
    const newPasswordInput = document.getElementById('resetNewPasswordPage');
    const resultDiv = document.getElementById('resetPageResult');
    const API_BASE_URL = window.location.origin;

    // If token is in URL, prefill
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) {
        tokenInput.value = urlParams.get('token');
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const token = tokenInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        if (!token || !newPassword) {
            resultDiv.textContent = 'All fields are required.';
            resultDiv.style.color = '#ef4444';
            return;
        }
        resultDiv.textContent = 'Processing...';
        resultDiv.style.color = '#6b7280';
        try {
            const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await res.json();
            if (data.success) {
                resultDiv.textContent = 'Password reset successful! You can now log in.';
                resultDiv.style.color = '#10b981';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                resultDiv.textContent = data.message || 'Error.';
                resultDiv.style.color = '#ef4444';
            }
        } catch (err) {
            resultDiv.textContent = 'Network error.';
            resultDiv.style.color = '#ef4444';
        }
    });
}); 