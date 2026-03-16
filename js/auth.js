// js/auth.js
import { firebase, auth, db, isDemoMode } from './firebase.js';
import { showToast, updateUserUI, showLoading } from './ui.js';
import { setReputacao, setCurrentUserState } from './state.js';

const RECAPTCHA_SITE_KEY = window.APP_CONFIG?.recaptchaSiteKey ?? '';

let currentAuthModal   = null;
let recaptchaWidgetIds = { login: null, register: null };

export function initAuth() {
    if (isDemoMode) {
        updateUserUI(null);
        setupAuthButtons();
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        setCurrentUserState(user);
        if (user) {
            await loadUserData(user);
            updateUserUI(user);
        } else {
            updateUserUI(null);
        }
    });

    setupAuthButtons();
    loadRecaptchaScript();

    // Logout via delegação (botão é criado dinamicamente)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.logout-btn')) await logout();
    });
}

function loadRecaptchaScript() {
    if (document.getElementById('recaptcha-script')) return;
    const script  = document.createElement('script');
    script.id     = 'recaptcha-script';
    script.src    = 'https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaLoaded';
    script.async  = true;
    script.defer  = true;
    document.head.appendChild(script);
}

function renderRecaptchaWidgets(tab) {
    if (typeof grecaptcha === 'undefined') {
        setTimeout(() => renderRecaptchaWidgets(tab), 500);
        return;
    }
    ['login', 'register'].forEach(t => {
        if (recaptchaWidgetIds[t] !== null) {
            try { grecaptcha.reset(recaptchaWidgetIds[t]); } catch (_) {}
        }
    });
    recaptchaWidgetIds = { login: null, register: null };

    const container = document.getElementById(
        tab === 'login' ? 'recaptcha-login-widget' : 'recaptcha-register-widget'
    );
    if (!container) return;

    try {
        recaptchaWidgetIds[tab] = grecaptcha.render(container, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: 'dark',
            'expired-callback': () => showToast('Verificação expirou. Tente novamente.', 'error')
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

function setupAuthButtons() {
    document.getElementById('btn-login')?.addEventListener('click',     () => showAuthModal('login'));
    document.getElementById('btn-registrar')?.addEventListener('click', () => showAuthModal('register'));
}

export function showAuthModal(defaultTab = 'login') {
    document.getElementById('modal-auth')?.remove();

    const avisoDemoHTML = isDemoMode ? `
        <div class="aviso-demo-modal">
            <i class="fas fa-flask"></i>
            <span>Modo demonstração — login e cadastro não funcionam aqui.<br>
            <small>No site real esta tela conecta ao Firebase.</small></span>
        </div>` : '';

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-auth" class="modal">
        <div class="modal-content modal-sm">
            <button class="close-auth close">&times;</button>
            <h2><i class="fas fa-user-circle"></i> Acesso</h2>
            ${avisoDemoHTML}
            <div class="login-tabs">
                <button class="login-tab ${defaultTab === 'login'    ? 'active' : ''}" data-tab="login">Entrar</button>
                <button class="login-tab ${defaultTab === 'register' ? 'active' : ''}" data-tab="register">Registrar</button>
            </div>
            <form id="form-login" class="login-form ${defaultTab === 'login' ? 'active' : ''}" novalidate>
                <div class="form-group">
                    <label for="auth-email"><i class="fas fa-envelope"></i> E-mail:</label>
                    <input type="email" id="auth-email" required autocomplete="email" ${isDemoMode ? 'disabled placeholder="Desabilitado no modo demo"' : ''}>
                </div>
                <div class="form-group">
                    <label for="auth-password"><i class="fas fa-lock"></i> Senha:</label>
                    <input type="password" id="auth-password" required minlength="6" autocomplete="current-password" ${isDemoMode ? 'disabled' : ''}>
                </div>
                ${!isDemoMode ? `<div class="form-group"><div id="recaptcha-login-widget"></div></div>` : ''}
                <button type="submit" class="btn-enviar" ${isDemoMode ? 'disabled' : ''}>
                    <i class="fas fa-sign-in-alt"></i> Entrar
                </button>
            </form>
            <form id="form-register" class="login-form ${defaultTab === 'register' ? 'active' : ''}" novalidate>
                <div class="form-group">
                    <label for="reg-name"><i class="fas fa-user"></i> Nome:</label>
                    <input type="text" id="reg-name" required minlength="3" autocomplete="name" ${isDemoMode ? 'disabled placeholder="Desabilitado no modo demo"' : ''}>
                </div>
                <div class="form-group">
                    <label for="reg-email"><i class="fas fa-envelope"></i> E-mail:</label>
                    <input type="email" id="reg-email" required autocomplete="email" ${isDemoMode ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label for="reg-password"><i class="fas fa-lock"></i> Senha (mín. 6 caracteres):</label>
                    <input type="password" id="reg-password" minlength="6" required autocomplete="new-password" ${isDemoMode ? 'disabled' : ''}>
                </div>
                ${!isDemoMode ? `<div class="form-group"><div id="recaptcha-register-widget"></div></div>` : ''}
                <button type="submit" class="btn-enviar" ${isDemoMode ? 'disabled' : ''}>
                    <i class="fas fa-user-plus"></i> Criar conta
                </button>
            </form>
        </div>
    </div>`);

    currentAuthModal = document.getElementById('modal-auth');
    setupModalEvents(defaultTab);
    currentAuthModal.style.display = 'block';
    if (!isDemoMode) setTimeout(() => renderRecaptchaWidgets(defaultTab), 350);
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

async function handleLogin() {
    const email    = currentAuthModal.querySelector('#auth-email').value.trim();
    const password = currentAuthModal.querySelector('#auth-password').value;

    if (!validateEmail(email)) { showToast('E-mail inválido', 'error'); return; }
    if (password.length < 6)   { showToast('Senha muito curta', 'error'); return; }
    if (!isRecaptchaSolved('login')) { showToast('Complete o reCAPTCHA', 'error'); return; }

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

async function handleRegister() {
    const name     = currentAuthModal.querySelector('#reg-name').value.trim();
    const email    = currentAuthModal.querySelector('#reg-email').value.trim();
    const password = currentAuthModal.querySelector('#reg-password').value;

    if (name.length < 3)       { showToast('Nome muito curto (mín. 3 caracteres)', 'error'); return; }
    if (!validateEmail(email)) { showToast('E-mail inválido', 'error'); return; }
    if (password.length < 6)   { showToast('Senha muito curta (mín. 6 caracteres)', 'error'); return; }
    if (!isRecaptchaSolved('register')) { showToast('Complete o reCAPTCHA', 'error'); return; }

    showLoading(true);
    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        await credential.user.updateProfile({ displayName: name });
        await db.collection('usuarios').doc(credential.user.uid).set({
            nome: name, email,
            reputacao: 50, noticiasPublicadas: 0, banido: false,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            localizacao: null
        });
        showToast('Conta criada com sucesso!', 'success');
        closeAuthModal();
    } catch (err) {
        handleAuthError(err);
    } finally {
        showLoading(false);
    }
}

async function loadUserData(user) {
    try {
        const doc = await db.collection('usuarios').doc(user.uid).get();
        if (!doc.exists) {
            await db.collection('usuarios').doc(user.uid).set({
                nome: user.displayName || user.email.split('@')[0],
                email: user.email,
                reputacao: 50, noticiasPublicadas: 0, banido: false,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                localizacao: null
            });
            return;
        }
        setReputacao(doc.data().reputacao);
        if (doc.data().banido) {
            showToast('Sua conta foi suspensa. Contate a moderação.', 'error');
            await auth.signOut();
        }
    } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
    }
}

export async function logout() {
    try {
        await auth.signOut();
        showToast('Você saiu da sua conta.', 'info');
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleAuthError(error) {
    const messages = {
        'auth/email-already-in-use':   'Este e-mail já está em uso.',
        'auth/invalid-email':          'E-mail inválido.',
        'auth/weak-password':          'Senha fraca (mínimo 6 caracteres).',
        'auth/wrong-password':         'Senha incorreta.',
        'auth/user-not-found':         'Usuário não encontrado.',
        'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde.',
        'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    };
    showToast(messages[error.code] || `Erro: ${error.message}`, 'error');
}

export function getCurrentUser() {
    if (isDemoMode) return null;
    return auth?.currentUser ?? null;
}

window.onRecaptchaLoaded = function() {
    if (currentAuthModal) {
        const tab = currentAuthModal.querySelector('.login-tab.active')?.dataset.tab || 'login';
        renderRecaptchaWidgets(tab);
    }
};
