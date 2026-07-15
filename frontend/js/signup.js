async function signupUser() {
    const name     = document.getElementById('name')?.value?.trim() || '';
    const email    = document.getElementById('email')?.value?.trim() || '';
    const phone    = document.getElementById('phone')?.value?.trim() || '';
    const password = document.getElementById('password')?.value || '';

    if (!name || !email || !password) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showToast(`Signup failed: ${data.detail || data.error || 'Unknown error'}`, 'error');
            return;
        }

        // Email verification required — show message, do NOT log in
        if (data.email_verification_required) {
            const container = document.getElementById('signupForm')?.closest('.container')
                           || document.querySelector('.container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:10px 0;">
                        <div style="font-size:52px;margin-bottom:18px;">📧</div>
                        <h2 style="color:#0077c8;margin-bottom:14px;">Check your email</h2>
                        <p style="color:#555;font-size:15px;line-height:1.7;margin-bottom:20px;">
                            We've sent a verification link to<br>
                            <strong>${escapeHtml ? escapeHtml(email) : email}</strong><br><br>
                            Click the link in the email to activate your account.
                        </p>
                        <p style="font-size:13px;color:#888;margin-bottom:6px;">Didn't receive it?</p>
                        <a href="/resend-verification"
                           style="color:#FF7F11;font-weight:600;font-size:14px;text-decoration:none;">
                            Resend verification email
                        </a>
                        <div style="margin-top:20px;">
                            <a href="/login" style="color:#0077c8;font-size:14px;">Back to Login</a>
                        </div>
                    </div>
                `;
            } else {
                showToast('Account created! Check your email to verify before logging in.', 'success', 6000);
                window.location.href = '/login';
            }
            return;
        }

        // Admin accounts created via backend bypass verification — log them in directly
        if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role || 'user');
            localStorage.setItem('user_id', data.user_id || '');
            window.location.href = '/dashboard';
        }

    } catch (err) {
        console.error('Signup error', err);
        showToast('Network error. Please try again.', 'error');
    }
}
window.signupUser = signupUser;
