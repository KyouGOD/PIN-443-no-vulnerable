// Версия кэша - меняйте при обновлении приложения
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'banking-pwa-cache-' + CACHE_VERSION;

// Минимальный набор ресурсов для базовой работы приложения
const CORE_ASSETS = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.webmanifest',
  './assets/icons/icon-192x192.png'
];

// Установка сервис-воркера
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  
  // Предварительное кэширование ключевых ресурсов
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Форсируем активацию без ожидания закрытия всех вкладок
        return self.skipWaiting();
      })
  );
});

// Активация сервис-воркера
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  
  // Очистка старых кэшей
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => {
        // Берем под контроль все клиенты без перезагрузки
        return self.clients.claim();
      })
  );
  
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Для навигационных запросов всегда идем сначала в сеть, затем в кэш
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Для остальных запросов используем стратегию cache-first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response; // Возвращаем из кэша, если есть
          }
          
          // Если нет в кэше, идем в сеть
          return fetch(event.request);
        })
    );
  }
});