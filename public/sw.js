self.addEventListener('push', function(event) {
    if (event.data) {
        let data = {};
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'New Notification', body: event.data.text() };
        }
        
        const title = data.title || 'DoConnect Notification';
        const options = {
            body: data.body || 'You have a new message.',
            icon: '/icon.png',
            badge: '/icon.png',
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
