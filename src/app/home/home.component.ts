import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TuiTitle, TuiIcon, TuiSurface, TuiAlertService, TuiLoader, TuiDialogService, TuiButton } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiButtonGroup, TuiCarousel, TuiElasticContainer, TuiPagination } from '@taiga-ui/kit';
import { TuiCardMedium } from '@taiga-ui/layout';
import { TuiFallbackSrcPipe } from '@taiga-ui/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { UserService } from '../services/user.service';
import { Account } from '../services/models/account.model';
import { catchError, finalize, of, takeUntil, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [
        TuiTitle,
        NgForOf,
        NgIf,
        TuiBadge,
        TuiButtonGroup,
        TuiCardMedium,
        TuiCarousel,
        TuiElasticContainer,
        TuiIcon,
        TuiSurface,
        TuiPagination,
        TuiLoader,
        FormsModule,
        TuiButton,
        RouterLink
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
    protected index = 0;
    protected opacity = 1;
    protected loading = false;
    protected error = false;
    protected hasAccounts = false;
    
    // Transaction related properties
    protected isDepositDialogOpen = false;
    protected isWithdrawDialogOpen = false;
    protected transactionAmount = '';
    protected transactionDescription = '';
    protected isProcessingTransaction = false;
    
    // Account creation properties
    protected isCreatingAccount = false;

    // Initialize with empty array instead of undefined
    protected items: {
        title: string;
        content: string;
        gradient: string;
        color: string;
        account?: Account;
    }[] = [];
    
    private destroy$ = new Subject<void>();

    constructor(
        private readonly alertService: TuiAlertService,
        private readonly userService: UserService,
        private readonly cdr: ChangeDetectorRef,
        private readonly dialogService: TuiDialogService,
        private readonly router: Router
    ) {}

    ngOnInit(): void {
        this.loadAccounts();
    }
    
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadAccounts(): void {
        this.loading = true;
        this.error = false;
        
        // Make sure we mark component for check after status changes
        this.cdr.markForCheck();
        
        this.userService.getCurrentUserAccounts().pipe(
            takeUntil(this.destroy$),
            catchError((err) => {
                console.error('Failed to load accounts', err);
                this.error = true;
                this.alertService
                    .open('Не удалось загрузить счета. Пожалуйста, попробуйте позже.', {
                        label: 'Ошибка',
                        autoClose: 5000,
                    })
                    .subscribe();
                
                // If we have error, return empty array but continue execution
                return of([]);
            }),
            finalize(() => {
                this.loading = false;
                // Force update the view after loading completes
                this.cdr.markForCheck();
            })
        ).subscribe(accounts => {
            // Проверяем, есть ли у пользователя счета
            this.hasAccounts = accounts && accounts.length > 0;
            
            if (accounts.length === 0 && !this.error) {
                this.alertService
                    .open('У вас пока нет открытых счетов. Вы можете открыть новый счет.', {
                        label: 'Информация',
                        autoClose: 5000,
                    })
                    .subscribe();
            }
            
            if (this.hasAccounts) {
                this.items = this.mapAccountsToItems(accounts);
            } else {
                // Если счетов нет, очищаем массив items
                this.items = [];
            }
            
            // Force update the view
            this.cdr.markForCheck();
        });
    }

    private mapAccountsToItems(accounts: Account[]): {
        title: string;
        content: string;
        gradient: string;
        color: string;
        account: Account;
    }[] {
        if (accounts.length === 0) {
            return [];
        }

        return accounts.map(account => {
            // Determine currency symbol based on account display name
            const currencySymbol = this.getCurrencySymbol(account.displayName || '');
            
            // Generate a color and gradient based on the account type
            const { color, gradient } = this.getColorForAccountType(account.account_type);
            
            return {
                title: `${account.formattedType || account.account_type}`,
                content: `${account.balance} ${currencySymbol}`,
                gradient,
                color,
                account
            };
        });
    }

    public getCurrencySymbol(currency: string): string {
        const symbols: { [key: string]: string } = {
            'RUB': '₽',
            'USD': '$',
            'EUR': '€'
        };
        return symbols[currency] || '₽';
    }

    private getColorForAccountType(accountType: string): { color: string, gradient: string } {
        switch (accountType.toLowerCase()) {
            case 'checking':
                return {
                    color: '#7d8ca0',
                    gradient: 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)'
                };
            case 'current':
                return {
                    color: 'rgb(0, 155, 255)',
                    gradient: 'linear-gradient(-90deg, #cf77f3 0%, #009bff 47%, #2ac9db 100%)'
                };
            case 'debit':
                return {
                    color: 'rgb(158 178 129)',
                    gradient: 'linear-gradient(135deg, #1AC07E, #DEA683)'
                };
            case 'credit':
                return {
                    color: '#d48166',
                    gradient: 'linear-gradient(135deg, #f5515f, #d48166)'
                };
            default:
                return {
                    color: '#7d8ca0',
                    gradient: 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)'
                };
        }
    }

    protected showNotification(): void {
        this.alertService
            .open('Приносим извинения, данный функционал еще в разработке', {
                label: 'В разработке',
                autoClose: 3000
            })
            .subscribe();
    }

    protected refreshAccounts(): void {
        this.loadAccounts();
    }
    
    // Метод для открытия диалога пополнения счета
    protected openDepositDialog(): void {
        console.log('Opening deposit dialog');
        if (!this.hasAccounts || this.items.length === 0) {
            this.alertService
                .open('У вас нет доступных счетов для пополнения.', {
                    label: 'Предупреждение',
                    autoClose: 3000
                })
                .subscribe();
            return;
        }

        this.transactionAmount = '';
        this.transactionDescription = '';
        this.isDepositDialogOpen = true;
        console.log('Deposit dialog opened:', this.isDepositDialogOpen);
        this.cdr.detectChanges(); // заменили markForCheck на detectChanges
    }
    
    // Метод для открытия диалога вывода средств
    protected openWithdrawDialog(): void {
        console.log('Opening withdraw dialog');
        if (!this.hasAccounts || this.items.length === 0) {
            this.alertService
                .open('У вас нет доступных счетов для вывода средств.', {
                    label: 'Предупреждение',
                    autoClose: 3000
                })
                .subscribe();
            return;
        }

        this.transactionAmount = '';
        this.transactionDescription = '';
        this.isWithdrawDialogOpen = true;
        console.log('Withdraw dialog opened:', this.isWithdrawDialogOpen);
        this.cdr.detectChanges(); // заменили markForCheck на detectChanges
    }
    
    // Метод для закрытия диалога транзакции
    protected closeTransactionDialog(): void {
        console.log('Closing transaction dialog');
        this.isDepositDialogOpen = false;
        this.isWithdrawDialogOpen = false;
        this.cdr.detectChanges(); // заменили markForCheck на detectChanges
    }
    
    // Метод для выполнения пополнения счета
    protected performDeposit(): void {
        console.log('Performing deposit with amount:', this.transactionAmount);
        if (!this.validateTransaction()) return;
        
        const currentAccount = this.items[this.index].account;
        if (!currentAccount || !currentAccount.id) {
            this.alertService
                .open('Не удалось определить счет для пополнения.', {
                    label: 'Ошибка',
                    autoClose: 3000
                })
                .subscribe();
            return;
        }
        
        // Обработка суммы - она может быть числом или строкой
        const amount = typeof this.transactionAmount === 'string' 
            ? parseFloat(this.transactionAmount.replace(',', '.'))
            : Number(this.transactionAmount);
        
        this.isProcessingTransaction = true;
        this.cdr.detectChanges();
        
        console.log('Making deposit request for account:', currentAccount.id, 'with amount:', amount);
        this.userService.depositToAccount(
            currentAccount.id, 
            amount, 
            this.transactionDescription
        ).pipe(
            finalize(() => {
                this.isProcessingTransaction = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (response) => {
                console.log('Deposit successful:', response);
                this.alertService
                    .open('Счет успешно пополнен!', {
                        label: 'Успешно',
                        autoClose: 3000
                    })
                    .subscribe();
                
                this.closeTransactionDialog();
                this.loadAccounts(); // Обновляем счета после транзакции
            },
            error: (error) => {
                console.error('Deposit failed:', error);
                this.alertService
                    .open(error.error?.detail || 'Произошла ошибка при пополнении счета.', {
                        label: 'Ошибка',
                        autoClose: 5000
                    })
                    .subscribe();
            }
        });
    }
    
    // Метод для выполнения вывода средств
    protected performWithdraw(): void {
        console.log('Performing withdraw with amount:', this.transactionAmount);
        if (!this.validateTransaction()) return;
        
        const currentAccount = this.items[this.index].account;
        if (!currentAccount || !currentAccount.id) {
            this.alertService
                .open('Не удалось определить счет для вывода средств.', {
                    label: 'Ошибка',
                    autoClose: 3000
                })
                .subscribe();
            return;
        }
        
        // Обработка суммы - она может быть числом или строкой
        const amount = typeof this.transactionAmount === 'string' 
            ? parseFloat(this.transactionAmount.replace(',', '.'))
            : Number(this.transactionAmount);
        
        this.isProcessingTransaction = true;
        this.cdr.detectChanges();
        
        console.log('Making withdraw request for account:', currentAccount.id, 'with amount:', amount);
        this.userService.withdrawFromAccount(
            currentAccount.id, 
            amount, 
            this.transactionDescription
        ).pipe(
            finalize(() => {
                this.isProcessingTransaction = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (response) => {
                console.log('Withdraw successful:', response);
                this.alertService
                    .open('Средства успешно сняты со счета!', {
                        label: 'Успешно',
                        autoClose: 3000
                    })
                    .subscribe();
                
                this.closeTransactionDialog();
                this.loadAccounts(); // Обновляем счета после транзакции
            },
            error: (error) => {
                console.error('Withdraw failed:', error);
                this.alertService
                    .open(error.error?.detail || 'Произошла ошибка при снятии средств. Убедитесь, что на счете достаточно средств.', {
                        label: 'Ошибка',
                        autoClose: 5000
                    })
                    .subscribe();
            }
        });
    }
    
    // Метод для валидации суммы транзакции
    private validateTransaction(): boolean {
        if (!this.transactionAmount || isNaN(Number(this.transactionAmount))) {
            this.alertService
                .open('Пожалуйста, укажите сумму.', {
                    label: 'Предупреждение',
                    autoClose: 3000
                })
                .subscribe();
            return false;
        }
        
        // Обработка суммы - она может быть числом или строкой
        const amount = typeof this.transactionAmount === 'string' 
            ? parseFloat(this.transactionAmount.replace(',', '.'))
            : Number(this.transactionAmount);
            
        if (isNaN(amount) || amount <= 0) {
            this.alertService
                .open('Пожалуйста, укажите корректную сумму больше нуля.', {
                    label: 'Предупреждение',
                    autoClose: 3000
                })
                .subscribe();
            return false;
        }
        
        return true;
    }
    
    // Метод для расчета суммарного баланса всех счетов
    protected getTotalBalance(): string {
        if (!this.hasAccounts || this.items.length === 0) {
            return '0 ₽';
        }
        
        // Предполагаем, что все счета в одной валюте (рубли)
        const total = this.items.reduce((sum, item) => {
            // Проверяем, что у счета есть баланс
            if (item.account && item.account.balance) {
                // Преобразуем строку баланса в число, удаляя пробелы и символ валюты
                const numericBalance = parseFloat(
                    item.account.balance.toString().replace(/[^\d.-]/g, '')
                );
                
                if (!isNaN(numericBalance)) {
                    return sum + numericBalance;
                }
            }
            return sum;
        }, 0);
        
        // Форматируем сумму с разделителем тысяч
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(total);
    }
        
    // Account creation methods
    protected createCreditCard(): void {
        this.createAccountWithType('credit', 'Кредитная карта');
    }
    
    protected createCheckingAccount(): void {
        this.createAccountWithType('current', 'Расчетный счет');
    }
    
    protected createDebitAccount(): void {
        this.createAccountWithType('debit', 'Дебетовый счет');
    }
    
    private createAccountWithType(accountType: string, accountName: string): void {
        if (this.isCreatingAccount) {
            return;
        }
        
        this.isCreatingAccount = true;
        this.cdr.markForCheck();
        
        this.userService.createAccount(accountType).pipe(
            finalize(() => {
                this.isCreatingAccount = false;
                this.cdr.markForCheck();
            })
        ).subscribe({
            next: (account) => {
                this.alertService
                    .open(`${accountName} успешно создан!`, {
                        label: 'Успешно',
                        autoClose: 3000
                    })
                    .subscribe();
                
                // Обновляем список счетов
                this.loadAccounts();
            },
            error: (error) => {
                this.alertService
                    .open(error.error?.detail || `Не удалось создать ${accountName.toLowerCase()}. Попробуйте позже.`, {
                        label: 'Ошибка',
                        autoClose: 5000
                    })
                    .subscribe();
            }
        });
    }
}
