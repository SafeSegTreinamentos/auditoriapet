// Auditoria de PET — service worker
// Estratégia: abre SEMPRE do cache (instantâneo, com ou sem sinal) e
// busca a versão nova em segundo plano para a próxima abertura.
const C = 'auditoria-pet-v5';
const F = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(F.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

function atualizar(req, chave) {
  return fetch(req, { cache: 'no-cache' }).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(chave || req, cp)); }
    return r;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Abrir o app (navegação): sempre a tela salva, na hora
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(cache => {
        const rede = atualizar(req, './index.html').catch(() => null);
        e.waitUntil(rede);
        return cache || rede.then(r => r || caches.match('./'));
      })
    );
    return;
  }

  // Demais arquivos: cache primeiro, atualiza em segundo plano
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cache => {
      const rede = atualizar(req).catch(() => null);
      e.waitUntil(rede);
      return cache || rede.then(r => r || Response.error());
    })
  );
});
