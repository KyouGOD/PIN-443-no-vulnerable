import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.less'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class AccountComponent {
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  signOut() {
    this.authService.logout();
  }
}