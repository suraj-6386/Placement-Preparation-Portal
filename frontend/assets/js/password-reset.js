function setMessage(element, message) {
    element.textContent = message;
    element.classList.remove('d-none');
}

function hideMessage(element) {
    element.classList.add('d-none');
    element.textContent = '';
    const warning = element.nextElementSibling;
    if (warning && warning.dataset.deliveryWarning === 'true') {
        warning.remove();
    }
}

function setDeliveryWarning(element) {
    const existingWarning = element.nextElementSibling;
    if (existingWarning && existingWarning.dataset.deliveryWarning === 'true') {
        existingWarning.remove();
    }
    const warning = document.createElement('div');
    warning.className = 'delivery-note small mt-1';
    warning.dataset.deliveryWarning = 'true';
    warning.textContent = "Please check your Spam/Junk folder if you don't find the email in your inbox.";
    element.insertAdjacentElement('afterend', warning);
}

const passwordRequirementsMessage = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';
function isStrongPassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.passwordToggle);
    if (!input) return;
    toggle.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        toggle.title = isHidden ? 'Hide password' : 'Show password';
    });
});

const forgotForm = document.getElementById('forgotPasswordForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        const error = document.getElementById('forgotError');
        const success = document.getElementById('forgotSuccess');
        const submit = document.getElementById('forgotSubmit');
        hideMessage(error);
        hideMessage(success);

        if (!email) {
            setMessage(error, 'Please enter your email address.');
            return;
        }

        submit.disabled = true;
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.detail || data.message || 'Unable to send reset link.');
            setMessage(success, data.message);
            setDeliveryWarning(success);
            forgotForm.reset();
        } catch (requestError) {
            setMessage(error, requestError.message || 'Unable to send reset link. Please try again.');
        } finally {
            submit.disabled = false;
        }
    });
}

const resetForm = document.getElementById('resetPasswordForm');
if (resetForm) {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = document.getElementById('newPassword').value;
        const confirmation = document.getElementById('confirmPassword').value;
        const error = document.getElementById('resetError');
        const success = document.getElementById('resetSuccess');
        const submit = document.getElementById('resetSubmit');
        hideMessage(error);
        hideMessage(success);

        if (!token) {
            setMessage(error, 'This reset link is invalid or expired.');
            return;
        }
        if (!isStrongPassword(password)) {
            setMessage(error, passwordRequirementsMessage);
            return;
        }
        if (password !== confirmation) {
            setMessage(error, 'Passwords do not match.');
            return;
        }

        submit.disabled = true;
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.message || 'Unable to reset password.');
            setMessage(success, data.message);
            resetForm.reset();
            submit.disabled = true;
        } catch (requestError) {
            setMessage(error, requestError.message || 'Unable to reset password. Please request a new link.');
            submit.disabled = false;
        }
    });
}

const verifyMessage = document.getElementById('verifyMessage');
if (verifyMessage) {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (token) {
        fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Invalid or expired verification link');
                verifyMessage.textContent = data.message;
                verifyMessage.classList.add('text-success');
            })
            .catch((error) => {
                verifyMessage.textContent = error.message || 'Invalid or expired verification link';
                verifyMessage.classList.add('text-danger');
            });
    } else {
        verifyMessage.textContent = 'Invalid or expired verification link.';
        verifyMessage.classList.add('text-danger');
    }
}

const resendVerificationForm = document.getElementById('resendVerificationForm');
if (resendVerificationForm) {
    resendVerificationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('verificationEmail').value.trim();
        const error = document.getElementById('verificationError');
        const success = document.getElementById('verificationSuccess');
        const submit = document.getElementById('verificationSubmit');
        hideMessage(error);
        hideMessage(success);

        if (!email) {
            setMessage(error, 'Please enter your email address.');
            return;
        }

        submit.disabled = true;
        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.detail || data.message || 'Unable to send verification email.');
            setMessage(success, data.message);
            setDeliveryWarning(success);
            resendVerificationForm.reset();
        } catch (requestError) {
            setMessage(error, requestError.message || 'Unable to send verification email. Please try again.');
        } finally {
            submit.disabled = false;
        }
    });
}
