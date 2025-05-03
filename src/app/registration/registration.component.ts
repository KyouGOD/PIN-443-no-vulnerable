import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TuiButton } from '@taiga-ui/core';
import { TuiTextfield } from '@taiga-ui/core';
import { finalize } from 'rxjs/operators';
import { AuthService, RegisterRequest } from '../services/auth.service';

@Component({
    selector: 'app-registration',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        RouterLink
    ],
    templateUrl: './registration.component.html',
    styleUrl: './registration.component.less'
})
export class RegistrationComponent implements OnInit {
    registrationForm!: FormGroup;
    loading = false;
    errorMessage = '';

    constructor(
        private readonly formBuilder: FormBuilder,
        private readonly router: Router,
        private readonly authService: AuthService
    ) { }

    ngOnInit(): void {
        this.registrationForm = this.initForm();
    }

    private initForm(): FormGroup {
        return this.formBuilder.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [
                Validators.required,
                Validators.pattern(/^\+7\d{10}$/)
            ]],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                this.createPasswordValidator()
            ]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    // Custom password validator with specific rules
    private createPasswordValidator() {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value) {
                return null;
            }

            const hasUpperCase = /[A-Z]/.test(value);
            const hasLowerCase = /[a-z]/.test(value);
            const hasNumeric = /[0-9]/.test(value);
            const hasSpecialChar = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]/.test(value);

            const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

            return !passwordValid ? {
                passwordStrength: {
                    hasUpperCase,
                    hasLowerCase,
                    hasNumeric,
                    hasSpecialChar,
                }
            } : null;
        };
    }

    private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
        const password = group.get('password');
        const confirmPassword = group.get('confirmPassword');

        if (!password || !confirmPassword) {
            return null;
        }

        return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    }

    onSubmit(): void {
        if (this.registrationForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            // Format the form data according to the API requirements
            const { firstName, lastName, email, phone, password } = this.registrationForm.value;
            const registrationData: RegisterRequest = {
                email,
                phone,
                full_name: `${firstName} ${lastName}`,
                password
            };

            // Call the AuthService register method
            this.authService.register(registrationData)
                .pipe(
                    finalize(() => {
                        this.loading = false;
                    })
                )
                .subscribe({
                    next: () => {
                        console.log('Registration successful');
                        // AuthService already handles the token, just navigate
                        this.router.navigate(['/home']);
                    },
                    error: (error) => {
                        console.error('Registration failed:', error);
                        this.errorMessage = error.message || 'Произошла ошибка при регистрации';
                    }
                });
        } else {
            Object.keys(this.registrationForm.controls).forEach(key => {
                const control = this.registrationForm.get(key);
                if (control?.invalid) {
                    control.markAsTouched();
                }
            });
        }
    }

    getErrorMessage(controlName: string): string {
        const control = this.registrationForm.get(controlName);
        if (!control?.errors || !control.touched) {
            return '';
        }

        const errors = control.errors;
        if (errors['required']) {
            return 'Это поле обязательно';
        }
        if (errors['email']) {
            return 'Некорректный email';
        }
        if (errors['minlength']) {
            return `Минимальная длина ${errors['minlength'].requiredLength} символов`;
        }
        if (errors['pattern']) {
            switch (controlName) {
                case 'phone':
                    return 'Введите корректный номер телефона в формате +7XXXXXXXXXX';
                default:
                    return 'Некорректный формат';
            }
        }
        if (errors['passwordStrength']) {
            const strength = errors['passwordStrength'];
            const missing = [];
            
            if (!strength.hasUpperCase) missing.push('заглавные буквы');
            if (!strength.hasLowerCase) missing.push('строчные буквы');
            if (!strength.hasNumeric) missing.push('цифры');
            if (!strength.hasSpecialChar) missing.push('специальные символы');
            
            return `Пароль должен содержать: ${missing.join(', ')}`;
        }
        if (errors['passwordMismatch']) {
            return 'Пароли не совпадают';
        }

        return 'Ошибка в поле';
    }
}
