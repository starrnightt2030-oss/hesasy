/* حصصي — Service Worker: يشغّل التطبيق من غير نت */
const VERSION = 'hesasy-v1.3.1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'css/fonts.css', 'fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-400-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-500-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-600-normal.woff2', 'fonts/ibm-plex-sans-arabic-latin-700-normal.woff2', 'fonts/readex-pro-arabic-500-normal.woff2', 'fonts/readex-pro-arabic-600-normal.woff2', 'fonts/readex-pro-arabic-700-normal.woff2', 'fonts/readex-pro-latin-500-normal.woff2', 'fonts/readex-pro-latin-600-normal.woff2', 'fonts/readex-pro-latin-700-normal.woff2',
  'js/engine.js', 'js/store.js', 'js/core.js', 'js/views-main.js', 'js/views-students.js', 'js/views-money.js', 'js/views-settings.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  // النسخة الجديدة بتستنى لحد ما المستخدم يدوس "حدّث دلوقتي"
});
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'hesasy-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('hesasy-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // الشبكة أولًا لملفات التطبيق علشان التحديثات توصل، والكاش لو مفيش نت
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { c.postMessage({ url }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
