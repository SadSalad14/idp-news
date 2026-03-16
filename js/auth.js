// js/auth.js
import { firebase, auth, db, isDemoMode } from './firebase.js';
import { showToast, updateUserUI, showLoading } from './ui.js';
import { setReputacao, setCurrentUserState } from './state.js';

const RECAPTCHA_SITE_KEY = window.APP_CONFIG?.recaptchaSiteKey ?? '';

let currentAuthModal   = null;
let recaptchaWidgetIds = { login: null, register: null };

export function initAuth() {
    if (isDemoMode) {
        // Verifica se já tem um usuário demo salvo nesta sessão
        const savedUser = sessionStorage.getItem('demo_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUserState(user);
            updateUserUI(user);
        } else {
            updateUserUI(null);
        }
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

    // No modo demo mostra formulário simplificado (só nome)
    const conteudoModal = isDemoMode
        ? _htmlModalDemo(defaultTab)
        : _htmlModalReal(defaultTab);

    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-auth" class="modal">
        <div class="modal-content modal-sm">
            <button class="close-auth close">&times;</button>
            <h2><i class="fas fa-user-circle"></i> Acesso</h2>
            ${conteudoModal}
        </div>
    </div>`);

    currentAuthModal = document.getElementById('modal-auth');
    setupModalEvents(defaultTab);
    currentAuthModal.style.display = 'block';
    if (!isDemoMode) setTimeout(() => renderRecaptchaWidgets(defaultTab), 350);
}

function _htmlModalDemo(defaultTab) {
    return `
        <div class="aviso-demo-modal">
            <i class="fas fa-flask"></i>
            <span>Modo demonstração — crie um perfil fictício para testar as funcionalidades.<br>
            <small>Nenhum dado é salvo. Tudo é perdido ao fechar ou recarregar a página.</small></span>
        </div>
        <div class="login-tabs">
            <button class="login-tab ${defaultTab === 'login'    ? 'active' : ''}" data-tab="login">Entrar</button>
            <button class="login-tab ${defaultTab === 'register' ? 'active' : ''}" data-tab="register">Criar perfil</button>
        </div>
        <form id="form-login" class="login-form ${defaultTab === 'login' ? 'active' : ''}" novalidate>
            <div class="form-group">
                <label for="demo-login-nome"><i class="fas fa-user"></i> Seu nome (demo):</label>
                <input type="text" id="demo-login-nome" required minlength="2" placeholder="Ex: João Silva" autocomplete="off">
            </div>
            <p style="font-size:12px;color:var(--texto-secundario);margin-top:-10px;margin-bottom:16px">
                Use qualquer nome — não é necessário cadastro real.
            </p>
            <button type="submit" class="btn-enviar">
                <i class="fas fa-sign-in-alt"></i> Entrar como visitante
            </button>
        </form>
        <form id="form-register" class="login-form ${defaultTab === 'register' ? 'active' : ''}" novalidate>
            <div class="form-group">
                <label for="demo-reg-nome"><i class="fas fa-user"></i> Escolha um nome:</label>
                <input type="text" id="demo-reg-nome" required minlength="2" placeholder="Ex: Maria Santos" autocomplete="off">
            </div>
            <p style="font-size:12px;color:var(--texto-secundario);margin-top:-10px;margin-bottom:16px">
                Perfil de demonstração — dura apenas nesta sessão.
            </p>
            <button type="submit" class="btn-enviar">
                <i class="fas fa-user-plus"></i> Criar perfil demo
            </button>
        </form>`;
}

function _htmlModalReal(defaultTab) {
    return `
        <div class="login-tabs">
            <button class="login-tab ${defaultTab === 'login'    ? 'active' : ''}" data-tab="login">Entrar</button>
            <button class="login-tab ${defaultTab === 'register' ? 'active' : ''}" data-tab="register">Registrar</button>
        </div>
        <form id="form-login" class="login-form ${defaultTab === 'login' ? 'active' : ''}" novalidate>
            <div class="form-group">
                <label for="auth-email"><i class="fas fa-envelope"></i> E-mail:</label>
                <input type="email" id="auth-email" required autocomplete="email">
            </div>
            <div class="form-group">
                <label for="auth-password"><i class="fas fa-lock"></i> Senha:</label>
                <input type="password" id="auth-password" required minlength="6" autocomplete="current-password">
            </div>
            <div class="form-group"><div id="recaptcha-login-widget"></div></div>
            <button type="submit" class="btn-enviar">
                <i class="fas fa-sign-in-alt"></i> Entrar
            </button>
        </form>
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
            <div class="form-group"><div id="recaptcha-register-widget"></div></div>
            <button type="submit" class="btn-enviar">
                <i class="fas fa-user-plus"></i> Criar conta
            </button>
        </form>`;
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
            if (!isDemoMode) renderRecaptchaWidgets(name);
        });
    });

    if (isDemoMode) {
        // Login e registro demo usam o mesmo handler — só precisam de um nome
        currentAuthModal.querySelector('#form-login').addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = currentAuthModal.querySelector('#demo-login-nome')?.value.trim();
            if (!nome || nome.length < 2) { showToast('Digite um nome com pelo menos 2 caracteres.', 'error'); return; }
            entrarModoDemo(nome);
        });
        currentAuthModal.querySelector('#form-register').addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = currentAuthModal.querySelector('#demo-reg-nome')?.value.trim();
            if (!nome || nome.length < 2) { showToast('Escolha um nome com pelo menos 2 caracteres.', 'error'); return; }
            entrarModoDemo(nome);
        });
    } else {
        currentAuthModal.querySelector('#form-login').addEventListener('submit',   (e) => { e.preventDefault(); handleLogin(); });
        currentAuthModal.querySelector('#form-register').addEventListener('submit', (e) => { e.preventDefault(); handleRegister(); });
    }
}

function entrarModoDemo(nome) {
    const demoUser = {
        uid:         `demo-${Date.now()}`,
        displayName: nome,
        email:       null,
        isDemo:      true
    };
    sessionStorage.setItem('demo_user', JSON.stringify(demoUser));
    setCurrentUserState(demoUser);
    updateUserUI(demoUser);
    showToast(`Bem-vindo, ${nome}! (modo demo)`, 'success');
    closeAuthModal();
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
    if (isDemoMode) {
        sessionStorage.removeItem('demo_user');
        setCurrentUserState(null);
        updateUserUI(null);
        showToast('Você saiu do perfil demo.', 'info');
        return;
    }
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
    if (isDemoMode) {
        const saved = sessionStorage.getItem('demo_user');
        return saved ? JSON.parse(saved) : null;
    }
    return auth?.currentUser ?? null;
}

window.onRecaptchaLoaded = function() {
    if (currentAuthModal && !isDemoMode) {
        const tab = currentAuthModal.querySelector('.login-tab.active')?.dataset.tab || 'login';
        renderRecaptchaWidgets(tab);
    }
};
