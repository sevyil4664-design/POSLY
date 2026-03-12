// ═══════════════════════════════════════════════════════
// POSLY iOS — Service Worker
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'posly-ios-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/app.css',
    '/js/api.js',
    '/js/app.js',
    '/js/pages/login.js',
    '/js/pages/dashboard.js',
    '/js/pages/orders.js',
    '/js/pages/reports.js',
    '/js/pages/staff.js',
    '/js/pages/support.js',
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip API calls and socket connections
    if (event.request.url.includes('/api') || event.request.url.includes('socket.io')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Push Notification
self.addEventListener('push', (event) => {
    let data = { title: 'Posly', body: 'Yeni bildirim' };
    if (event.data) {
        try { data = event.data.json(); } catch { data.body = event.data.text(); }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-192.svg',
            vibrate: [200, 100, 200],
            tag: 'posly-notification',
            requireInteraction: true,
        })
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes('posly') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
