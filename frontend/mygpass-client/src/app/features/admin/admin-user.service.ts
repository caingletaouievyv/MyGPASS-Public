import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url';

export type AdminUser = {
  userId: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  role: 'User' | 'Admin';
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiBaseUrl}/api/Users`);
  }

  updateUser(userId: number, request: Pick<AdminUser, 'firstName' | 'lastName' | 'mobileNumber' | 'email'>): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiBaseUrl}/api/Users/${userId}`, request);
  }

  updateStatus(userId: number, isActive: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiBaseUrl}/api/Users/${userId}/status`, { isActive });
  }

  updateRole(userId: number, role: 'User' | 'Admin'): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiBaseUrl}/api/Users/${userId}/role`, { role });
  }
}
