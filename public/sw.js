// Service worker mínimo: habilita a instalação (PWA). Não faz cache de dados do jogo —
// a fila offline das anotações é tratada no app (IndexedDB).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
