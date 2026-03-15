// js/auth.js
import { firebase, auth, db } from './firebase.js';
import { showToast, updateUserUI, showLoading } from './ui.js';
import { setReputacaoCache } from './publicacao.js';

// ─── Configuração ────────────────────────────────────────────────────────────
// Sitekey vem de js/config.js → APP_CONFIG.recaptchaSiteKey
const RECAPTCHA_SITE_KEY = window.APP_CONFIG?.recaptchaSiteKey ?? '';

let currentAuthModal   = null;
let recaptchaWidgetIds = { login: null, register: null };

// ─── Inicialização ────────────────────────────────────────────────────────────
export function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await loadUserData(user);
            updateUserUI(user);
        } else {
            updateUserUI(null);
        }
    });

    setupAuthButtons();
    loadRecaptchaScript();

    // Logout — delegação de evento (botão é criado dinamicamente)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.logout-btn')) {
            await logout();
        }
    });
}

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────
function loadRecaptchaScript() {
    if (document.getElementById('recaptcha-script')) return;

    const script    = document.createElement('script');
    script.id       = 'recaptcha-script';
    script.src      = `https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaLoaded`;
    script.async    = true;
    script.defer    = true;
    document.head.appendChild(script);
}

function renderRecaptchaWidgets(tab) {
    if (typeof grecaptcha === 'undefined') {
        setTimeout(() => renderRecaptchaWidgets(tab), 500);
        return;
    }

    // Reseta widgets anteriores
    ['login', 'register'].forEach(t => {
        if (recaptchaWidgetIds[t] !== null) {
            try { grecaptcha.reset(recaptchaWidgetIds[t]); } catch (_) {}
        }
    });
    recaptchaWidgetIds = { login: null, register: null };

    const containerId = tab === 'login' ? 'recaptcha-login-widget' : 'recaptcha-register-widget';
    const container   = document.getElementById(containerId);
    if (!container) return;

    try {
        recaptchaWidgetIds[tab] = grecaptcha.render(container, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: 'dark',
            'expired-callback': () => showToast('Verificação expirou. Marque novamente.', 'error')
        });
    } catch (err) {
        console.error('Erro ao renderizar reCAPTCHA:', err);
    }
}

function isRecaptchaSolved(tab) {
    if (typeof grecaptcha === 'undefined') return false;
    const id = recaptchaWidgetIds[tab];
    if (id === null) return false;
    return grecaptcha.getResponse(id).length > 0;
}

// ─── Botões e Modal ───────────────────────────────────────────────────────────
function setupAuthButtons() {
    document.getElementById('btn-login')?.addEventListener('click',     () => showAuthModal('login'));
    document.getElementById('btn-registrar')?.addEventListener('click', () => showAuthModal('register'));
}

export function showAuthModal(defaultTab = 'login') {
    document.getElementById('modal-auth')?.remove();

    const modalHTML = `
    <div id="modal-auth" class="modal">
        <div class="modal-content modal-sm">
            <button class="close-auth close">&times;</button>
            <h2><i class="fas fa-user-circle"></i> Acesso</h2>

            <div class="login-tabs">
                <button class="login-tab ${defaultTab === 'login'    ? 'active' : ''}" data-tab="login">Entrar</button>
                <button class="login-tab ${defaultTab === 'register' ? 'active' : ''}" data-tab="register">Registrar</button>
            </div>

            <!-- Formulário de Login -->
            <form id="form-login" class="login-form ${defaultTab === 'login' ? 'active' : ''}" novalidate>
                <div class="form-group">
                    <label for="auth-email"><i class="fas fa-envelope"></i> E-mail:</label>
                    <input type="email" id="auth-email" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="auth-password"><i class="fas fa-lock"></i> Senha:</label>
                    <input type="password" id="auth-password" required minlength="6" autocomplete="current-password">
                </div>
                <div class="form-group">
                    <div id="recaptcha-login-widget"></div>
                </div>
                <button type="submit" class="btn-enviar">
                    <i class="fas fa-sign-in-alt"></i> Entrar
                </button>
            </form>

            <!-- Formulário de Registro -->
            <form id="form-register" class="login-form ${defaultTab === 'register' ? 'active' : ''}" novalidate>
                <div class="form-group">
                    <label for="reg-name"><i class="fas fa-user"></i> Nome:</label>
                    <input type="text" id="reg-name" required minlength="3" autocomplete="name">
                </div>
                <div class="form-group">
                    <label for="reg-email"><i class="fas fa-envelope"></i> E-mail:</label>
                    <input type="email" id="reg-email" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="reg-password"><i class="fas fa-lock"></i> Senha (mín. 6 caracteres):</label>
                    <input type="password" id="reg-password" minlength="6" required autocomplete="new-password">
                </div>
                <div class="form-group">
                    <div id="recaptcha-register-widget"></div>
                </div>
                <button type="submit" class="btn-enviar">
                    <i class="fas fa-user-plus"></i> Criar conta
                </button>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    currentAuthModal = document.getElementById('modal-auth');
    setupModalEvents(defaultTab);
    currentAuthModal.style.display = 'block';
    setTimeout(() => renderRecaptchaWidgets(defaultTab), 350);
}

function setupModalEvents(defaultTab) {
    if (!currentAuthModal) return;

    currentAuthModal.querySelector('.close-auth').addEventListener('click', closeAuthModal);
    currentAuthModal.addEventListener('click', (e) => { if (e.target === currentAuthModal) closeAuthModal(); });

    currentAuthModal.querySelectorAll('.login-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            currentAuthModal.querySelectorAll('.login-tab, .login-form').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            currentAuthModal.querySelector(`#form-${name}`).classList.add('active');
            renderRecaptchaWidgets(name);
        });
    });

    currentAuthModal.querySelector('#form-login').addEventListener('submit',   (e) => { e.preventDefault(); handleLogin(); });
    currentAuthModal.querySelector('#form-register').addEventListener('submit', (e) => { e.preventDefault(); handleRegister(); });
}

function closeAuthModal() {
    currentAuthModal?.remove();
    currentAuthModal = null;
    recaptchaWidgetIds = { login: null, register: null };
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function handleLogin() {
    const email    = currentAuthModal.querySelector('#auth-email').value.trim();
    const password = currentAuthModal.querySelector('#auth-password').value;

    if (!validateEmail(email))  { showToast('E-mail inválido', 'error'); return; }
    if (password.length < 6)    { showToast('Senha muito curta', 'error'); return; }

    if (!isRecaptchaSolved('login')) {
        showToast('Complete a verificação reCAPTCHA', 'error');
        return;
    }

    showLoading(true);
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login realizado com sucesso!', 'success');
        closeAuthModal();
    } catch (err) {
        handleAuthError(err);
    } finally {
        showLoading(false);
    }
}

// ─── Registro ─────────────────────────────────────────────────────────────────
async function handleRegister() {
    const name     = currentAuthModal.querySelector('#reg-name').value.trim();
    const email    = currentAuthModal.querySelector('#reg-email').value.trim();
    const password = currentAuthModal.querySelector('#reg-password').value;

    if (name.length < 3)       { showToast('Nome muito curto (mín. 3 caracteres)', 'error'); return; }
    if (!validateEmail(email)) { showToast('E-mail inválido', 'error'); return; }
    if (password.length < 6)   { showToast('Senha muito curta (mín. 6 caracteres)', 'error'); return; }

    if (!isRecaptchaSolved('register')) {
        showToast('Complete a verificação reCAPTCHA', 'error');
        return;
    }

    showLoading(true);
    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        await credential.user.updateProfile({ displayName: name });

        await db.collection('usuarios').doc(credential.user.uid).set({
            nome:               name,
            email:              email,
            reputacao:          50,
            noticiasPublicadas: 0,
            banido:             false,
            dataCriacao:        firebase.firestore.FieldValue.serverTimestamp(),
            localizacao:        null
        });

        showToast('Conta criada com sucesso!', 'success');
        closeAuthModal();
    } catch (err) {
        handleAuthError(err);
    } finally {
        showLoading(false);
    }
}

// ─── Dados do Usuário ─────────────────────────────────────────────────────────
async function loadUserData(user) {
    try {
        const doc = await db.collection('usuarios').doc(user.uid).get();
        if (!doc.exists) {
            await db.collection('usuarios').doc(user.uid).set({
                nome:               user.displayName || user.email.split('@')[0],
                email:              user.email,
                reputacao:          50,
                noticiasPublicadas: 0,
                banido:             false,
                dataCriacao:        firebase.firestore.FieldValue.serverTimestamp(),
                localizacao:        null
            });
            return;
        }

        // Alimenta cache de reputação em memória (evita leitura extra ao publicar)
        setReputacaoCache(doc.data().reputacao);

        // Bloqueia acesso a usuários banidos
        if (doc.data().banido) {
            showToast('Sua conta foi suspensa. Contate a moderação.', 'error');
            await auth.signOut();
        }
    } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
    }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout() {
    try {
        await auth.signOut();
        showToast('Você saiu da sua conta.', 'info');
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleAuthError(error) {
    const messages = {
        'auth/email-already-in-use':  'Este e-mail já está em uso.',
        'auth/invalid-email':         'E-mail inválido.',
        'auth/weak-password':         'Senha muito fraca (mínimo 6 caracteres).',
        'auth/wrong-password':        'Senha incorreta.',
        'auth/user-not-found':        'Usuário não encontrado.',
        'auth/too-many-requests':     'Muitas tentativas. Tente novamente mais tarde.',
        'auth/network-request-failed':'Erro de conexão. Verifique sua internet.',
        'auth/operation-not-allowed': 'Operação não permitida. Contate o suporte.'
    };
    showToast(messages[error.code] || `Erro: ${error.message}`, 'error');
}

export function getCurrentUser() {
    return auth.currentUser;
}

// Callback global quando o script reCAPTCHA termina de carregar
window.onRecaptchaLoaded = function () {
    if (currentAuthModal) {
        const activeTab = currentAuthModal.querySelector('.login-tab.active')?.dataset.tab || 'login';
        renderRecaptchaWidgets(activeTab);
    }
};
