import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadComponent: () => import('./auth/auth.component').then(c => c.AuthComponent),
    },
    {
        path: 'home',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'payments',
        loadComponent: () => import('./payments/payments.component').then(m => m.PaymentsComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'history',
        loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'chat',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'account',
        loadComponent: () => import('./account/account.component').then(m => m.AccountComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'registration',
        loadComponent: () => import('./registration/registration.component').then(m => m.RegistrationComponent),
    },
    {
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'auth'
    }
];
