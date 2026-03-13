// ═══════════════════════════════════════════════════════
// POSLY iOS — Login Page
// ═══════════════════════════════════════════════════════

function initLoginPage() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');

    // Check if biometric credentials saved
    checkBiometricAvailability();

    // Init Google Auth
    initGoogleAuth();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';
        btnLogin.classList.add('loading');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            errorDiv.textContent = 'E-posta ve şifre gerekli.';
            btnLogin.classList.remove('loading');
            return;
        }

        try {
            const result = await apiLogin(email, password);

            // Save credentials for biometric login
            saveBiometricCredentials(email, password);

            btnLogin.classList.remove('loading');
            onLoginSuccess(result);
        } catch (err) {
            errorDiv.textContent = err.message;
            btnLogin.classList.remove('loading');

            // Shake animation
            form.style.animation = 'shake 0.4s ease';
            setTimeout(() => form.style.animation = '', 400);
        }
    });
}

function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 01-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

// ─── Biometric Auth ───
function checkBiometricAvailability() {
    const btnBio = document.getElementById('btn-biometric');
    const saved = localStorage.getItem('posly_ios_bio_creds');

    if (saved) {
        btnBio.style.display = 'flex';
    } else {
        btnBio.style.display = 'none';
    }
}

function saveBiometricCredentials(email, password) {
    // Store encrypted (base64 for now — in production use Keychain via Capacitor plugin)
    const creds = btoa(JSON.stringify({ email, password }));
    localStorage.setItem('posly_ios_bio_creds', creds);
    document.getElementById('btn-biometric').style.display = 'flex';
}

async function biometricLogin() {
    const saved = localStorage.getItem('posly_ios_bio_creds');
    if (!saved) return;

    try {
        // Use Credential Management API for biometric prompt
        // On real iOS device with Capacitor, this would use BiometricAuth plugin
        if (window.PublicKeyCredential || navigator.credentials) {
            // Simple approach: just attempt the login with stored creds
            const creds = JSON.parse(atob(saved));

            const btnLogin = document.getElementById('btn-login');
            btnLogin.classList.add('loading');

            try {
                const result = await apiLogin(creds.email, creds.password);
                btnLogin.classList.remove('loading');
                onLoginSuccess(result);
            } catch (err) {
                btnLogin.classList.remove('loading');
                document.getElementById('login-error').textContent = err.message;
                // Clear bad credentials
                localStorage.removeItem('posly_ios_bio_creds');
                document.getElementById('btn-biometric').style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Biometric error:', err);
    }
}

function showForgotPassword() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        document.getElementById('login-error').textContent = 'Lütfen önce e-posta adresinizi girin.';
        return;
    }

    apiForgotPassword(email).then(() => {
        showToast('Şifre sıfırlama bağlantısı e-postanıza gönderildi.', 'success');
    }).catch(err => {
        document.getElementById('login-error').textContent = err.message;
    });
}

async function initGoogleAuth() {
    try {
        const config = await apiGetConfig();
        const googleClientId = config.googleClientId;

        if (googleClientId && window.google) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                ux_mode: 'popup',
                callback: async (response) => {
                    const errorDiv = document.getElementById('login-error');
                    const btnLogin = document.getElementById('btn-login');
                    errorDiv.textContent = '';
                    btnLogin.classList.add('loading');

                    try {
                        const payload = JSON.parse(atob(response.credential.split('.')[1]));
                        const result = await apiGoogleAuth({
                            googleId: payload.sub,
                            email: payload.email,
                            firstName: payload.given_name || '',
                            lastName: payload.family_name || '',
                            profileImage: payload.picture || '',
                        });
                        btnLogin.classList.remove('loading');
                        onLoginSuccess(result);
                    } catch (err) {
                        btnLogin.classList.remove('loading');
                        errorDiv.textContent = err.message || 'Google giriş başarısız.';
                    }
                }
            });

            window.google.accounts.id.renderButton(
                document.getElementById('googleAuthBtn'),
                { theme: "outline", size: "large", width: "100%", text: "continue_with" }
            );
        }
    } catch (err) {
        console.error('Google Config Error:', err);
    }
}

// Add shake keyframe
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }`;
document.head.appendChild(shakeStyle);
