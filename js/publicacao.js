// js/publicacao.js
import { firebase, db } from './firebase.js';
import { showToast, showLoading } from './ui.js';
import { getCurrentUser } from './auth.js';
import { obterLocalizacao } from './geo.js';

// ─── Cache de reputação em memória ───────────────────────────────────────────
// Evita uma leitura extra no Firestore toda vez que o modal de publicação abre.
// A reputação é carregada UMA vez no login e mantida aqui.
let cachedReputacao = 50;

export function setReputacaoCache(valor) { cachedReputacao = valor ?? 50; }

// ─── Inicialização ────────────────────────────────────────────────────────────
export function initPublicacao() {
    document.getElementById('btn-abrir-modal')?.addEventListener('click',  abrirModalPublicacao);
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModalPublicacao);
    document.querySelector('.btn-cancelar')?.addEventListener('click',     fecharModalPublicacao);
    document.getElementById('form-publicar')?.addEventListener('submit',   handlePublicarNoticia);

    document.getElementById('modal-publicar')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-publicar')) fecharModalPublicacao();
    });
}

// ─── Abrir Modal ──────────────────────────────────────────────────────────────
async function abrirModalPublicacao() {
    const user  = getCurrentUser();
    const modal = document.getElementById('modal-publicar');

    if (!user) {
        showToast('Faça login para publicar notícias.', 'error');
        return;
    }

    if (!modal) return;
    modal.style.display = 'block';

    // Obtém localização — não toca no Firestore
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
                localizacaoInput.placeholder = 'Digite sua cidade/estado manualmente';
            }
        } catch (_) {
            localizacaoInput.value    = '';
            localizacaoInput.disabled = false;
        }
    }

    // reCAPTCHA
    setTimeout(() => {
        if (typeof grecaptcha === 'undefined') return;
        const el = modal.querySelector('.g-recaptcha');
        if (el && !el.hasChildNodes()) {
            grecaptcha.render(el, {
                sitekey: window.APP_CONFIG?.recaptchaSiteKey ?? '',
                theme: 'dark'
            });
        }
    }, 400);
}

// ─── Fechar Modal ─────────────────────────────────────────────────────────────
function fecharModalPublicacao() {
    const modal = document.getElementById('modal-publicar');
    if (!modal) return;
    modal.style.display = 'none';
    document.getElementById('form-publicar')?.reset();
    try { if (typeof grecaptcha !== 'undefined') grecaptcha.reset(); } catch (_) {}
}

// ─── Submissão ────────────────────────────────────────────────────────────────
async function handlePublicarNoticia(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) { showToast('Faça login para publicar notícias.', 'error'); return; }

    const titulo      = document.getElementById('titulo').value.trim();
    const conteudo    = document.getElementById('conteudo').value.trim();
    const categoria   = document.getElementById('categoria').value;
    const localizacao = document.getElementById('localizacao').value.trim();
    const coordsInput = document.getElementById('localizacaoCoords');

    if (titulo.length < 10)   { showToast('Título muito curto (mín. 10 caracteres)', 'error'); return; }
    if (conteudo.length < 50) { showToast('Conteúdo muito curto (mín. 50 caracteres)', 'error'); return; }
    if (!categoria)           { showToast('Selecione uma categoria', 'error'); return; }
    if (!localizacao)         { showToast('Localização é obrigatória', 'error'); return; }

    if (typeof grecaptcha !== 'undefined' && grecaptcha.getResponse().length === 0) {
        showToast('Complete o reCAPTCHA', 'error');
        return;
    }

    const submitBtn    = e.target.querySelector('.btn-publicar-confirm');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    showLoading(true);

    try {
        let localizacaoCoords = null;
        if (coordsInput?.value) {
            try { localizacaoCoords = JSON.parse(coordsInput.value); } catch (_) {}
        }

        // Usa reputação do cache em memória — zero leituras extras no Firestore
        const batch = db.batch();

        const noticiaRef = db.collection('noticias').doc();
        batch.set(noticiaRef, {
            titulo,
            conteudo,
            categoria,
            localizacao,
            localizacaoCoords,
            autor: {
                id:         user.uid,
                nome:       user.displayName || user.email.split('@')[0],
                reputacao:  cachedReputacao
            },
            dataPublicacao: new Date().toISOString(),
            timestamp:      firebase.firestore.FieldValue.serverTimestamp(),
            status:         'averiguar',
            pontuacao:      0,
            reportCount:    0,
            votos: { positivos: 0, negativos: 0, usuarios: {} }
        });

        // Atualiza contador e reputação do autor na mesma operação (batch = 1 escrita)
        const usuarioRef = db.collection('usuarios').doc(user.uid);
        batch.update(usuarioRef, {
            noticiasPublicadas: firebase.firestore.FieldValue.increment(1),
            reputacao:          firebase.firestore.FieldValue.increment(5)
        });

        await batch.commit();

        // Atualiza cache local de reputação
        cachedReputacao += 5;

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

// ─── Geocoding (Nominatim — gratuito, sem cota Firebase) ─────────────────────
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
