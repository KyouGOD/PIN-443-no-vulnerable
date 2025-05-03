import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { User } from './models/user.model';
import { environment } from '../../environments/environment';
import { Account } from './models/account.model';
import { Transaction } from './models/transaction.model';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Используем URL из конфигурации окружения с префиксом /api
  private readonly API_URL = `${environment.apiUrl}/banking`;

  constructor(private http: HttpClient) {
    console.log('Using API URL from environment:', this.API_URL);
  }

  private enrichUser(user: User): User {
    const nameParts = user.full_name.split(' ');
    user.firstName = nameParts[0] || '';
    user.lastName = nameParts.slice(1).join(' ') || '';

    if (!user.phone) {
      user.phone = user.email;
    }

    user.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName || '')}`;

    user.disabled = !user.is_active;

    return user;
  }

  // Вспомогательный метод для обогащения счетов дополнительной информацией
  private enrichAccount(account: Account): Account {
    // Форматирование типа счета для отображения
    account.formattedType = this.formatAccountType(account.account_type);

    // Определение отображаемого названия (валюты) счёта
    account.displayName = this.formatAccountCurrency(account.account_type);

    // Преобразование строкового баланса в число
    account.numericBalance = parseFloat(account.balance);

    return account;
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

  // Метод для определения валюты счёта
  private formatAccountCurrency(accountType: string): string {
    // Здесь можно было бы использовать логику определения валюты по типу счёта
    // Пока используем дефолтное значение
    return 'RUB';
  }

  // Вспомогательный метод для обогащения транзакций дополнительной информацией
  private enrichTransaction(transaction: Transaction): Transaction {
    // Определяем тип транзакции на основе описания
    const desc = transaction.description.toLowerCase();
    
    if (desc.includes('transfer from account') || desc.includes('transfer from user')) {
      // Входящие переводы - на текущий счет поступили деньги
      transaction.isIncoming = true;
      transaction.isOutgoing = false;
    } 
    else if (desc.includes('transfer to account') || desc.includes('transfer to user')) {
      // Исходящие переводы - с текущего счета списаны деньги
      transaction.isIncoming = false;
      transaction.isOutgoing = true;
    }
    else if (transaction.transaction_type.toLowerCase() === 'deposit') {
      // Пополнение счета - ДОХОД
      transaction.isIncoming = true;
      transaction.isOutgoing = false;
    } 
    else if (transaction.transaction_type.toLowerCase() === 'withdrawal') {
      // Снятие средств - РАСХОД
      transaction.isIncoming = false;
      transaction.isOutgoing = true;
    }
    else {
      // По умолчанию определяем по типу транзакции
      transaction.isIncoming = ['incoming'].includes(transaction.transaction_type.toLowerCase());
      transaction.isOutgoing = !transaction.isIncoming;
    }
    
    // Форматируем тип транзакции для отображения
    transaction.formattedType = this.formatTransactionType(transaction.transaction_type);
    
    // Форматируем дату
    const date = new Date(transaction.created_at);
    transaction.formattedDate = date.toLocaleDateString('ru-RU');
    
    // Форматируем сумму с учетом плюса/минуса
    const formattedAmount = transaction.amount.toLocaleString('ru-RU');
    transaction.displayAmount = transaction.isIncoming 
      ? `+${formattedAmount} ₽` 
      : `-${formattedAmount} ₽`;
    
    return transaction;
  }

  // Метод для форматирования типа транзакции
  private formatTransactionType(type: string): string {
    const types: { [key: string]: string } = {
      'deposit': 'Пополнение',
      'withdrawal': 'Снятие',
      'transfer': 'Перевод',
      'incoming': 'Входящий перевод',
      'outgoing': 'Исходящий перевод'
    };

    return types[type.toLowerCase()] || 'Операция';
  }

  searchUsers(query: string): Observable<User[]> {
    // Формируем полный URL для запроса
    const fullUrl = `${this.API_URL}/available-users`;
    console.log('Searching users with URL:', fullUrl, 'Query:', query);

    return this.http.get<User[]>(fullUrl, {
      params: { search: query } // Изменено с query на search для соответствия API
    }).pipe(
      map(users => {
        console.log('Server returned users:', users);
        // Обогащаем пользователей дополнительными полями для интерфейса
        const enrichedUsers = users.map(user => this.enrichUser(user));
        console.log('Enriched users:', enrichedUsers);
        return enrichedUsers;
      }),
      catchError(error => {
        console.error('Error in searchUsers:', error);
        console.log('Request was made to:', fullUrl);
        return throwError(() => error);
      })
    );
  }

  getCurrentUserAccounts(): Observable<Account[]> {
    const fullUrl = `${this.API_URL}/accounts`;
    console.log('Getting current user accounts with URL:', fullUrl);

    return this.http.get<Account[]>(fullUrl).pipe(
      map(accounts => {
        console.log('Server returned accounts:', accounts);
        // Обогащаем счета дополнительными полями для интерфейса
        return accounts.map(account => this.enrichAccount(account));
      }),
      catchError(error => {
        console.error('Error in getCurrentUserAccounts:', error);
        return throwError(() => error);
      })
    );
  }

  getAccountByUserId(userId: string | number): Observable<Account[]> {
    const fullUrl = `${this.API_URL}/users/${userId}/accounts`;
    console.log('Getting account by user ID with URL:', fullUrl);

    return this.http.get<Account[]>(fullUrl).pipe(
      map(accounts => {
        console.log('Server returned user accounts:', accounts);
        // Обогащаем счета дополнительными полями для интерфейса
        return accounts.map(account => this.enrichAccount(account));
      }),
      catchError(error => {
        console.error('Error in getAccountByUserId:', error);
        return throwError(() => error);
      })
    );
  }

  // Метод для выполнения перевода между пользователями
  interUserTransfer(fromAccountId: number, toUserId: number, toAccountId: number, amount: number, description: string = ''): Observable<any> {
    return this.http.post(`${this.API_URL}/inter-user-transfer/`, {
      from_account_id: fromAccountId,
      to_user_id: toUserId,
      to_account_id: toAccountId,
      amount: amount,
      description: description
    });
  }

  // Метод для перевода между своими счетами
  transferBetweenOwnAccounts(fromAccountId: number, toAccountId: number, amount: number, description: string = ''): Observable<any> {
    const fullUrl = `${this.API_URL}/transfer/`;
    console.log('Transferring between own accounts with URL:', fullUrl);

    return this.http.post(fullUrl, {
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount: amount,
      description: description
    }).pipe(
      catchError(error => {
        console.error('Error in transferBetweenOwnAccounts:', error);
        return throwError(() => error);
      })
    );
  }

  // Метод для внесения средств на счет (пополнение)
  depositToAccount(accountId: number, amount: number, description: string = ''): Observable<any> {
    const fullUrl = `${this.API_URL}/accounts/${accountId}/deposit`;
    console.log('Depositing to account with URL:', fullUrl);

    return this.http.post(fullUrl, {
      amount: amount,
      description: description,
      transaction_type: 'deposit'  // Changed from 'DEPOSIT' to 'deposit'
    }).pipe(
      catchError(error => {
        console.error('Error in depositToAccount:', error);
        return throwError(() => error);
      })
    );
  }

  // Метод для снятия средств со счета (вывод)
  withdrawFromAccount(accountId: number, amount: number, description: string = ''): Observable<any> {
    const fullUrl = `${this.API_URL}/accounts/${accountId}/withdraw`;
    console.log('Withdrawing from account with URL:', fullUrl);

    return this.http.post(fullUrl, {
      amount: amount,
      description: description,
      transaction_type: 'withdrawal'
    }).pipe(
      catchError(error => {
        console.error('Error in withdrawFromAccount:', error);
        return throwError(() => error);
      })
    );
  }

  getCurrentUser(): Observable<User> {
    const fullUrl = `${environment.apiUrl}/auth/me`;
    console.log('Getting current user info with URL:', fullUrl);

    return this.http.get<User>(fullUrl).pipe(
      map(user => {
        console.log('Server returned user data:', user);
        return this.enrichUser(user);
      }),
      catchError(error => {
        console.error('Error in getCurrentUser:', error);
        return throwError(() => error);
      })
    );
  }

  // Метод для создания нового счета
  createAccount(accountType: string): Observable<Account> {
    const fullUrl = `${this.API_URL}/accounts`;
    console.log('Creating new account with URL:', fullUrl, 'Type:', accountType);

    return this.http.post<Account>(fullUrl, {
      account_type: accountType
    }).pipe(
      map(account => {
        console.log('Server returned new account:', account);
        return this.enrichAccount(account);
      }),
      catchError(error => {
        console.error('Error in createAccount:', error);
        return throwError(() => error);
      })
    );
  }

  // Метод для получения истории транзакций по счету
  getAccountTransactions(accountId: number): Observable<Transaction[]> {
    const fullUrl = `${this.API_URL}/accounts/${accountId}/transactions/`;
    console.log('Getting account transactions with URL:', fullUrl);

    return this.http.get<Transaction[]>(fullUrl).pipe(
      map(transactions => {
        console.log('Server returned transactions:', transactions);
        // Обогащаем транзакции дополнительными полями для интерфейса
        return transactions.map(transaction => this.enrichTransaction(transaction));
      }),
      catchError(error => {
        console.error('Error in getAccountTransactions:', error);
        return throwError(() => error);
      })
    );
  }
}