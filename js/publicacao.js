// js/publicacao.js
import { firebase, db, isDemoMode } from './firebase.js';
import { showToast, showLoading } from './ui.js';
import { getCurrentUser } from './auth.js';
import { obterLocalizacao } from './geo.js';
import { getReputacao, incrementReputacao } from './state.js';

// Import dinâmico para evitar dependência circular com noticias.js
async function adicionarNoticiaDemoLocal(noticia) {
    const { adicionarNoticiaDemoLocal: fn } = await import('./noticias.js');
    fn(noticia);
}

export function initPublicacao() {
    document.getElementById('btn-abrir-modal')?.addEventListener('click',  abrirModal);
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModal);
    document.querySelector('.btn-cancelar')?.addEventListener('click',     fecharModal);
    document.getElementById('form-publicar')?.addEventListener('submit',   handlePublicar);
    document.getElementById('modal-publicar')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-publicar')) fecharModal();
    });

    if (isDemoMode) {
        const btn = document.getElementById('btn-abrir-modal');
        if (btn) { btn.disabled = false; btn.title = 'Publicar notícia (modo demonstração)'; }
    }
}

async function abrirModal() {
    const modal = document.getElementById('modal-publicar');
    if (!modal) return;

    if (!isDemoMode) {
        const user = getCurrentUser();
        if (!user) { showToast('Faça login para publicar notícias.', 'error'); return; }
        try {
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists && doc.data().banido) {
                showToast('Sua conta está suspensa.', 'error'); return;
            }
        } catch (_) {}
    }

    modal.style.display = 'block';

    const avisoDemo = modal.querySelector('.aviso-demo-publicacao');
    if (avisoDemo) avisoDemo.style.display = isDemoMode ? 'flex' : 'none';

    const recaptchaContainer = modal.querySelector('.recaptcha-container');
    if (recaptchaContainer) recaptchaContainer.style.display = isDemoMode ? 'none' : 'block';

    const locInput = document.getElementById('localizacao');
    if (locInput) {
        locInput.value    = 'Obtendo localização...';
        locInput.disabled = true;
        try {
            const coords = await obterLocalizacao();
            if (coords) {
                const endereco = await coordsParaEndereco(coords.lat, coords.lon);
                locInput.value = endereco || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
                let hidden = document.getElementById('localizacaoCoords');
                if (!hidden) {
                    hidden = Object.assign(document.createElement('input'), { type: 'hidden', id: 'localizacaoCoords', name: 'localizacaoCoords' });
                    document.getElementById('form-publicar').appendChild(hidden);
                }
                hidden.value = JSON.stringify(coords);
            } else {
                locInput.value = ''; locInput.disabled = false;
                locInput.placeholder = 'Ex: Recife, PE';
            }
        } catch (_) { locInput.value = ''; locInput.disabled = false; }
    }

    if (!isDemoMode) {
        setTimeout(() => {
            if (typeof grecaptcha !== 'undefined') {
                const el = modal.querySelector('.g-recaptcha');
                if (el && !el.hasChildNodes()) {
                    grecaptcha.render(el, { sitekey: window.APP_CONFIG?.recaptchaSiteKey ?? '', theme: 'dark' });
                }
            }
        }, 400);
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-publicar');
    if (!modal) return;
    modal.style.display = 'none';
    document.getElementById('form-publicar')?.reset();
    if (!isDemoMode && typeof grecaptcha !== 'undefined') {
        try { grecaptcha.reset(); } catch (_) {}
    }
}

async function handlePublicar(e) {
    e.preventDefault();
    const titulo      = document.getElementById('titulo').value.trim();
    const conteudo    = document.getElementById('conteudo').value.trim();
    const categoria   = document.getElementById('categoria').value;
    const localizacao = document.getElementById('localizacao').value.trim();
    const coordsInput = document.getElementById('localizacaoCoords');

    if (titulo.length < 10)   { showToast('Título muito curto (mín. 10 caracteres)', 'error'); return; }
    if (conteudo.length < 50) { showToast('Conteúdo muito curto (mín. 50 caracteres)', 'error'); return; }
    if (!categoria)           { showToast('Selecione uma categoria', 'error'); return; }
    if (!localizacao)         { showToast('Localização é obrigatória', 'error'); return; }
    if (!isDemoMode && typeof grecaptcha !== 'undefined' && !grecaptcha.getResponse()) {
        showToast('Complete o reCAPTCHA', 'error'); return;
    }

    const btn = e.target.querySelector('.btn-publicar-confirm');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

    if (isDemoMode) {
        await new Promise(r => setTimeout(r, 800));
        await adicionarNoticiaDemoLocal({
            id: `demo-pub-${Date.now()}`,
            titulo, conteudo, categoria, localizacao, localizacaoCoords: null,
            autor: { id: 'demo-visitante', nome: 'Você (visitante)', reputacao: 50 },
            dataPublicacao: new Date().toISOString(),
            status: 'averiguar', pontuacao: 0, reportCount: 0,
            votos: { positivos: 0, negativos: 0, usuarios: {} }
        });
        showToast('Notícia publicada! (modo demo, não persistida)', 'success');
        fecharModal();
        btn.disabled = false; btn.innerHTML = originalHTML;
        return;
    }

    showLoading(true);
    try {
        let localizacaoCoords = null;
        if (coordsInput?.value) try { localizacaoCoords = JSON.parse(coordsInput.value); } catch (_) {}

        const user  = getCurrentUser();
        const batch = db.batch();
        const noticiaRef = db.collection('noticias').doc();
        batch.set(noticiaRef, {
            titulo, conteudo, categoria, localizacao, localizacaoCoords,
            autor: { id: user.uid, nome: user.displayName || user.email.split('@')[0], reputacao: getReputacao() },
            dataPublicacao: new Date().toISOString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'averiguar', pontuacao: 0, reportCount: 0,
            votos: { positivos: 0, negativos: 0, usuarios: {} }
        });
        batch.update(db.collection('usuarios').doc(user.uid), {
            noticiasPublicadas: firebase.firestore.FieldValue.increment(1),
            reputacao: firebase.firestore.FieldValue.increment(5)
        });
        await batch.commit();
        incrementReputacao(5);
        showToast('Notícia publicada com sucesso!', 'success');
        fecharModal();
        window.dispatchEvent(new CustomEvent('noticiaPublicada'));
    } catch (error) {
        console.error('Erro ao publicar:', error);
        showToast('Erro ao publicar. Tente novamente.', 'error');
    } finally {
        showLoading(false);
        btn.disabled = false; btn.innerHTML = originalHTML;
    }
}

async function coordsParaEndereco(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
            { headers: { 'Accept-Language': 'pt-BR' } }
        );
        if (!res.ok) throw new Error();
        const { address = {} } = await res.json();
        const cidade = address.city || address.town || address.village || '';
        return cidade && address.state ? `${cidade}, ${address.state}` : (address.state || null);
    } catch (_) { return null; }
}
