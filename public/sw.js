// Service Worker para funcionalidade offline
const CACHE_NAME = 'contas-em-dia-v1';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

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
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Estratégia para arquivos estáticos - Cache First
  if (STATIC_FILES.includes(new URL(request.url).pathname)) {
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

  // Estratégia padrão - Network First
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
        return caches.match(request);
      })
  );
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
