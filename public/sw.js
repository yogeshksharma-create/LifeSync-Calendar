self.addEventListener('install', (e) => {
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Simple network-first strategy could be improved later
})
