// js/noticias.js
import { db, isDemoMode } from './firebase.js';
import { showToast, showLoading, formatDate, getCategoryIcon, escapeHTML } from './ui.js';
import { getCurrentUserState as getCurrentUser } from './state.js';
import { voteOnNews, reportNews, checkUserVote } from './votacao.js';
import { DEMO_NOTICIAS } from './demo-data.js';

let noticias        = [];
let currentCategory = 'todas';
let currentStatus   = 'todas';
let lastVisible     = null;
let hasMore         = true;
let isLoading       = false;
let statsListener   = null;

const CACHE_KEY      = 'noticias_cache_v2';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos
const PAGE_SIZE      = 20;

export async function carregarNoticias(reset = false) {
    if (isLoading) return;
    isLoading = true;
    showLoading(true);

    try {
        if (reset) { lastVisible = null; hasMore = true; limparCache(); if (!isDemoMode) noticias = []; }

        if (isDemoMode) {
            const publicadas = noticias.filter(n => n.id.startsWith('demo-pub-'));
            noticias = [...publicadas, ...DEMO_NOTICIAS];
            renderizarNoticias();
            atualizarStatsLocal();
            return;
        }

        if (noticias.length === 0) {
            const cached = obterDoCache();
            if (cached) { noticias = cached; renderizarNoticias(); iniciarListenerStats(); return; }
        }

        let query = db.collection('noticias')
            .where('status', 'in', ['averiguar', 'verificada'])
            .orderBy('timestamp', 'desc')
            .limit(PAGE_SIZE);
        if (lastVisible) query = query.startAfter(lastVisible);

        const snap = await query.get();
        if (snap.empty) { hasMore = false; if (noticias.length === 0) mostrarMensagemVazia(); return; }

        const novas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        noticias    = reset ? novas : [...noticias, ...novas];
        lastVisible = snap.docs[snap.docs.length - 1];
        hasMore     = snap.docs.length >= PAGE_SIZE;
        if (!reset || noticias.length <= PAGE_SIZE) salvarNoCache(noticias.slice(0, PAGE_SIZE));

        renderizarNoticias();
        iniciarListenerStats();
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        if (error.code === 'failed-precondition') {
            console.error('Índice composto ausente — clique no link acima para criá-lo no Firebase Console.');
        }
        showToast('Erro ao carregar notícias.', 'error');
        mostrarMensagemVazia();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

function iniciarListenerStats() {
    if (isDemoMode || !db) return;
    if (statsListener) statsListener();
    statsListener = db.collection('noticias')
        .where('status', 'in', ['averiguar', 'verificada'])
        .onSnapshot({ includeMetadataChanges: false }, snap => {
            const docs = snap.docs.map(d => d.data());
            atualizarStatsDOM(
                docs.filter(n => n.status === 'verificada').length,
                docs.filter(n => n.status === 'averiguar').length,
                new Set(docs.map(n => n.autor?.id).filter(Boolean)).size
            );
        }, err => console.warn('Listener encerrado:', err));
}

function atualizarStatsLocal() {
    atualizarStatsDOM(
        noticias.filter(n => n.status === 'verificada').length,
        noticias.filter(n => n.status === 'averiguar').length,
        new Set(noticias.map(n => n.autor?.id).filter(Boolean)).size
    );
}

function salvarNoCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (_) {} }
function obterDoCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_DURATION) { limparCache(); return null; }
        return data;
    } catch (_) { return null; }
}
function limparCache() { try { localStorage.removeItem(CACHE_KEY); } catch (_) {} }

export function renderizarNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const filtradas = filtrarNoticias();
    if (filtradas.length === 0) { mostrarMensagemVazia(); return; }

    container.innerHTML = filtradas.map((n, i) => `
        <div class="noticia-card${n.id.startsWith('demo-pub-') ? ' noticia-demo-nova' : ''}" data-id="${n.id}">
            <span class="noticia-status status-${n.status}">
                ${n.status === 'verificada' ? '✓ Verificada' : '🔍 A averiguar'}
            </span>
            <span class="noticia-categoria">
                <i class="fas fa-${getCategoryIcon(n.categoria)}"></i> ${escapeHTML(n.categoria)}
            </span>
            <h3 class="noticia-titulo">${escapeHTML(n.titulo)}</h3>
            <p class="noticia-conteudo">
                ${escapeHTML(n.conteudo.substring(0, 200))}${n.conteudo.length > 200 ? '...' : ''}
            </p>
            <div class="noticia-info">
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(n.localizacao)}</span>
                <span><i class="far fa-clock"></i> ${formatDate(n.dataPublicacao)}</span>
            </div>
            <button class="btn-ver-completo" data-id="${n.id}">
                <i class="fas fa-expand-alt"></i> Ver notícia completa
            </button>
            <div class="noticia-meta">
                <span><i class="far fa-user"></i> ${escapeHTML(n.autor.nome)}</span>
                <span>Pontos: ${Math.round(n.pontuacao || 0)}</span>
            </div>
            ${n.id.startsWith('demo-pub-') ? '<span class="badge-demo-pub">✦ Publicada nesta sessão</span>' : ''}
        </div>
    `).join('') + (!isDemoMode && hasMore ? `
        <div class="loading-indicator" id="loading-indicator">
            <div class="loading-spinner"></div>
            <p>Carregando mais notícias...</p>
        </div>` : '');

    setupEventosCards();
    if (!isDemoMode && hasMore) setupScrollInfinito();
}

function mostrarMensagemVazia() {
    const c = document.getElementById('noticias-container');
    if (c) c.innerHTML = `
        <div class="mensagem-vazio">
            <i class="fas fa-newspaper"></i>
            <h3>Nenhuma notícia encontrada</h3>
            <p>Seja o primeiro a publicar nesta categoria!</p>
        </div>`;
}

function setupScrollInfinito() {
    const el = document.getElementById('loading-indicator');
    if (!el) return;
    new IntersectionObserver(async entries => {
        if (entries[0].isIntersecting && !isLoading && hasMore) await carregarNoticias(false);
    }, { threshold: 0.5 }).observe(el);
}

function filtrarNoticias() {
    return noticias
        .filter(n => (currentCategory === 'todas' || n.categoria === currentCategory) &&
                     (currentStatus   === 'todas' || n.status    === currentStatus))
        .sort((a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao));
}

export function setCategoryFilter(cat)  { currentCategory = cat;    renderizarNoticias(); }
export function setStatusFilter(status) { currentStatus   = status; renderizarNoticias(); }

function setupEventosCards() {
    document.querySelectorAll('.btn-ver-completo').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); mostrarNoticiaCompleta(btn.dataset.id); });
    });
    document.querySelectorAll('.noticia-card').forEach(card => {
        card.addEventListener('click', e => {
            if (!e.target.closest('.btn-ver-completo')) mostrarNoticiaCompleta(card.dataset.id);
        });
    });
}

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
                        <i class="fas fa-${getCategoryIcon(noticia.categoria)}"></i> ${escapeHTML(noticia.categoria)}
                    </span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(noticia.localizacao)}</span>
                    <span><i class="far fa-user"></i> ${escapeHTML(noticia.autor.nome)}</span>
                    <span><i class="far fa-clock"></i> ${formatDate(noticia.dataPublicacao)}</span>
                </div>
            </div>
            <div class="noticia-completa-conteudo">
                ${escapeHTML(noticia.conteudo).replace(/\n/g, '<br>')}
            </div>
            ${noticia.midiaUrl ? `
            <div class="noticia-midia">
                ${noticia.midiatipo === 'video'
                    ? `<video controls preload="metadata"><source src="${noticia.midiaUrl}"></video>`
                    : `<img src="${noticia.midiaUrl}" alt="Mídia da notícia" loading="lazy">`
                }
            </div>` : ''}
            <div class="noticia-votacao-modal">
                <h4><i class="fas fa-vote-yea"></i> Contribua com a verificação</h4>
                <p>Esta notícia tem <strong>${Math.round(noticia.pontuacao || 0)} pontos</strong>.</p>
                <div class="votacao-botoes">
                    <button class="btn-voto-modal btn-upvote-modal" data-id="${noticia.id}" data-voto="positivo" ${userVote?.tipo === 'positivo' ? 'disabled' : ''}>
                        <i class="fas fa-thumbs-up"></i> ${userVote?.tipo === 'positivo' ? '✓ Confirmado' : 'Confirmar Verdadeira'}
                    </button>
                    <button class="btn-voto-modal btn-downvote-modal" data-id="${noticia.id}" data-voto="negativo" ${userVote?.tipo === 'negativo' ? 'disabled' : ''}>
                        <i class="fas fa-thumbs-down"></i> ${userVote?.tipo === 'negativo' ? '✓ Negado' : 'Negar / Falsa'}
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
                ${userVote ? `<p class="voto-info"><small>Você votou: ${userVote.tipo === 'positivo' ? 'Confirmou' : 'Negou'}</small></p>` : ''}
                ${isDemoMode ? `<p class="voto-info demo-aviso-voto"><i class="fas fa-flask"></i> Modo demonstração — votos ficam só nesta sessão</p>` : ''}
                ${!usuario && !isDemoMode ? `<p class="voto-info"><small><a href="#" onclick="window.showAuthModal('login');return false;">Faça login</a> para votar.</small></p>` : ''}
            </div>
        </div>`;

    modal.style.display = 'block';
    setupEventosModal(modal, noticia);
}

function setupEventosModal(modal, noticia) {
    modal.querySelector('.close-noticia')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    modal.querySelectorAll('.btn-voto-modal').forEach(btn => {
        btn.addEventListener('click', async e => {
            const noticiaId = e.target.closest('[data-id]').dataset.id;

            if (btn.classList.contains('btn-report-modal')) {
                if (isDemoMode) { showToast('Report simulado! (modo demo)', 'info'); modal.style.display = 'none'; return; }
                const motivo = prompt('Motivo do report (mín. 10 caracteres):');
                if (!motivo || motivo.trim().length < 10) { if (motivo) showToast('Motivo muito curto.', 'error'); return; }
                if (await reportNews(noticiaId, motivo.trim(), getCurrentUser())) {
                    showToast('Report enviado.', 'info'); modal.style.display = 'none';
                    limparCache(); await carregarNoticias(true);
                }
                return;
            }

            if (isDemoMode) {
                const idx = noticias.findIndex(n => n.id === noticiaId);
                if (idx === -1) return;
                if (noticias[idx].votos?.usuarios?.['demo-visitante']) { showToast('Você já votou.', 'error'); return; }
                const delta = btn.dataset.voto === 'positivo' ? 1 : -1;
                noticias[idx] = {
                    ...noticias[idx],
                    pontuacao: (noticias[idx].pontuacao || 0) + delta,
                    votos: {
                        positivos: (noticias[idx].votos?.positivos || 0) + (delta > 0 ? 1 : 0),
                        negativos: (noticias[idx].votos?.negativos || 0) + (delta < 0 ? 1 : 0),
                        usuarios: { ...(noticias[idx].votos?.usuarios || {}), 'demo-visitante': { tipo: btn.dataset.voto } }
                    }
                };
                showToast('Voto registrado! (modo demo)', 'success');
                modal.style.display = 'none'; renderizarNoticias(); atualizarStatsLocal();
                return;
            }

            if (await voteOnNews(noticiaId, btn.dataset.voto, getCurrentUser(), btn)) {
                modal.style.display = 'none';
                const idx = noticias.findIndex(n => n.id === noticiaId);
                if (idx !== -1) {
                    const delta = btn.dataset.voto === 'positivo' ? 1 : -1;
                    noticias[idx] = { ...noticias[idx], pontuacao: (noticias[idx].pontuacao || 0) + delta };
                    limparCache(); renderizarNoticias();
                }
            }
        });
    });
}

function atualizarStatsDOM(verificadas, averiguar, usuarios) {
    const el = id => document.getElementById(id);
    if (el('stats-verificadas')) el('stats-verificadas').innerHTML = `<i class="fas fa-check-circle"></i> ${verificadas} verificadas`;
    if (el('stats-averiguar'))   el('stats-averiguar').innerHTML   = `<i class="fas fa-search"></i> ${averiguar} em averiguação`;
    if (el('stats-usuarios'))    el('stats-usuarios').innerHTML    = `<i class="fas fa-users"></i> ${usuarios} usuários`;
}

export function adicionarNoticiaDemoLocal(noticia) {
    noticias.unshift(noticia); renderizarNoticias(); atualizarStatsLocal();
}

export function getNoticiaById(id) { return noticias.find(n => n.id === id); }

window.addEventListener('noticiaPublicada', () => { if (!isDemoMode) { limparCache(); carregarNoticias(true); } });
