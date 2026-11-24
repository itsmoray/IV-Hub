/* IV Hub - service worker.
   1) Keeps the app shell available and ALWAYS goes to the network first, so updates show up
      straight away. Money data comes from Google Apps Script (another origin) and is never cached.
   2) Shows a notification when the server pushes "a student submitted a payment". */
const C = 'iv-hub-v1'; // new name also clears the old cached icons
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});

// The push carries no data (so nothing private travels through the push service); we just show the alert.
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('Payment to verify', {
    body: 'A student submitted a payment. Tap to review.',
    icon: 'icon-192.png', badge: 'icon-192.png', tag: 'iv-verify', renotify: true,
    data: { url: new URL('./#verify', self.registration.scope).href }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.postMessage({ go: 'verify' }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
