// js/ui.js - Funções de interface do usuário

/**
 * Exibe uma notificação toast
 * @param {string} msg - Mensagem a exibir
 * @param {string} type - Tipo: 'success', 'error', 'info'
 */
export function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${escapeHTML(msg)}</span>
    `;
    
    // Cria container se não existir
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    // Remove após 5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formata data para exibição amigável
 * @param {Date|string} date - Data a formatar
 */
export function formatDate(date) {
    const dataObj = new Date(date);
    const agora = new Date();
    const diffMinutos = Math.floor((agora - dataObj) / (1000 * 60));
    
    if (diffMinutos < 60) return `${diffMinutos} min atrás`;
    if (diffMinutos < 1440) return `${Math.floor(diffMinutos / 60)}h atrás`;
    return dataObj.toLocaleDateString('pt-BR');
}

/**
 * Obtém ícone para categoria
 * @param {string} categoria - Categoria da notícia
 */
export function getCategoryIcon(categoria) {
    const icones = {
        politica: 'landmark',
        descasos: 'exclamation-triangle',
        crimes: 'gavel',
        games: 'gamepad',
        denuncias: 'bullhorn',
        saude: 'heartbeat'
    };
    return icones[categoria] || 'newspaper';
}

/**
 * Exibe modal de loading
 * @param {boolean} show - Mostrar ou esconder
 */
export function showLoading(show = true) {
    let loading = document.querySelector('.loading-overlay');
    
    if (show) {
        if (!loading) {
            loading = document.createElement('div');
            loading.className = 'loading-overlay';
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Carregando...</p>
            `;
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    } else if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * Atualiza interface do usuário baseado no estado de login
 * @param {Object} user - Usuário atual ou null
 */
export function updateUserUI(user) {
    const userInfo = document.getElementById('user-info');
    const publishBtn = document.getElementById('btn-abrir-modal');
    
    if (!userInfo) return;
    
    if (user) {
        userInfo.innerHTML = `
            <div class="user-menu">
                <span class="user-name">
                    <i class="fas fa-user-check"></i> ${user.displayName || user.email}
                </span>
                <button class="logout-btn" title="Sair">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.title = "Publicar nova notícia";
        }
    } else {
        userInfo.innerHTML = `<i class="fas fa-user"></i> Visitante`;
        
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.title = "Faça login para publicar notícias";
        }
    }
}

/**
 * Cria elementos DOM de forma segura
 * @param {string} html - HTML a ser criado
 * @returns {DocumentFragment} Fragmento DOM seguro
 */
export function createSafeHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.cloneNode(true);
}