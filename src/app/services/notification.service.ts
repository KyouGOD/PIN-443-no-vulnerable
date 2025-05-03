import { Injectable } from '@angular/core';
import { TuiAlertService } from '@taiga-ui/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private alertService: TuiAlertService) {}

  success(message: string) {
    this.alertService.open(message, {
      label: 'Успешно',
      autoClose: 3000, // Auto-close after 3000ms (3 seconds)
    }).subscribe();
  }

  error(message: string) {
    this.alertService.open(message, {
      label: 'Ошибка',
      autoClose: 3000,
    }).subscribe();
  }
}