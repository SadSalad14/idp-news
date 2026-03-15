// sw.js - Service Worker funcional e otimizado
const CACHE_NAME = 'idpnews-v2.0';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/auth.js',
    './js/firebase.js',
    './js/geo.js',
    './js/noticias.js',
    './js/publicacao.js',
    './js/ui.js',
    './js/votacao.js',
    './js/data.json',
    './favicon_io/android-chrome-192x192.png',
    './favicon_io/android-chrome-512x512.png'
];

// Instalação SIMPLIFICADA
self.addEventListener('install', event => {
    console.log('[SW] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache aberto. Adicionando recursos...');
                return cache.addAll(urlsToCache)
                    .then(() => {
                        console.log('[SW] Todos recursos cacheados');
                    })
                    .catch(error => {
                        console.error('[SW] Erro ao cachear recursos:', error);
                    });
            })
            .then(() => {
                console.log('[SW] Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Ativação
self.addEventListener('activate', event => {
    console.log('[SW] Ativando...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Claiming clients');
            return self.clients.claim();
        })
    );
});

// Intercepta requisições
self.addEventListener('fetch', event => {
    // Ignora requisições não GET ou de outros protocolos
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    // Para requisições dinâmicas (Firebase), sempre busca na rede
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebasestorage.googleapis.com')) {
        event.respondWith(networkFirst(event.request));
        return;
    }
    
    // Para recursos estáticos, usa cache primeiro
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retorna do cache
                if (response) {
                    console.log('[SW] Cache hit:', event.request.url);
                    return response;
                }
                
                // Cache miss - busca na rede
                console.log('[SW] Cache miss, buscando na rede:', event.request.url);
                
                return fetch(event.request.clone())
                    .then(response => {
                        // Verifica se a resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clona a resposta para cache
                        const responseToCache = response.clone();
                        
                        // Adiciona ao cache para uso futuro
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('[SW] Erro no fetch:', error);
                        
                        // Se for uma navegação e estiver offline, retorna página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Para outros recursos, pode retornar uma resposta genérica
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Estratégia: Network First (para dados dinâmicos)
function networkFirst(request) {
    return fetch(request)
        .then(response => {
            // Atualiza o cache com a nova resposta
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(request, responseClone);
                });
            return response;
        })
        .catch(() => {
            // Se offline, tenta do cache
            return caches.match(request);
        });
}

// Background Sync (opcional)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-votos') {
        console.log('[SW] Sincronizando votos...');
        event.waitUntil(syncVotos());
    }
});

async function syncVotos() {
    // Para implementar quando tiver dados offline
    console.log('[SW] Sincronização de dados...');
    return Promise.resolve();
}

// Mensagem para forçar atualização
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});