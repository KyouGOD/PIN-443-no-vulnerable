import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { TuiButton } from '@taiga-ui/core';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.less'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton, RouterModule]
})
export class AuthComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  loading = false;
  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit() {
    console.log('AuthComponent initialized');
    this.route.queryParams.subscribe(params => {
      console.log('Received query params:', params);
      
      // После редиректа от Google токен может прийти в разных параметрах
      const token = params['token'] || params['access_token'] || params['auth_token'];
      
      if (token) {
        console.log('Found token in URL parameters');
        this.loading = true;
        try {
          this.authService.handleAuthResponse(token);
          this.notificationService.success('Вход выполнен успешно');
          this.router.navigate(['/home']);
        } catch (error) {
          console.error('Error handling auth response:', error);
          this.notificationService.error('Ошибка при обработке авторизации');
        } finally {
          this.loading = false;
        }
      } else {
        console.log('No token found in URL parameters:', Object.keys(params));
      }
    });
  }

  onSubmit() {
    console.log('Attempting email/password login');
    if (this.authForm.valid) {
      this.loading = true;
      const email = this.authForm.get('email')?.value || '';
      const password = this.authForm.get('password')?.value || '';
      
      console.log('Sending login request for email:', email);
      this.authService.signInWithEmail(email, password).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          const token = response?.access_token || response?.token;
          if (token) {
            this.authService.handleAuthResponse(token);
            this.notificationService.success('Вход выполнен успешно');
            this.router.navigate(['/home']);
          } else {
            console.error('No token in login response');
            this.notificationService.error('Ошибка авторизации: отсутствует токен');
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Login error:', error);
          let errorMessage = 'Неверный email или пароль';
          if (error.status === 0) {
            errorMessage = 'Ошибка соединения с сервером';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          this.notificationService.error(errorMessage);
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      console.log('Form invalid:', this.authForm.errors);
      this.notificationService.error('Пожалуйста, заполните все поля корректно');
    }
  }

  signInWithGoogle() {
    console.log('Starting Google authentication');
    this.loading = true;
    this.authService.signInWithGoogle();
  }
  
  signInWithYandex() {
    console.log('Starting Yandex authentication');
    this.loading = true;
    this.authService.signInWithYandex();
  }
}