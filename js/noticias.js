// js/noticias.js
import { db, isDemoMode } from './firebase.js';
import { showToast, showLoading, formatDate, getCategoryIcon, escapeHTML } from './ui.js';
import { getCurrentUserState as getCurrentUser } from './state.js';
import { voteOnNews, reportNews, checkUserVote } from './votacao.js';
import { DEMO_NOTICIAS } from './demo-data.js';

// ─── Estado ───────────────────────────────────────────────────────────────────
let noticias        = [];
let currentCategory = 'todas';
let currentStatus   = 'todas';
let lastVisible     = null;
let hasMore         = true;
let isLoading       = false;
let statsUnsubscribe = null;

const CACHE_KEY      = 'noticias_cache_v2';
const CACHE_DURATION = 15 * 60 * 1000;
const PAGE_SIZE      = 20;
const AD_INTERVAL    = 6;

// ─── Carregamento Principal ───────────────────────────────────────────────────
export async function carregarNoticias(reset = false) {
    if (isLoading) return;
    isLoading = true;
    showLoading(true);

    try {
        if (reset) {
            lastVisible = null;
            hasMore     = true;
            limparCache();
            if (!isDemoMode) noticias = [];
        }

        // ── MODO DEMO ──────────────────────────────────────────────────────
        if (isDemoMode) {
            // Preserva notícias publicadas nesta sessão + adiciona as de exemplo
            const publicadasNaSessao = noticias.filter(n => n.id.startsWith('demo-pub-'));
            noticias = [...publicadasNaSessao, ...DEMO_NOTICIAS];
            renderizarNoticias();
            atualizarEstatisticasLocal();
            return;
        }

        // ── MODO FIREBASE ──────────────────────────────────────────────────
        if (noticias.length === 0) {
            const cached = obterDoCache();
            if (cached) {
                noticias = cached;
                renderizarNoticias();
                iniciarListenerStats();
                return;
            }
        }

        let query = db.collection('noticias')
            .where('status', 'in', ['averiguar', 'verificada'])
            .orderBy('timestamp', 'desc')
            .limit(PAGE_SIZE);

        if (lastVisible) query = query.startAfter(lastVisible);

        const snapshot = await query.get();

        if (snapshot.empty) {
            hasMore = false;
            if (noticias.length === 0) mostrarMensagemVazia();
            return;
        }

        const novas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        noticias    = reset ? novas : [...noticias, ...novas];
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        hasMore     = snapshot.docs.length >= PAGE_SIZE;

        if (!reset || noticias.length <= PAGE_SIZE) {
            salvarNoCache(noticias.slice(0, PAGE_SIZE));
        }

        renderizarNoticias();
        iniciarListenerStats();

    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        if (error.code === 'failed-precondition') {
            console.error('⚠️ Índice composto ausente — clique no link acima para criá-lo.');
            showToast('Configure o índice Firestore. Veja o console.', 'error');
        } else {
            showToast('Erro ao carregar notícias.', 'error');
        }
        mostrarMensagemVazia();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

async function carregarMaisNoticias() {
    if (!isLoading && hasMore && !isDemoMode) await carregarNoticias(false);
}

// ─── Listener Realtime (só stats, só Firebase) ────────────────────────────────
function iniciarListenerStats() {
    if (isDemoMode || !db) return;
    if (statsUnsubscribe) statsUnsubscribe();

    statsUnsubscribe = db.collection('noticias')
        .where('status', 'in', ['averiguar', 'verificada'])
        .onSnapshot(
            { includeMetadataChanges: false },
            snapshot => {
                const docs        = snapshot.docs.map(d => d.data());
                const verificadas = docs.filter(n => n.status === 'verificada').length;
                const averiguar   = docs.filter(n => n.status === 'averiguar').length;
                const usuarios    = new Set(docs.map(n => n.autor?.id).filter(Boolean)).size;
                _atualizarEstatisticasDOM(verificadas, averiguar, usuarios);
            },
            err => console.warn('Listener stats encerrado:', err)
        );
}

function atualizarEstatisticasLocal() {
    const verificadas = noticias.filter(n => n.status === 'verificada').length;
    const averiguar   = noticias.filter(n => n.status === 'averiguar').length;
    const usuarios    = new Set(noticias.map(n => n.autor?.id).filter(Boolean)).size;
    _atualizarEstatisticasDOM(verificadas, averiguar, usuarios);
}

// ─── Cache ────────────────────────────────────────────────────────────────────
function salvarNoCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch (_) {}
}
function obterDoCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_DURATION) { limparCache(); return null; }
        return data;
    } catch (_) { return null; }
}
function limparCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
}

// ─── Renderização ─────────────────────────────────────────────────────────────
export function renderizarNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const filtradas = filtrarNoticias();
    if (filtradas.length === 0) { mostrarMensagemVazia(); return; }

    const items = filtradas.map((noticia, index) => {
        const isNovaDemo = noticia.id.startsWith('demo-pub-');
        const card = `
            <div class="noticia-card${isNovaDemo ? ' noticia-demo-nova' : ''}" data-id="${noticia.id}">
                <span class="noticia-status status-${noticia.status}">
                    ${noticia.status === 'verificada' ? '✓ Verificada' : '🔍 A averiguar'}
                </span>
                <span class="noticia-categoria">
                    <i class="fas fa-${getCategoryIcon(noticia.categoria)}"></i>
                    ${escapeHTML(noticia.categoria)}
                </span>
                <h3 class="noticia-titulo">${escapeHTML(noticia.titulo)}</h3>
                <p class="noticia-conteudo">
                    ${escapeHTML(noticia.conteudo.substring(0, 200))}${noticia.conteudo.length > 200 ? '...' : ''}
                </p>
                <div class="noticia-info">
                    <span class="noticia-localizacao">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHTML(noticia.localizacao)}
                    </span>
                    <span class="noticia-data">
                        <i class="far fa-clock"></i>
                        ${formatDate(noticia.dataPublicacao)}
                    </span>
                </div>
                <button class="btn-ver-completo" data-id="${noticia.id}">
                    <i class="fas fa-expand-alt"></i> Ver notícia completa
                </button>
                <div class="noticia-meta">
                    <span><i class="far fa-user"></i> ${escapeHTML(noticia.autor.nome)}</span>
                    <span>Pontos: ${Math.round(noticia.pontuacao || 0)}</span>
                </div>
                ${isNovaDemo ? '<span class="badge-demo-pub">✦ Publicada nesta sessão</span>' : ''}
            </div>`;

        const ad = (index + 1) % AD_INTERVAL === 0 ? `
            <div class="ad-slot ad-slot-grid" aria-label="Publicidade">
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-format="fluid"
                     data-ad-layout-key="-fb+5w+4e-db+86"
                     data-ad-client="${window.APP_CONFIG?.adsense?.publisherId ?? 'ca-pub-XXXXXXXXXXXXXXXXX'}"
                     data-ad-slot="${window.APP_CONFIG?.adsense?.slots?.grid ?? 'XXXXXXXXXX'}"></ins>
            </div>` : '';

        return card + ad;
    }).join('');

    const temMaisFirebase = !isDemoMode && hasMore;
    container.innerHTML = items + (temMaisFirebase ? `
        <div class="loading-indicator" id="loading-indicator">
            <div class="loading-spinner"></div>
            <p>Carregando mais notícias...</p>
        </div>` : '');

    setupNewsCardEvents();
    if (temMaisFirebase) setupInfiniteScroll();

    if (typeof adsbygoogle !== 'undefined') {
        document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])').forEach(() => {
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
        });
    }
}

function mostrarMensagemVazia() {
    const container = document.getElementById('noticias-container');
    if (!container) return;
    container.innerHTML = `
        <div class="mensagem-vazio">
            <i class="fas fa-newspaper"></i>
            <h3>Nenhuma notícia encontrada</h3>
            <p>Seja o primeiro a publicar uma notícia nesta categoria!</p>
        </div>`;
}

// ─── Scroll Infinito ──────────────────────────────────────────────────────────
function setupInfiniteScroll() {
    const indicator = document.getElementById('loading-indicator');
    if (!indicator) return;
    new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) await carregarMaisNoticias();
    }, { threshold: 0.5 }).observe(indicator);
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
function filtrarNoticias() {
    return noticias
        .filter(n => {
            const catOk    = currentCategory === 'todas' || n.categoria === currentCategory;
            const statusOk = currentStatus   === 'todas' || n.status    === currentStatus;
            return catOk && statusOk;
        })
        .sort((a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao));
}

export function setCategoryFilter(cat)  { currentCategory = cat;    renderizarNoticias(); }
export function setStatusFilter(status) { currentStatus   = status; renderizarNoticias(); }

// ─── Eventos dos Cards ────────────────────────────────────────────────────────
function setupNewsCardEvents() {
    document.querySelectorAll('.btn-ver-completo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarNoticiaCompleta(btn.dataset.id);
        });
    });
    document.querySelectorAll('.noticia-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-ver-completo'))
                mostrarNoticiaCompleta(card.dataset.id);
        });
    });
}

// ─── Modal de Notícia Completa ────────────────────────────────────────────────
export async function mostrarNoticiaCompleta(noticiaId) {
    const noticia = noticias.find(n => n.id === noticiaId);
    if (!noticia) return;

    const modal   = document.getElementById('modal-noticia');
    const content = document.getElementById('modal-noticia-conteudo');
    if (!modal || !content) return;

    const usuario  = getCurrentUser();
    const userVote = isDemoMode
        ? (noticia.votos?.usuarios?.['demo-visitante'] || null)
        : (usuario ? await checkUserVote(noticiaId, usuario.uid) : null);

    content.innerHTML = `
        <div class="noticia-completa">
            <div class="noticia-completa-header">
                <span class="noticia-status status-${noticia.status}">
                    ${noticia.status === 'verificada' ? '✓ VERIFICADA' : '🔍 A AVERIGUAR'}
                </span>
                <button class="close-noticia close">&times;</button>
                <h1 class="noticia-completa-titulo">${escapeHTML(noticia.titulo)}</h1>
                <div class="noticia-completa-meta">
                    <span class="noticia-completa-categoria">
                        <i class="fas fa-${getCategoryIcon(noticia.categoria)}"></i>
                        ${escapeHTML(noticia.categoria)}
                    </span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(noticia.localizacao)}</span>
                    <span><i class="far fa-user"></i> ${escapeHTML(noticia.autor.nome)}</span>
                    <span><i class="far fa-clock"></i> ${formatDate(noticia.dataPublicacao)}</span>
                </div>
            </div>

            <div class="noticia-completa-conteudo">
                ${escapeHTML(noticia.conteudo).replace(/\n/g, '<br>')}
            </div>

            <div class="ad-slot ad-slot-modal" aria-label="Publicidade">
                <ins class="adsbygoogle"
                     style="display:block;text-align:center"
                     data-ad-layout="in-article"
                     data-ad-format="fluid"
                     data-ad-client="${window.APP_CONFIG?.adsense?.publisherId ?? 'ca-pub-XXXXXXXXXXXXXXXXX'}"
                     data-ad-slot="${window.APP_CONFIG?.adsense?.slots?.inArticle ?? 'XXXXXXXXXX'}"></ins>
            </div>

            <div class="noticia-votacao-modal">
                <h4><i class="fas fa-vote-yea"></i> Contribua com a verificação</h4>
                <p>Esta notícia tem <strong>${Math.round(noticia.pontuacao || 0)} pontos</strong> de confiança.</p>

                <div class="votacao-botoes">
                    <button class="btn-voto-modal btn-upvote-modal"
                            data-id="${noticia.id}" data-voto="positivo"
                            ${userVote?.tipo === 'positivo' ? 'disabled' : ''}>
                        <i class="fas fa-thumbs-up"></i>
                        ${userVote?.tipo === 'positivo' ? '✓ Confirmado' : 'Confirmar Verdadeira'}
                    </button>
                    <button class="btn-voto-modal btn-downvote-modal"
                            data-id="${noticia.id}" data-voto="negativo"
                            ${userVote?.tipo === 'negativo' ? 'disabled' : ''}>
                        <i class="fas fa-thumbs-down"></i>
                        ${userVote?.tipo === 'negativo' ? '✓ Negado' : 'Negar / Falsa'}
                    </button>
                    <button class="btn-voto-modal btn-report-modal" data-id="${noticia.id}">
                        <i class="fas fa-flag"></i> Reportar Abuso
                    </button>
                </div>

                <div class="contador-votos-modal">
                    <span class="contador-positivo-modal">+${Math.round(noticia.votos?.positivos || 0)}</span>
                    <span>/</span>
                    <span class="contador-negativo-modal">-${Math.round(noticia.votos?.negativos || 0)}</span>
                </div>

                ${userVote ? `<p class="voto-info"><small>Você já votou: ${userVote.tipo === 'positivo' ? 'Confirmou' : 'Negou'}</small></p>` : ''}
                ${isDemoMode ? `<p class="voto-info demo-aviso-voto"><i class="fas fa-flask"></i> Modo demonstração — votos ficam apenas nesta sessão</p>` : ''}
                ${!usuario && !isDemoMode ? `<p class="voto-info"><small><a href="#" onclick="window.showAuthModal('login');return false;">Faça login</a> para votar.</small></p>` : ''}
            </div>
        </div>`;

    modal.style.display = 'block';
    setupNewsModalEvents(modal, noticia);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
}

function setupNewsModalEvents(modal, noticia) {
    modal.querySelector('.close-noticia')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    modal.querySelectorAll('.btn-voto-modal').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const noticiaId = e.target.closest('[data-id]').dataset.id;

            if (btn.classList.contains('btn-report-modal')) {
                if (isDemoMode) {
                    showToast('Report simulado recebido! (modo demo)', 'info');
                    modal.style.display = 'none';
                    return;
                }
                const motivo = prompt('Motivo do report (mín. 10 caracteres):');
                if (!motivo || motivo.trim().length < 10) {
                    if (motivo) showToast('Motivo muito curto (mín. 10 caracteres).', 'error');
                    return;
                }
                const ok = await reportNews(noticiaId, motivo.trim(), getCurrentUser());
                if (ok) {
                    showToast('Report enviado com sucesso.', 'info');
                    modal.style.display = 'none';
                    limparCache();
                    await carregarNoticias(true);
                }
                return;
            }

            // ── Voto no modo demo ──────────────────────────────────────────
            if (isDemoMode) {
                const idx = noticias.findIndex(n => n.id === noticiaId);
                if (idx !== -1) {
                    const jaVotou = noticias[idx].votos?.usuarios?.['demo-visitante'];
                    if (jaVotou) { showToast('Você já votou nesta notícia.', 'error'); return; }

                    const delta = btn.dataset.voto === 'positivo' ? 1 : -1;
                    noticias[idx] = {
                        ...noticias[idx],
                        pontuacao: (noticias[idx].pontuacao || 0) + delta,
                        votos: {
                            positivos: (noticias[idx].votos?.positivos || 0) + (delta > 0 ? 1 : 0),
                            negativos: (noticias[idx].votos?.negativos || 0) + (delta < 0 ? 1 : 0),
                            usuarios: {
                                ...(noticias[idx].votos?.usuarios || {}),
                                'demo-visitante': { tipo: btn.dataset.voto }
                            }
                        }
                    };
                    showToast('Voto registrado! (modo demo)', 'success');
                    modal.style.display = 'none';
                    renderizarNoticias();
                    atualizarEstatisticasLocal();
                }
                return;
            }

            // ── Voto no Firebase ───────────────────────────────────────────
            const ok = await voteOnNews(noticiaId, btn.dataset.voto, getCurrentUser(), btn);
            if (ok) {
                modal.style.display = 'none';
                const idx = noticias.findIndex(n => n.id === noticiaId);
                if (idx !== -1) {
                    const delta = btn.dataset.voto === 'positivo' ? 1 : -1;
                    noticias[idx] = {
                        ...noticias[idx],
                        pontuacao: (noticias[idx].pontuacao || 0) + delta,
                        votos: {
                            ...noticias[idx].votos,
                            positivos: (noticias[idx].votos?.positivos || 0) + (delta > 0 ? 1 : 0),
                            negativos: (noticias[idx].votos?.negativos || 0) + (delta < 0 ? 1 : 0)
                        }
                    };
                    limparCache();
                    renderizarNoticias();
                }
            }
        });
    });
}

// ─── Estatísticas ─────────────────────────────────────────────────────────────
function _atualizarEstatisticasDOM(verificadas, averiguar, usuarios) {
    const el = id => document.getElementById(id);
    if (el('stats-verificadas')) el('stats-verificadas').innerHTML = `<i class="fas fa-check-circle"></i> ${verificadas} verificadas`;
    if (el('stats-averiguar'))   el('stats-averiguar').innerHTML   = `<i class="fas fa-search"></i> ${averiguar} em averiguação`;
    if (el('stats-usuarios'))    el('stats-usuarios').innerHTML    = `<i class="fas fa-users"></i> ${usuarios} usuários`;
}

// ─── API pública para publicacao.js injetar notícia demo ──────────────────────
export function adicionarNoticiaDemoLocal(noticia) {
    noticias.unshift(noticia);
    renderizarNoticias();
    atualizarEstatisticasLocal();
}

export function getNoticiaById(id) { return noticias.find(n => n.id === id); }

window.addEventListener('noticiaPublicada', () => {
    if (!isDemoMode) { limparCache(); carregarNoticias(true); }
});
