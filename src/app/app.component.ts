import { Component } from '@angular/core';
import { TuiRoot, TuiIcon, TuiFallbackSrcPipe } from "@taiga-ui/core";
import { RouterOutlet, RouterLink } from '@angular/router';
import { NgIf, AsyncPipe } from '@angular/common';
import { TuiTabBar } from '@taiga-ui/addon-mobile';
import { AuthService } from './services/auth.service';
import { TuiAvatar } from '@taiga-ui/kit';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, inject } from '@angular/core';
import { TuiAmountPipe } from '@taiga-ui/addon-commerce';
import { TuiElasticSticky } from '@taiga-ui/addon-mobile';
import { tuiClamp } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDialogService,
  TuiDropdownService,
  TuiNumberFormat,
} from '@taiga-ui/core';
import type { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import { TuiLink, TuiTitle } from '@taiga-ui/core';
import { Router } from '@angular/router';

class User {
  constructor(
    public username: string,
    public email: string,
    public phone: string
  ) { }
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    TuiRoot,
    NgIf,
    AsyncPipe,
    TuiTabBar,
    TuiAvatar,
    TuiIcon,
    TuiFallbackSrcPipe,
    AsyncPipe,
    NgIf,
    TuiAvatar,
    TuiElasticSticky
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less',
  standalone: true
})
export class AppComponent {

  user: User = new User(
    'Толян',
    'svo_zmail.ru',
    '+7-999-111-78-78'
  );

  constructor(
    private authService: AuthService,
    private router: Router // Добавляем Router в конструктор
  ) { }

  get isAuthenticated$() {
    return this.authService.isAuthenticated$;
  }

  // Метод для проверки, нужно ли скрывать header
  shouldHideHeader(): boolean {
    const currentRoute = this.router.url;
    return ['/registration', '/auth'].some(path => currentRoute.includes(path));
  }

  private readonly dialogs = inject(TuiDialogService);

  protected onElastic(value: number, { style }: HTMLElement): void {
    const scale = tuiClamp(value, 0.7, 1);
    style.setProperty('transform', `scale(${scale})`);
    style.setProperty('width', `calc((100% + 3.5rem) / ${scale})`);
  }

  protected showDialog(content: PolymorpheusContent): void {
    this.dialogs.open(content).subscribe();
  }
}