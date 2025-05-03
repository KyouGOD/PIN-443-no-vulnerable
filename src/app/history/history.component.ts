import { DatePipe, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TuiAccordion, TuiInputMonth } from '@taiga-ui/kit';
import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { FormsModule } from '@angular/forms';
import { TuiCalendar } from '@taiga-ui/core';
import { TuiDay, TuiDayRange, TuiMonth } from '@taiga-ui/cdk';
import { TuiTitle, TuiIcon, TuiSurface, TuiAlertService } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiButtonGroup, TuiCarousel, TuiElasticContainer, TuiPagination } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { UserService } from '../services/user.service';
import { Transaction } from '../services/models/transaction.model';
import { Account } from '../services/models/account.model';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrl: './history.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgForOf,
    NgIf,
    DatePipe,
    TuiAccordion,
    FormsModule,
    TuiInputMonth,
    TuiButton,
    TuiCalendar,
    TuiTitle,
    TuiCarousel,
    TuiPagination,
    TuiAvatar,
    TuiBadge,
    TuiLoader,
    TuiIcon
  ],
})
export class HistoryComponent implements OnInit {
  protected isMonthSelectorVisible = false;
  protected hoveredItem: TuiDay | null = null;
  protected firstMonth = TuiMonth.currentLocal();
  protected selectedMonth = new TuiMonth(new Date().getFullYear(), new Date().getMonth());

  // Счета пользователя
  protected userAccounts: Account[] = [];
  protected selectedAccountId: number | null = null;
  protected currentCardIndex = 0;
  protected cards: any[] = [];

  // Флаг загрузки
  protected isLoading = false;

  // Транзакции
  protected transactions: Transaction[] = [];

  // Инициализация диапазона по умолчанию: начало текущего месяца до текущей даты
  protected value: TuiDayRange = this.getDefaultRange();

  constructor(
    private userService: UserService,
    private alertService: TuiAlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserAccounts();
  }

  // Загрузка счетов пользователя
  protected loadUserAccounts(): void {
    this.isLoading = true;
    this.userService.getCurrentUserAccounts()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: accounts => {
          this.userAccounts = accounts;
          this.updateCardsFromAccounts();
          
          // Если есть счета, выбираем первый и загружаем его транзакции
          if (accounts.length > 0) {
            this.selectedAccountId = accounts[0].id;
            this.loadAccountTransactions();
          }
        },
        error: error => {
          console.error('Error loading user accounts:', error);
          this.alertService.open('Не удалось загрузить счета', {
            label: 'Ошибка',
            autoClose: 5000
          });
        }
      });
  }

  // Загрузка транзакций по выбранному счету
  protected loadAccountTransactions(): void {
    if (!this.selectedAccountId) {
      return;
    }

    this.isLoading = true;
    this.userService.getAccountTransactions(this.selectedAccountId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: transactions => {
          this.transactions = transactions;
          this.cdr.markForCheck();
        },
        error: error => {
          console.error('Error loading account transactions:', error);
          this.alertService.open('Не удалось загрузить историю транзакций', {
            label: 'Ошибка',
            autoClose: 5000
          });
        }
      });
  }

  // Метод для обновления данных карточек из счетов
  private updateCardsFromAccounts(): void {
    this.cards = this.userAccounts.map(account => {
      // Определяем валюту на основе типа счета
      const currencySymbol = '₽'; // Предполагаем, что все счета в рублях
      const gradient = this.getGradientByAccountType(account.account_type || 'current');
      const color = this.getColorByAccountType(account.account_type || 'current');

      return {
        id: account.id,
        title: account.formattedType || this.formatAccountType(account.account_type || 'current'),
        content: `${account.balance} ${currencySymbol}`,
        gradient,
        color,
        account
      };
    });
  }

  // Метод для получения градиента в зависимости от типа счета
  private getGradientByAccountType(accountType: string): string {
    switch (accountType.toLowerCase()) {
      case 'current':
        return 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)';
      case 'debit':
        return 'linear-gradient(-90deg, #cf77f3 0%, #009bff 47%, #2ac9db 100%)';
      case 'credit':
        return 'linear-gradient(135deg, #ff7a7a 0%, #ff9966 100%)';
      default:
        return 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)';
    }
  }

  // Метод для получения цвета в зависимости от типа счета
  private getColorByAccountType(accountType: string): string {
    switch (accountType.toLowerCase()) {
      case 'current': return '#7d8ca0';
      case 'debit': return 'rgb(0, 155, 255)';
      case 'credit': return '#ff7a7a';
      default: return '#7d8ca0';
    }
  }

  // Метод для форматирования типа счёта
  private formatAccountType(accountType: string): string {
    const types: { [key: string]: string } = {
      'current': 'Текущий счёт',
      'credit': 'Кредитный счёт',
      'debit': 'Дебетовый счёт'
    };

    return types[accountType.toLowerCase()] || 'Счёт';
  }

  // Получение диапазона по умолчанию
  private getDefaultRange(): TuiDayRange {
    const currentDate = TuiDay.currentLocal();
    
    // Начало текущего месяца
    const startOfMonth = new TuiDay(currentDate.year, currentDate.month, 1);
    
    return new TuiDayRange(startOfMonth, currentDate);
  }

  // Обработка клика по дню в календаре
  protected onDayClick(day: TuiDay): void {
    if (!this.value?.isSingleDay) {
      this.value = new TuiDayRange(day, day);
    }
    this.value = TuiDayRange.sort(this.value.from, day);
  }

  // Обработка изменения месяца в календаре
  protected onMonthChangeFirst(month: TuiMonth): void {
    this.firstMonth = month;
  }

  // Обработка изменения выбранного счета
  protected onCardIndexChange(index: number): void {
    if (this.cards && this.cards.length > 0) {
      this.currentCardIndex = index;
      this.selectedAccountId = this.cards[index].id;
      this.loadAccountTransactions();
    }
  }

  // Получение транзакций для выбранного диапазона дат
  protected get transactionsForSelectedRange(): Transaction[] {
    if (!this.value || !this.transactions.length) return [];
    
    const from = this.value.from.toLocalNativeDate();
    const to = this.value.to.toLocalNativeDate();
    
    // Установка времени для правильного сравнения
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    
    return this.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.created_at);
      return transactionDate >= from && transactionDate <= to;
    });
  }
}