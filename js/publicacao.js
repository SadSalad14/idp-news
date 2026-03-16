// js/publicacao.js
import { firebase, db, isDemoMode } from './firebase.js';
import { showToast, showLoading } from './ui.js';
import { getCurrentUser } from './auth.js';
import { obterLocalizacao } from './geo.js';
import { getReputacao, incrementReputacao } from './state.js';

// adicionarNoticiaDemoLocal é importada dinamicamente para evitar ciclo:
// publicacao.js → noticias.js → auth.js → publicacao.js
async function _adicionarNoticiaDemoLocal(noticia) {
    const { adicionarNoticiaDemoLocal } = await import('./noticias.js');
    adicionarNoticiaDemoLocal(noticia);
}



// ─── Inicialização ────────────────────────────────────────────────────────────
export function initPublicacao() {
    document.getElementById('btn-abrir-modal')?.addEventListener('click',  abrirModalPublicacao);
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModalPublicacao);
    document.querySelector('.btn-cancelar')?.addEventListener('click',     fecharModalPublicacao);
    document.getElementById('form-publicar')?.addEventListener('submit',   handlePublicarNoticia);

    document.getElementById('modal-publicar')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-publicar')) fecharModalPublicacao();
    });

    // No modo demo o botão fica sempre habilitado
    if (isDemoMode) {
        const btn = document.getElementById('btn-abrir-modal');
        if (btn) {
            btn.disabled = false;
            btn.title    = 'Publicar notícia (modo demonstração)';
        }
    }
}

// ─── Abrir Modal ──────────────────────────────────────────────────────────────
async function abrirModalPublicacao() {
    const modal = document.getElementById('modal-publicar');
    if (!modal) return;

    // No modo Firebase exige login; no modo demo qualquer um pode publicar
    if (!isDemoMode) {
        const user = getCurrentUser();
        if (!user) {
            showToast('Faça login para publicar notícias.', 'error');
            return;
        }
        // Verifica banimento no Firebase
        try {
            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().banido) {
                showToast('Sua conta está suspensa e não pode publicar.', 'error');
                return;
            }
        } catch (_) {}
    }

    modal.style.display = 'block';

    // Mostra/esconde aviso de demo dentro do modal
    const avisoDemo = modal.querySelector('.aviso-demo-publicacao');
    if (avisoDemo) avisoDemo.style.display = isDemoMode ? 'flex' : 'none';

    // Esconde reCAPTCHA no modo demo
    const recaptchaContainer = modal.querySelector('.recaptcha-container');
    if (recaptchaContainer) recaptchaContainer.style.display = isDemoMode ? 'none' : 'block';

    // Obtém localização
    const localizacaoInput = document.getElementById('localizacao');
    if (localizacaoInput) {
        localizacaoInput.value    = 'Obtendo localização...';
        localizacaoInput.disabled = true;

        try {
            const coords = await obterLocalizacao();
            if (coords) {
                const endereco = await converterCoordsParaEndereco(coords.lat, coords.lon);
                localizacaoInput.value = endereco || `Lat: ${coords.lat.toFixed(4)}, Lon: ${coords.lon.toFixed(4)}`;

                let hiddenInput = document.getElementById('localizacaoCoords');
                if (!hiddenInput) {
                    hiddenInput       = document.createElement('input');
                    hiddenInput.type  = 'hidden';
                    hiddenInput.id    = 'localizacaoCoords';
                    hiddenInput.name  = 'localizacaoCoords';
                    document.getElementById('form-publicar').appendChild(hiddenInput);
                }
                hiddenInput.value = JSON.stringify(coords);
            } else {
                localizacaoInput.value       = '';
                localizacaoInput.disabled    = false;
                localizacaoInput.placeholder = 'Ex: Recife, PE';
            }
        } catch (_) {
            localizacaoInput.value    = '';
            localizacaoInput.disabled = false;
        }
    }

    // reCAPTCHA (só no modo Firebase)
    if (!isDemoMode) {
        setTimeout(() => {
            if (typeof grecaptcha !== 'undefined') {
                const el = modal.querySelector('.g-recaptcha');
                if (el && !el.hasChildNodes()) {
                    grecaptcha.render(el, {
                        sitekey: window.APP_CONFIG?.recaptchaSiteKey ?? '',
                        theme: 'dark'
                    });
                }
            }
        }, 400);
    }
}

// ─── Fechar Modal ─────────────────────────────────────────────────────────────
function fecharModalPublicacao() {
    const modal = document.getElementById('modal-publicar');
    if (!modal) return;
    modal.style.display = 'none';
    document.getElementById('form-publicar')?.reset();
    if (!isDemoMode && typeof grecaptcha !== 'undefined') {
        try { grecaptcha.reset(); } catch (_) {}
    }
}

// ─── Submissão ────────────────────────────────────────────────────────────────
async function handlePublicarNoticia(e) {
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

    if (!isDemoMode && typeof grecaptcha !== 'undefined' && grecaptcha.getResponse().length === 0) {
        showToast('Complete o reCAPTCHA', 'error');
        return;
    }

    const submitBtn    = e.target.querySelector('.btn-publicar-confirm');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

    // ── MODO DEMO ──────────────────────────────────────────────────────────
    if (isDemoMode) {
        // Simula um pequeno delay para parecer real
        await new Promise(r => setTimeout(r, 800));

        const noticiaDemo = {
            id:             `demo-pub-${Date.now()}`,
            titulo,
            conteudo,
            categoria,
            localizacao,
            localizacaoCoords: null,
            autor: { id: 'demo-visitante', nome: 'Você (visitante)', reputacao: 50 },
            dataPublicacao: new Date().toISOString(),
            status:         'averiguar',
            pontuacao:      0,
            reportCount:    0,
            votos:          { positivos: 0, negativos: 0, usuarios: {} }
        };

        await _adicionarNoticiaDemoLocal(noticiaDemo);
        showToast('Notícia publicada na demonstração! (não persistida)', 'success');
        fecharModalPublicacao();
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalHTML;
        return;
    }

    // ── MODO FIREBASE ──────────────────────────────────────────────────────
    showLoading(true);
    try {
        let localizacaoCoords = null;
        if (coordsInput?.value) {
            try { localizacaoCoords = JSON.parse(coordsInput.value); } catch (_) {}
        }

        const user  = getCurrentUser();
        const batch = db.batch();

        const noticiaRef = db.collection('noticias').doc();
        batch.set(noticiaRef, {
            titulo, conteudo, categoria, localizacao, localizacaoCoords,
            autor: {
                id:        user.uid,
                nome:      user.displayName || user.email.split('@')[0],
                reputacao: getReputacao()
            },
            dataPublicacao: new Date().toISOString(),
            timestamp:      firebase.firestore.FieldValue.serverTimestamp(),
            status:         'averiguar',
            pontuacao:      0,
            reportCount:    0,
            votos:          { positivos: 0, negativos: 0, usuarios: {} }
        });

        const usuarioRef = db.collection('usuarios').doc(user.uid);
        batch.update(usuarioRef, {
            noticiasPublicadas: firebase.firestore.FieldValue.increment(1),
            reputacao:          firebase.firestore.FieldValue.increment(5)
        });

        await batch.commit();
        incrementReputacao(5);

        showToast('Notícia publicada com sucesso!', 'success');
        fecharModalPublicacao();
        window.dispatchEvent(new CustomEvent('noticiaPublicada'));

    } catch (error) {
        console.error('Erro ao publicar:', error);
        showToast('Erro ao publicar notícia. Tente novamente.', 'error');
    } finally {
        showLoading(false);
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalHTML;
    }
}

// ─── Geocoding ────────────────────────────────────────────────────────────────
async function converterCoordsParaEndereco(lat, lon) {
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
