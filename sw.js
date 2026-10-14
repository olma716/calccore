// Мінімальний service worker: потрібен лише щоб браузер пропонував встановити сайт як додаток.
// Нічого не кешує — вміст завжди береться з мережі, тому застарілого кешу не буває.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
