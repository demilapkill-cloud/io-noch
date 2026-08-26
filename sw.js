// Служебный работник: игра, поставленная на телефон, должна открываться и в
// метро. Всё её хозяйство — два файла (страница со вшитым шрифтом да game.js),
// оттого хитрости не нужно.
//
// Правило простое и нарочно осторожное: **сеть вперёд, запас на подхвате**.
// Обратный порядок (запас вперёд) быстрее, да коварен: после нового выпуска
// игрок сидел бы на старом game.js, покуда работник не сменится сам, и жалобы
// на «починенное, да не починившееся» пошли бы косяком. Здесь же, покуда сеть
// есть, игрок всегда на свежем, а без сети — на последнем виденном.
//
// Летопись в запас не попадает никогда: доска должна быть свежей или никакой.
const CACHE = 'noch-1';
const SHELF = ['./', './index.html', './game.js', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELF).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // летопись и прочее чужое — мимо

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
  );
});
