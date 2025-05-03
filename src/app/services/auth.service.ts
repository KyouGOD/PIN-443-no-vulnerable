import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { User } from './models/user.model';

export interface AuthResponse {
  token?: string;        // для обратной совместимости
  access_token?: string; // формат, который приходит с сервера
  token_type?: string;   // тип токена (например "bearer")
  user?: any;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  full_name: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_BASE_URL = 'https://pin-443.ru/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = this.getToken();
    console.log('Initial token check:', token ? 'Token exists' : 'No token');
    this.isAuthenticatedSubject.next(!!token);
  }

  signInWithEmail(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_BASE_URL}/login`, { email, password })
      .pipe(
        tap(response => {
          console.log('Auth response received:', response);
          // Проверяем наличие токена в любом из возможных полей
          const token = response?.access_token || response?.token;
          if (token) {
            console.log('Token received from email login');
            this.handleAuthResponse(token);
          } else {
            console.warn('No token in email login response');
          }
        })
      );
  }

  signInWithGoogle() {
    const currentUrl = window.location.origin + '/auth';
    console.log('Starting Google auth, will redirect back to:', currentUrl);
    window.location.href = `${this.AUTH_BASE_URL}/login/google?redirect_uri=${encodeURIComponent(currentUrl)}`;
  }

  signInWithYandex() {
    const currentUrl = window.location.origin + '/auth';
    console.log('Starting Yandex auth, will redirect back to:', currentUrl);
    window.location.href = `${this.AUTH_BASE_URL}/login/yandex?redirect_uri=${encodeURIComponent(currentUrl)}`;
  }

  register(registrationData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_BASE_URL}/register`, registrationData)
      .pipe(
        tap(response => {
          console.log('Registration response received:', response);
          const token = response?.access_token || response?.token;
          if (token) {
            console.log('Token received from registration');
            this.handleAuthResponse(token);
          } else {
            console.warn('No token in registration response');
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Registration error:', error);
          let errorMessage: string;
          
          if (error.status === 409) {
            errorMessage = 'Пользователь с таким email или телефоном уже существует';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = 'Произошла ошибка при регистрации. Пожалуйста, попробуйте позже';
          }
          
          return throwError(() => ({ error, message: errorMessage }));
        })
      );
  }

  handleAuthResponse(token: string) {
    try {
      console.log('Handling auth response with token');
      if (!token) {
        console.error('Received empty token in handleAuthResponse');
        return;
      }
      
      // Попытка сохранить токен
      this.setToken(token);
      
      // Проверка что токен действительно сохранился
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      console.log('Token saved successfully:', savedToken === token);
      
      if (savedToken) {
        this.isAuthenticatedSubject.next(true);
        console.log('Authentication state updated to true');
      } else {
        console.error('Token was not saved to localStorage');
      }
    } catch (error) {
      console.error('Error in handleAuthResponse:', error);
    }
  }

  logout() {
    console.log('Logging out, removing token');
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      console.log('Getting token:', token ? 'Token exists' : 'No token found');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private setToken(token: string) {
    try {
      console.log('Attempting to save token to localStorage');
      localStorage.setItem(this.TOKEN_KEY, token);
      console.log('Token save attempt completed');
    } catch (error) {
      console.error('Error saving token:', error);
      throw error; // Перебрасываем ошибку для обработки выше
    }
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.AUTH_BASE_URL}/me`);
  }

}