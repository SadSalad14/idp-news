// js/main.js
import { initAuth, showAuthModal } from './auth.js';
import { carregarNoticias, setCategoryFilter, setStatusFilter } from './noticias.js';
import { initPublicacao } from './publicacao.js';
import { showToast } from './ui.js';
import { isDemoMode } from './firebase.js';

let deferredPrompt = null;

async function initApp() {
    try {
        initServiceWorker();
        initAuth();
        initPublicacao();
        setupFilters();

        if (isDemoMode) setupDemoBanner();

        await carregarNoticias();
        await setupInfoLinks();
        setupConnectionDetection();
        setupPWAInstall();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar o sistema.', 'error');
    }
}

function setupDemoBanner() {
    const banner = document.getElementById('banner-demo');
    if (!banner) return;
    banner.style.display = 'flex';
    banner.querySelector('.banner-demo-fechar')?.addEventListener('click', () => {
        banner.style.display = 'none';
    });
    const githubUrl = window.APP_CONFIG?.githubUrl;
    if (githubUrl) {
        const link = banner.querySelector('a[href*="sadsalad14"]');
        if (link) link.href = githubUrl;
    }
}

function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const swPath = new URL('sw.js', document.baseURI).href;
    navigator.serviceWorker.register(swPath)
        .then(reg => {
            reg.addEventListener('updatefound', () => {
                reg.installing?.addEventListener('statechange', function() {
                    if (this.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('Nova versão disponível! Recarregue a página.', 'info');
                    }
                });
            });
        })
        .catch(err => console.error('Service Worker:', err));
}

function setupFilters() {
    document.querySelectorAll('.btn-categoria').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setCategoryFilter(btn.dataset.categoria);
        });
    });
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setStatusFilter(btn.dataset.status);
        });
    });
}

async function setupInfoLinks() {
    let infoData = {};
    try {
        const res = await fetch('./js/data.json');
        if (!res.ok) throw new Error();
        infoData = await res.json();
    } catch (_) {
        infoData = {
            termosDeUso:         { titulo: 'Termos de Uso',          conteudo: 'Use a plataforma com responsabilidade.' },
            politicaPrivacidade: { titulo: 'Política de Privacidade', conteudo: 'Respeitamos sua privacidade.' },
            contato:             { titulo: 'Contato',                 conteudo: 'contato@idp.news' },
            comoFunciona:        { titulo: 'Como Funciona',           conteudo: 'Publique → Comunidade vota → Notícia verificada.' }
        };
    }
    document.querySelectorAll('.link-informacoes').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarModalInformacoes(link.dataset.tipo, infoData);
        });
    });
}

function mostrarModalInformacoes(tipo, infoData) {
    const modal     = document.getElementById('modal-informacoes');
    const container = document.getElementById('informacoes-conteudo');
    if (!modal || !container) return;

    const info = infoData[tipo] || { titulo: 'Não disponível', conteudo: 'Conteúdo não encontrado.' };
    container.innerHTML = `
        <div class="info-content active">
            <h1>${info.titulo}</h1>
            <div class="info-conteudo-texto">${info.conteudo.replace(/\n/g, '<br>')}</div>
            ${info.ultimaAtualizacao ? `<p class="ultima-atualizacao"><i class="far fa-calendar-alt"></i> Atualizado em: ${info.ultimaAtualizacao}</p>` : ''}
        </div>`;

    modal.style.display = 'block';
    const close = () => { modal.style.display = 'none'; };
    modal.querySelector('.close-informacoes')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });
}

function setupConnectionDetection() {
    const check = () => {
        if (!navigator.onLine) showToast('Você está offline.', 'info');
    };
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
}

window.showAuthModal = showAuthModal;
document.addEventListener('DOMContentLoaded', initApp);
