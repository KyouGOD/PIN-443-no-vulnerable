import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TUI_DEFAULT_MATCHER, TuiLet, tuiPure } from '@taiga-ui/cdk';
import { UserService } from '../services/user.service';
import { User } from '../services/models/user.model';
import { Account } from '../services/models/account.model';
import { AuthService } from '../services/auth.service';
import {
    TuiDataList,
    TuiIcon,
    TuiSurface,
    TuiTextfield,
    TuiTitle,
    TuiDialogService,
    TuiNotification,
    TuiAlertService,
    TuiNumberFormat,
    TuiLoader
} from '@taiga-ui/core';
import {
    TuiAvatar,
    TuiBadge,
    TuiCarousel,
    TuiElasticContainer,
    TuiInputSlider,
    TuiPagination
} from '@taiga-ui/kit';
import { TuiInputPhoneModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TuiCardMedium } from '@taiga-ui/layout';
import type { TuiDialogContext, TuiDialogSize } from '@taiga-ui/core';
import type { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import type { Observable } from 'rxjs';
import {
    combineLatest,
    map,
    merge,
    of,
    share,
    startWith,
    Subject,
    Subscription,
    switchMap,
    tap,
    timeout,
    catchError,
    finalize
} from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-phone-transfer',
    templateUrl: './payments.component.html',
    styleUrls: ['./payments.component.less'],
    imports: [
        TuiIcon,
        TuiCarousel,
        TuiPagination,
        TuiTextfield,
        TuiInputSlider,
        AsyncPipe,
        TuiElasticContainer,
        TuiCardMedium,
        TuiLoader,
        FormsModule,
        TuiTitle,
        TuiBadge,
        NgForOf,
        TuiSurface,
        NgIf,
        TuiAvatar,
        TuiDataList,
        TuiInputPhoneModule,
        TuiLet,
        TuiTextfieldControllerModule,
        TuiNumberFormat
    ],
})

export class PaymentsComponent implements OnInit, OnDestroy {
    private readonly userService = inject(UserService);
    private readonly authService = inject(AuthService);
    private readonly dialogs = inject(TuiDialogService);
    private readonly alertService = inject(TuiAlertService);

    // Для управления подписками
    private subscriptions = new Subscription();

    // Состояния для индикации загрузки
    isLoadingUserAccounts = false;
    isLoadingCurrentUserAccounts = false;
    isSearchingUsers = false;

    selectedMethod: number | null = null;
    selectedAccount: number | null = null;
    selectedUserAccount: number | null = null;

    protected index = 0;
    protected opacity = 1;

    // Данные карт для отображения будут загружены из счетов пользователя
    protected cards: any[] = [];

    firstUserAccounts: Account[] = [];
    userAccounts: Account[] = [];

    // Выбранный пользователь для перевода
    selectedUser: User | null = null;

    // Флаг для указания, выполняется ли сейчас перевод
    isTransferring = false;

    // Сообщение для перевода
    transferDescription = '';

    // Шаблоны для подтверждения успешного перевода
    protected confirmationHeader: PolymorpheusContent = 'Успешный перевод';
    protected confirmationContent: PolymorpheusContent<TuiDialogContext> = `
    Перевод успешно выполнен!
    `;

    // Properties for transfer between own accounts
    toAccountId: number | null = null;
    fromAccountId: number | null = null;
    transferAmount = '';
    ownTransferDescription = '';
    isOwnTransferring = false;
    ownFromAccountIndex = 0;
    ownToAccountId: number | null = null;
    ownTransferAmount: string | number = '';
    ownTransferCurrencyPrefix = '₽';

    ngOnInit() {
        // Получаем счета текущего пользователя
        this.isLoadingCurrentUserAccounts = true;

        const accountsSub = this.userService.getCurrentUserAccounts()
            .pipe(
                timeout(10000), // 10 секунд таймаут
                catchError(error => {
                    console.error('Error loading user accounts:', error);
                    this.alertService.open('Не удалось загрузить счета', {
                        label: 'Внимание',
                        autoClose: 3000
                    });
                    return of([]);
                }),
                finalize(() => this.isLoadingCurrentUserAccounts = false)
            )
            .subscribe(accounts => {
                console.log('Loaded accounts:', accounts);
                this.firstUserAccounts = accounts;

                // Заполняем данные для слайдера из счетов пользователя
                this.userAccounts = accounts;
                this.updateCardsFromAccounts();
            });

        this.subscriptions.add(accountsSub);

        // Делаем начальный поиск пользователей с пустой строкой, чтобы загрузить всех доступных пользователей
        this.search$.next('');
    }

    // Метод для обновления данных карт из счетов пользователя
    private updateCardsFromAccounts() {
        this.cards = this.userAccounts.map(account => {
            // Определяем валюту на основе типа счета (поскольку в модели нет поля currency)
            const currency = this.getCurrencyByAccountType(account.account_type || 'checking');
            const currencySymbol = this.getCurrencySymbol(currency);
            const gradient = this.getGradientByAccountType(account.account_type || 'checking');
            const color = this.getColorByAccountType(account.account_type || 'checking');

            return {
                id: account.id,
                title: this.formatAccountType(account.account_type || 'checking'),
                content: `${account.balance} ${currencySymbol}`,
                currency,
                gradient,
                color,
            };
        });

        // Если счетов нет, добавим хотя бы один пустой счет
        if (this.cards.length === 0) {
            this.cards = [{
                title: 'Текущий счёт',
                content: '0 ₽',
                currency: 'RUB',
                gradient: 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)',
                color: '#7d8ca0',
            }];
        }

        // Обновляем prefix валюты
        this.updateCurrencyPrefix();
    }

    // По умолчанию считаем, что все счета в рублях, если не указано иное
    private getCurrencyByAccountType(accountType: string): string {
        // Здесь можно добавить логику определения валюты по типу счета, если это имеет смысл
        // Сейчас просто возвращаем RUB для всех типов
        return 'RUB';
    }

    private getCurrencySymbol(currency: string): string {
        switch (currency) {
            case 'RUB': return '₽';
            case 'USD': return '$';
            case 'EUR': return '€';
            default: return '₽';
        }
    }

    private getGradientByAccountType(accountType: string): string {
        switch (accountType.toLowerCase()) {
            case 'checking':
                return 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)';
            case 'savings':
                return 'linear-gradient(-90deg, #cf77f3 0%, #009bff 47%, #2ac9db 100%)';
            case 'credit':
                return 'linear-gradient(135deg, #ff7a7a 0%, #ff9966 100%)';
            case 'deposit':
                return 'linear-gradient(135deg, #1AC07E, #DEA683)';
            default:
                return 'linear-gradient(334.83deg, #7d8ca0 0%, #647382 100%)';
        }
    }

    private getColorByAccountType(accountType: string): string {
        switch (accountType.toLowerCase()) {
            case 'checking': return '#7d8ca0';
            case 'savings': return 'rgb(0, 155, 255)';
            case 'credit': return '#ff7a7a';
            case 'deposit': return 'rgb(158 178 129)';
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

    protected readonly paymentMethods = [
        { id: 1, name: 'Перевод по номеру карты' },
        { id: 2, name: 'Перевод по реквизитам' },
        { id: 3, name: 'Перевод себе в другой банк' },
        { id: 4, name: 'Перевод между своими счетами' },
        { id: 7, name: 'Оплатить домашний интернет' },
        { id: 8, name: 'Оплатить мобильную связь' }
    ];

    private readonly search$ = new Subject<string>();

    private readonly selected$ = new Subject<User>();

    protected value = '';

    get isPhoneValid(): boolean {
        return !!this.value && this.value.length >= 12;
    }

    protected money_value = '';

    protected currencyPrefix = '₽';
    protected currentCardIndex = 0;

    updateCurrencyPrefix() {
        if (this.cards && this.cards.length > 0 && this.currentCardIndex < this.cards.length) {
            const currentCard = this.cards[this.currentCardIndex];
            switch (currentCard.currency) {
                case 'RUB':
                    this.currencyPrefix = '₽';
                    break;
                case 'USD':
                    this.currencyPrefix = '$';
                    break;
                case 'EUR':
                    this.currencyPrefix = '€';
                    break;
                default:
                    this.currencyPrefix = '₽';
            }
        }
    }

    // Method to update currency prefix for own transfers section
    updateOwnTransferCurrencyPrefix() {
        if (this.cards && this.cards.length > 0 && this.ownFromAccountIndex < this.cards.length) {
            const currentCard = this.cards[this.ownFromAccountIndex];
            switch (currentCard.currency) {
                case 'RUB':
                    this.ownTransferCurrencyPrefix = '₽';
                    break;
                case 'USD':
                    this.ownTransferCurrencyPrefix = '$';
                    break;
                case 'EUR':
                    this.ownTransferCurrencyPrefix = '€';
                    break;
                default:
                    this.ownTransferCurrencyPrefix = '₽';
            }
        }
    }

    protected onClickConfirm(
        content: PolymorpheusContent<TuiDialogContext>,
        header: PolymorpheusContent,
        size: TuiDialogSize,
    ): void {
        this.dialogs
            .open(content, {
                label: 'Перевод выполнен',
                header,
                size,
            })
            .subscribe();
    }

    // Метод для выполнения перевода между пользователями
    protected performTransfer(): void {
        if (!this.isPhoneValid || this.selectedUserAccount === null || !this.money_value) {
            this.alertService.open('Пожалуйста, заполните все необходимые поля', {
                label: 'Внимание',
                autoClose: 3000
            });
            return;
        }

        // Получаем ID текущего выбранного счета отправителя
        const fromAccountId = this.cards[this.currentCardIndex]?.id;

        // Получаем ID выбранного счета получателя
        const toAccountId = this.selectedUserAccount;

        // Получаем ID пользователя-получателя
        const toUserId = this.selectedUser?.id;

        // Безопасное преобразование суммы в число с учетом разных типов входных данных
        let amount: number;

        if (typeof this.money_value === 'string') {
            // Если это строка - заменяем запятую на точку
            amount = parseFloat(this.money_value.replace(',', '.'));
        } else if (typeof this.money_value === 'number') {
            // Если это уже число - используем напрямую
            amount = this.money_value;
        } else {
            // Для любых других типов пытаемся преобразовать к числу
            console.log('Unexpected money_value type:', typeof this.money_value, this.money_value);
            amount = Number(this.money_value);
        }

        if (!fromAccountId || !toAccountId || !toUserId || isNaN(amount) || amount <= 0) {
            this.alertService.open('Неверные данные для перевода', {
                label: 'Внимание',
                autoClose: 3000
            });
            return;
        }

        // Устанавливаем флаг выполнения перевода
        this.isTransferring = true;

        console.log('Performing transfer:', {
            fromAccountId,
            toUserId,
            toAccountId,
            amount,
            description: this.transferDescription
        });

        // Выполняем перевод с явным преобразованием ID в числа
        this.userService.interUserTransfer(
            Number(fromAccountId),
            Number(toUserId),
            Number(toAccountId),
            amount,
            this.transferDescription
        ).subscribe({
            next: (response) => {
                console.log('Transfer successful:', response);
                this.isTransferring = false;

                // Обновляем счета после успешного перевода
                this.userService.getCurrentUserAccounts().subscribe(accounts => {
                    this.userAccounts = accounts;
                    this.updateCardsFromAccounts();
                });

                // Очищаем поля ввода
                this.money_value = '';
                this.transferDescription = '';

                // Отображаем диалог успешного перевода
                this.onClickConfirm(this.confirmationContent, this.confirmationHeader, 'm');
            },
            error: (error) => {
                console.error('Transfer error:', error);
                this.isTransferring = false;

                // Отображаем ошибку
                this.alertService.open(error.error?.detail || 'Произошла ошибка при выполнении перевода', {
                    label: 'Внимание',
                    autoClose: 3000
                });
            }
        });
    }

    // Method to handle transfer between own accounts
    protected performOwnAccountsTransfer(): void {
        if (!this.cards || !this.cards[this.ownFromAccountIndex] || !this.ownToAccountId || !this.ownTransferAmount) {
            this.alertService.open('Пожалуйста, выберите счета и введите сумму перевода', {
                label: 'Внимание',
                autoClose: 3000
            });
            return;
        }

        const fromAccountId = this.cards[this.ownFromAccountIndex].id;
        
        if (fromAccountId === this.ownToAccountId) {
            this.alertService.open('Невозможно перевести деньги на тот же счет', {
                label: 'Внимание',
                autoClose: 3000
            });
            return;
        }

        let amount: number;
        if (typeof this.ownTransferAmount === 'string') {
            amount = parseFloat(this.ownTransferAmount.replace(',', '.'));
        } else {
            amount = Number(this.ownTransferAmount);
        }

        if (isNaN(amount) || amount <= 0) {
            this.alertService.open('Введите корректную сумму перевода', {
                label: 'Внимание',
                autoClose: 3000
            });
            return;
        }

        // Start transferring
        this.isOwnTransferring = true;

        console.log('Performing transfer between own accounts:', {
            fromAccountId: fromAccountId,
            toAccountId: this.ownToAccountId,
            amount: amount,
            description: this.ownTransferDescription
        });

        this.userService.transferBetweenOwnAccounts(
            fromAccountId,
            this.ownToAccountId,
            amount,
            this.ownTransferDescription
        ).subscribe({
            next: (response) => {
                console.log('Transfer between own accounts successful:', response);
                this.isOwnTransferring = false;

                // Refresh accounts after successful transfer
                this.userService.getCurrentUserAccounts().subscribe(accounts => {
                    this.userAccounts = accounts;
                    this.updateCardsFromAccounts();
                });

                // Reset input fields
                this.ownTransferAmount = '';
                this.ownTransferDescription = '';

                // Show success dialog
                this.onClickConfirm(
                    'Перевод между вашими счетами успешно выполнен!',
                    'Успешный перевод',
                    'm'
                );
            },
            error: (error) => {
                console.error('Transfer error:', error);
                this.isOwnTransferring = false;

                // Show error
                this.alertService.open(error.error?.detail || 'Произошла ошибка при выполнении перевода', {
                    label: 'Внимание',
                    autoClose: 3000
                });
            }
        });
    }

    // Helper method to check if the own transfer amount is valid
    protected isOwnTransferAmountValid(): boolean {
        if (!this.ownTransferAmount) {
            return false;
        }
        
        let amount: number;
        if (typeof this.ownTransferAmount === 'string') {
            amount = parseFloat(this.ownTransferAmount.replace(',', '.'));
        } else {
            amount = this.ownTransferAmount;
        }
        
        return !isNaN(amount) && amount > 0;
    }
    
    protected readonly user$ = merge(
        this.selected$,
        this.search$.pipe(
            switchMap((value) =>
                this.request(value).pipe(
                    map((response) =>
                        this.isFullMatch(response, value) ? response[0] : null,
                    ),
                ),
            ),
        ),
    ).pipe(
        tap((user) => {
            console.log('Selected user:', user);
            if (user) {
                this.value = user.phone || '';
                this.selectedUser = user; // Сохраняем выбранного пользователя

                // При выборе пользователя получаем его счета
                if (user.id) {
                    this.userService.getAccountByUserId(user.id).subscribe(accounts => {
                        console.log('User accounts:', accounts);
                        this.firstUserAccounts = accounts;
                    });
                }
            }
        }),
        share(),
    );

    protected readonly items$ = this.search$.pipe(
        startWith(''),
        switchMap((value) =>
            this.request(value).pipe(
                map((response) => {
                    // Если пустой запрос, возвращаем все результаты
                    if (!value) {
                        return response;
                    }

                    // Если найдено полное соответствие, возвращаем пустой массив,
                    // так как этот пользователь будет отображаться как выбранный
                    if (this.isFullMatch(response, value)) {
                        return [];
                    }

                    // В противном случае фильтруем пользователей, которые соответствуют запросу
                    return this.filterUsers(response, value);
                })
            ),
        ),
    );

    protected onSearch(search: string): void {
        this.isSearchingUsers = true;
        this.search$.next(search);
    }

    protected onClick(user: User): void {
        // Сбрасываем предыдущие данные
        this.firstUserAccounts = [];
        this.selectedUserAccount = null;

        this.isLoadingUserAccounts = true;
        this.selected$.next(user);
    }

    protected showNotification(): void {
        
        this.alertService
            .open('Приносим извинения, данный функционал еще в разработке', {
                label: 'В разработке',
                autoClose: 3000
            })
            .subscribe();
    }

    // Method to check if accounts are available for transfer
    protected get canShowOwnAccountsTransfer(): boolean {
        return this.selectedMethod === 4 && this.userAccounts.length > 1;
    }

    // Method to check if there are not enough accounts for transfer
    protected get notEnoughAccounts(): boolean {
        return this.selectedMethod === 4 && this.userAccounts.length <= 1;
    }

    @tuiPure
    private request(query: string): Observable<readonly User[]> {
        console.log('Searching users with query:', query);
        return this.userService.searchUsers(query).pipe(
            timeout(10000), // 10 секунд таймаут
            catchError(error => {
                console.error('Error searching users:', error);
                this.alertService.open('Ошибка поиска пользователей', {
                    label: 'Внимание',
                    autoClose: 3000
                });
                return of([]);
            }),
            tap(users => console.log('Found users:', users)),
            finalize(() => this.isSearchingUsers = false),
            share()
        );
    }

    private getPlaceholder(search: string): string {
        if (!search) {
            return 'Номер телефона или имя';
        }

        if (search.startsWith('+')) {
            return 'Номер телефона';
        }

        return 'Имя';
    }

    private isFullMatch(response: readonly User[], value: string): boolean {
        return (
            response.length === 1 &&
            (String(response[0]) === value || response[0]?.phone === value)
        );
    }


    private filterUsers(users: readonly User[], query: string): User[] {
        if (!query) {
            return users as User[];
        }

        const lowerQuery = query.toLowerCase();

        return users.filter((user) => {
            // Проверяем, содержат ли имя или телефон пользователя поисковый запрос
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const phone = (user.phone || '').toLowerCase();

            return fullName.includes(lowerQuery) ||
                phone.includes(lowerQuery) ||
                (user.email || '').toLowerCase().includes(lowerQuery);
        });
    }

    /**
     * Отписываемся от всех подписок при уничтожении компонента
     */
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}