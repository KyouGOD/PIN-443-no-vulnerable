import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// Улучшенная регистрация сервис-воркера для PWA
if ('serviceWorker' in navigator) {
  // Ждем полной загрузки страницы перед регистрацией сервис-воркера
  window.addEventListener('load', () => {
    const swUrl = './service-worker.js';
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker успешно зарегистрирован с областью видимости:', registration.scope);
        
        // Проверяем обновления сервис-воркера
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Новая версия доступна, уведомляем пользователя
                  console.log('Новая версия приложения доступна');
                } else {
                  // Первая установка
                  console.log('Контент кэширован для офлайн использования');
                }
              }
            };
          }
        };
      })
      .catch(error => {
        console.error('Ошибка при регистрации сервис-воркера:', error);
      });
  });
  
  // Добавляем обработчик для самодиагностики PWA
  window.addEventListener('appinstalled', (event) => {
    console.log('PWA успешно установлено');
  });
}
