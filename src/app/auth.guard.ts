import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router
  ) {}

  canActivate(): boolean {
    if (!this.authService.getToken()) {
      this.router.navigate(['/auth']);
      return false;
    }
    return true;
  }
}