import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton } from '@taiga-ui/core';

// Расширяем интерфейс Navigator для поддержки специфического свойства iOS Safari
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

@Component({
  selector: 'app-webview-install',
  templateUrl: './webview-install.component.html',
  styleUrls: ['./webview-install.component.less'],
  standalone: true,
  imports: [CommonModule, TuiButton]
})
export class WebViewInstallComponent implements OnInit {
  // Свойство для хранения интерфейса установки
  deferredPrompt: any;
  
  // Флаг для управления видимостью баннера установки - всегда false
  showInstallPromotion = false;
  
  // Флаг для определения, установлено ли приложение
  isInstalled = false;

  ngOnInit() {
    console.log('WebViewInstallComponent initialized');
    
    // Определяем, запущено ли приложение в режиме standalone/fullscreen (PWA)
    this.checkIfAppInstalled();
  }
  
  /**
   * Проверяет, установлено ли приложение как PWA
   */
  private checkIfAppInstalled(): void {
    // Проверяем режим отображения через media query
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    
    // Проверяем специфичное для iOS свойство
    const isIOSStandalone = (window.navigator as NavigatorStandalone).standalone === true;
    
    this.isInstalled = isStandalone || isFullscreen || isIOSStandalone;
    
    if (this.isInstalled) {
      console.log('Приложение запущено в режиме PWA');
    } else {
      console.log('Приложение запущено в обычном браузере');
    }
    
    // Добавляем слушатель для отслеживания изменений режима отображения
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
      this.isInstalled = evt.matches;
      console.log('Режим отображения изменился на:', evt.matches ? 'standalone' : 'browser');
    });
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: any) {
    console.log('Перехвачено событие beforeinstallprompt');
    // Предотвращаем автоматическое появление браузерного диалога установки
    e.preventDefault();
    
    // Сохраняем событие для использования позже, но не показываем баннер
    this.deferredPrompt = e;
    
    // Баннер всегда скрыт
    this.showInstallPromotion = false;
  }

  installApp() {
    console.log('Нажата кнопка установки');
    
    if (!this.deferredPrompt) {
      console.log('Нет доступного события установки');
      
      // Если событие недоступно, предоставляем инструкции в зависимости от платформы
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/android/.test(userAgent)) {
        // Инструкции для Android
        this.showPlatformSpecificInstructions('android');
      } else if (/iphone|ipad|ipod/.test(userAgent)) {
        // Инструкции для iOS
        this.showPlatformSpecificInstructions('ios');
      } else {
        // Инструкции для десктопа (Chrome, Edge и др.)
        this.showPlatformSpecificInstructions('desktop');
      }
      
      return;
    }

    // Показываем браузерный диалог установки
    this.deferredPrompt.prompt();

    // Ожидаем решения пользователя
    this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Пользователь установил приложение');
        this.isInstalled = true;
      } else {
        console.log('Пользователь отказался от установки');
      }
      
      // В любом случае, очищаем сохраненное событие
      this.deferredPrompt = null;
      
      // Скрываем интерфейс установки
      this.showInstallPromotion = false;
    });
  }

  closePromotion() {
    // Просто скрываем интерфейс установки
    this.showInstallPromotion = false;
  }
  
  /**
   * Показывает инструкции по установке в зависимости от платформы
   */
  private showPlatformSpecificInstructions(platform: 'android' | 'ios' | 'desktop'): void {
    let instructions = '';
    
    switch (platform) {
      case 'android':
        instructions = 'Для установки приложения на Android:\n\n' +
          '1. Нажмите на меню браузера (три точки в правом верхнем углу)\n' +
          '2. Выберите пункт "Установить приложение" или "Добавить на главный экран"\n' +
          '3. Следуйте инструкциям на экране';
        break;
        
      case 'ios':
        instructions = 'Для установки приложения на iOS:\n\n' +
          '1. Нажмите на кнопку "Поделиться" в нижней части экрана\n' +
          '2. Прокрутите вниз и выберите "На экран «Домой»"\n' +
          '3. Нажмите "Добавить" в правом верхнем углу';
        break;
        
      case 'desktop':
        instructions = 'Для установки приложения на компьютере:\n\n' +
          '1. Найдите иконку установки в адресной строке (обычно справа)\n' +
          '2. Нажмите на нее и выберите "Установить приложение"\n' +
          '3. Подтвердите установку в появившемся диалоговом окне';
        break;
    }
    
    alert(instructions);
  }
}