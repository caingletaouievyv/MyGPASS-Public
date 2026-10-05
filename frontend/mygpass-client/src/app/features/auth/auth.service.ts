import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url';
import { AuthResponse, AuthUser, LoginRequest, RegistrationRequest } from './auth.models';

const TOKEN_STORAGE_KEY = 'gti_pass_access_token';
const USER_STORAGE_KEY = 'gti_pass_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly token = signal<string | null>(this.readToken());
  readonly currentUser = signal<AuthUser | null>(this.readUser());
  readonly currentUserName = computed(() => {
    const user = this.currentUser();
    return [user?.firstName, user?.lastName].filter((name): name is string => !!name?.trim()).join(' ');
  });
  readonly isAuthenticated = computed(() => this.isTokenValid(this.token()));
  readonly isAdministrator = computed(() => this.currentUser()?.role === 'Admin');

  constructor() {
    if (this.token() && !this.isTokenValid(this.token())) {
      this.clearSession();
    }
  }

  register(request: RegistrationRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiBaseUrl}/api/Auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/api/Auth/login`, request).pipe(
      tap((response) => this.setSession(response))
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiBaseUrl}/api/Auth/forgot-password`, { email });
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiBaseUrl}/api/Auth/verify-email`, { token });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiBaseUrl}/api/Auth/reset-password`, {
      token,
      newPassword
    });
  }

  getAccessToken(): string | null {
    const accessToken = this.token();
    return this.isTokenValid(accessToken) ? accessToken : null;
  }

  logout(redirect = true): void {
    this.clearSession();
    if (redirect) void this.router.navigate(['/login']);
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private readToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private readUser(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;

    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }

  private isTokenValid(accessToken: string | null): boolean {
    if (!accessToken) return false;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1])) as { exp?: number };
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
