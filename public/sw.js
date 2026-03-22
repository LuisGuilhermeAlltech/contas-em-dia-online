// Service Worker para funcionalidade offline
const CACHE_VERSION = 'v2-20260322';
const STATIC_CACHE = `static-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;

const resolveScopedPath = (relativePath) => new URL(relativePath, self.registration.scope).pathname;

const STATIC_FILES = [
  resolveScopedPath('./'),
  resolveScopedPath('./index.html'),
  resolveScopedPath('./manifest.json'),
  resolveScopedPath('./icon-192x192.png'),
  resolveScopedPath('./icon-512x512.png')
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Cacheando arquivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve(undefined);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navegação do app shell - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(resolveScopedPath('./index.html'));
        })
    );
    return;
  }
  
  // Estratégia para arquivos estáticos - Cache First
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
    return;
  }

  // Estratégia para API do Supabase - Network First com fallback
  if (request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Retornar dados offline padrão se não houver cache
              return new Response(JSON.stringify({
                offline: true,
                message: 'Dados não disponíveis offline'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Estratégia padrão - Stale While Revalidate para assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});

// Permite que a página peça atualização imediata do SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-contas') {
    event.waitUntil(syncContas());
  }
});

async function syncContas() {
  try {
    // Recuperar dados pendentes do IndexedDB
    const pendingData = await getPendingData();
    
    for (const data of pendingData) {
      // Sincronizar com Supabase
      await syncWithSupabase(data);
    }
    
    // Limpar dados pendentes após sincronização
    await clearPendingData();
    
    // Notificar usuário
    self.registration.showNotification('Dados sincronizados!', {
      body: 'Todas as alterações foram salvas na nuvem.',
      icon: new URL('./icon-192x192.png', self.registration.scope).href
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}

async function getPendingData() {
  // Implementar lógica para recuperar dados pendentes
  return [];
}

async function syncWithSupabase(data) {
  // Implementar lógica de sincronização
  return true;
}

async function clearPendingData() {
  // Implementar lógica para limpar dados pendentes
  return true;
}
