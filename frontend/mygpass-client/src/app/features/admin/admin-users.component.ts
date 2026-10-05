import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { BackToTopComponent } from '../../shared/back-to-top/back-to-top.component';
import { CollectionControlsComponent } from '../../shared/collection-controls/collection-controls.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { OperationToastComponent, OperationToastNotice } from '../../shared/operation-toast/operation-toast.component';
import { AdminUser, AdminUserService } from './admin-user.service';

type EditableField = 'firstName' | 'lastName' | 'mobileNumber' | 'email';
type UserDraft = Pick<AdminUser, EditableField>;
type UserSortField = 'userId' | 'name' | 'email' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, BackToTopComponent, CollectionControlsComponent, ConfirmationDialogComponent, OperationToastComponent],
  template: `
    <main class="page-shell">
      <section class="content-card" aria-live="polite">
        <header class="page-header">
          <div class="header-badge">Admin</div>
          <div>
            <p class="eyebrow">User management</p>
            <h1>Manage users</h1>
          </div>
        </header>

        @if (isLoading()) {
          <div class="status-box loading" role="status"><span class="spinner" aria-hidden="true"></span><p>Loading users...</p></div>
        } @else if (error()) {
          <div class="status-box error" role="alert"><p>{{ error() }}</p><button type="button" class="secondary-button" (click)="loadUsers()">Try again</button></div>
        } @else {
          <app-collection-controls
            searchLabel="Search users"
            searchPlaceholder="Name, email, or mobile number"
            [searchValue]="searchTerm()"
            [filters]="userFilters()"
            [sortOptions]="userSortOptions"
            [sortValue]="sortField()"
            [sortDirection]="sortDirection()"
            [visibleCount]="filteredUsers().length"
            [totalCount]="users().length"
            resultLabel="users"
            [hasActiveFilters]="hasActiveFilters()"
            actionLabel="Refresh"
            [actionDisabled]="isLoading()"
            (searchChange)="searchTerm.set($event)"
            (filterChange)="onFilterChange($event.key, $event.value)"
            (sortChange)="onSortChange($event)"
            (directionChange)="onDirectionChange($event)"
            (clear)="clearFilters()"
            (action)="loadUsers()" />

          @if (updateError()) {
            <div class="update-error" role="alert"><span>{{ updateError() }}</span><button type="button" class="dismiss-button" aria-label="Dismiss update error" (click)="updateError.set(null)">Dismiss</button></div>
          }

          @if (users().length === 0) {
            <div class="empty-state" role="status"><h2>No users yet</h2><p>There are no user accounts to manage.</p></div>
          } @else if (filteredUsers().length === 0) {
            <div class="empty-state" role="status"><h2>No records match your filters.</h2><p>Try a different name, contact detail, role, or status.</p><button type="button" class="secondary-button" (click)="clearFilters()">Clear filters</button></div>
          } @else {
            <div class="user-list">
              @for (user of filteredUsers(); track user.userId) {
                <article class="user-card">
                  <div class="user-card-header">
                    <div><h2>{{ fullName(user) }}</h2><p class="user-id">User #{{ user.userId }}</p></div>
                    <div class="badges" aria-label="User status and role">
                      <span class="status-badge" [class.inactive]="!user.isActive">{{ user.isActive ? 'Active' : 'Inactive' }}</span>
                      <span class="role-badge">{{ user.role }}</span>
                    </div>
                  </div>

                  @if (editingUserId() === user.userId && editDraft(); as draft) {
                    <div class="edit-panel">
                      <div class="form-grid">
                        <label><span>First name</span><input type="text" [value]="draft.firstName" (input)="updateDraft('firstName', $event)" /></label>
                        <label><span>Last name</span><input type="text" [value]="draft.lastName" (input)="updateDraft('lastName', $event)" /></label>
                        <label><span>Mobile number</span><input type="tel" [value]="draft.mobileNumber" (input)="updateDraft('mobileNumber', $event)" /></label>
                        <label><span>Email</span><input type="email" [value]="draft.email ?? ''" (input)="updateDraft('email', $event)" /></label>
                      </div>
                      <div class="edit-actions">
                        <button type="button" class="primary-button" [disabled]="isBusy(user.userId)" (click)="saveUser(user.userId)">{{ isBusy(user.userId) ? 'Saving...' : 'Save changes' }}</button>
                        <button type="button" class="secondary-button" [disabled]="isBusy(user.userId)" (click)="cancelEdit()">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <div class="user-details">
                      <div class="detail-item"><span class="detail-label">Mobile</span><span>{{ user.mobileNumber || 'Unavailable' }}</span></div>
                      <div class="detail-item"><span class="detail-label">Email</span><span>{{ user.email || 'Unavailable' }}</span></div>
                      <div class="detail-item"><span class="detail-label">Email verification</span><span>{{ user.isEmailVerified ? 'Verified' : 'Not verified' }}</span></div>
                    </div>
                  }

                  <div class="user-actions">
                    <button type="button" class="secondary-button" [disabled]="isCurrentUser(user) || isBusy(user.userId)" (click)="startEdit(user)">Edit</button>
                    <button type="button" class="secondary-button" [class.warning-button]="user.isActive" [disabled]="(isCurrentUser(user) && user.isActive) || isBusy(user.userId)" (click)="requestStatusChange(user)">{{ user.isActive ? 'Deactivate' : 'Activate' }}</button>
                    <label class="role-control"><span>Role</span><select [value]="user.role" [disabled]="isCurrentUser(user) || isBusy(user.userId)" [attr.aria-label]="'Role for ' + fullName(user)" (change)="updateRole(user, $event)"><option value="User">User</option><option value="Admin">Admin</option></select></label>
                  </div>
                </article>
              }
            </div>
          }
        }
      </section>
      @if (pendingStatusUser(); as user) {
        <app-confirmation-dialog
          title="Deactivate user"
          [message]="'Are you sure you want to deactivate ' + fullName(user) + '?'"
          confirmLabel="Deactivate"
          (cancel)="cancelStatusChange()"
          (confirm)="confirmStatusChange()" />
      }
          <app-operation-toast [notice]="operationNotice()" (dismissed)="operationNotice.set(null)" />
      <app-back-to-top />
    </main>
  `,
  styles: [`
    :host { display: block; }

    .page-shell {
      width: min(1120px, calc(100% - 48px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }

    .content-card {
      width: 100%;
      box-sizing: border-box;
      padding: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
    }

    .page-header {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }

    .page-header > div:last-child { min-width: 0; }

    .header-badge {
      display: inline-flex;
      width: 96px;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.12);
      color: #166534;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #15803d;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h1, h2, p { margin-top: 0; }

    h1 {
      margin: 0;
      color: #111827;
      font-size: clamp(1.8rem, 2.6vw, 2.5rem);
      line-height: 1.15;
    }

    h2 {
      margin-bottom: 4px;
      color: #111827;
      font-size: 1.08rem;
    }

    .user-list { display: grid; gap: 10px; }

    .user-card {
      padding: 15px 18px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .user-card-header, .user-actions, .edit-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .user-id, .detail-label {
      margin-bottom: 0;
      color: #6b7280;
      font-size: 0.8rem;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .status-badge, .role-badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .status-badge { background: #dcfce7; color: #166534; }
    .status-badge.inactive { background: #f3f4f6; color: #4b5563; }
    .role-badge { background: #ecfdf5; color: #047857; }

    .user-details {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin: 12px 0;
      padding: 12px 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-item {
      display: grid;
      min-width: 0;
      gap: 6px;
      color: #111827;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .edit-panel {
      margin: 14px 0;
      padding: 14px;
      border: 1px solid rgba(22, 163, 74, 0.16);
      border-radius: 10px;
      background: #f8fffa;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .form-grid label, .role-control {
      display: grid;
      gap: 6px;
      color: #374151;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .edit-actions { justify-content: flex-start; margin-top: 16px; }
    .user-actions { justify-content: flex-start; flex-wrap: wrap; }
    .role-control { min-width: 180px; margin-left: auto; grid-template-columns: auto minmax(110px, 1fr); align-items: center; }

    .primary-button, .secondary-button, .dismiss-button {
      min-height: 38px;
      border-radius: 8px;
      padding: 8px 12px;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }

    .primary-button { border: 1px solid #15803d; background: #15803d; color: #ffffff; }
    .secondary-button { border: 1px solid #d1d5db; background: #ffffff; color: #374151; }
    .secondary-button:hover:not(:disabled) { border-color: #15803d; color: #166534; background: #f0fdf4; }
    .warning-button { border-color: #f59e0b; color: #92400e; }
    .dismiss-button { min-height: 0; border: 0; padding: 0; background: transparent; color: #991b1b; }
    button:disabled, select:disabled { cursor: not-allowed; opacity: 0.55; }

    .status-box, .empty-state, .update-error { padding: 20px; border-radius: 12px; }
    .status-box p, .empty-state p { margin-bottom: 0; }
    .status-box.loading { display: flex; align-items: center; gap: 10px; color: #374151; }
    .status-box.error, .update-error { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid #fecaca; background: #fff7f7; color: #991b1b; }
    .empty-state { border: 1px dashed #cbd5e1; background: #f8fafc; color: #374151; }
    .empty-state h2 { margin-bottom: 6px; }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(21, 128, 61, 0.2); border-top-color: #15803d; border-radius: 50%; animation: spin 0.8s linear infinite; }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 760px) {
      .page-shell { width: min(100%, calc(100% - 28px)); padding: 20px 0 32px; }
      .content-card { padding: 20px 16px; }
      .page-header, .user-card-header { display: flex; align-items: flex-start; flex-direction: column; }
      .badges { justify-content: flex-start; }
      .user-details, .form-grid { grid-template-columns: 1fr; }
      .role-control { width: 100%; min-width: 0; margin-left: 0; grid-template-columns: auto minmax(0, 1fr); }
      .status-box.error, .update-error { align-items: flex-start; flex-direction: column; }
    }

    @media (max-width: 480px) {
      .page-shell { width: calc(100% - 20px); padding: 16px 0 28px; }
      .content-card { padding: 16px 12px; border-radius: 14px; }
      .user-card { padding: 14px; }
      .user-actions { align-items: stretch; }
      .user-actions > button { flex: 1 1 130px; min-height: 44px; }
      .role-control { flex: 1 1 100%; min-height: 44px; }
      .edit-actions { align-items: stretch; flex-direction: column; }
      .edit-actions button { width: 100%; min-height: 44px; }
      .detail-item { overflow-wrap: anywhere; }
    }
  `]
})
export class AdminUsersComponent {
  private readonly adminUserService = inject(AdminUserService);
  private readonly authService = inject(AuthService);
  readonly users = signal<AdminUser[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updateError = signal<string | null>(null);
  readonly operationNotice = signal<OperationToastNotice | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly roleFilter = signal<'all' | 'User' | 'Admin'>('all');
  readonly sortField = signal<UserSortField>('userId');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly editingUserId = signal<number | null>(null);
  readonly editDraft = signal<UserDraft | null>(null);
  readonly pendingStatusUser = signal<AdminUser | null>(null);
  readonly busyUserId = signal<number | null>(null);

  readonly userFilters = computed(() => [
    {
      key: 'status', label: 'Status', value: this.statusFilter(),
      options: [{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]
    },
    {
      key: 'role', label: 'Role', value: this.roleFilter(),
      options: [{ value: 'all', label: 'All roles' }, { value: 'User', label: 'User' }, { value: 'Admin', label: 'Admin' }]
    }
  ]);
  readonly userSortOptions = [
    { value: 'userId', label: 'User ID' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'createdAt', label: 'Created date' },
    { value: 'status', label: 'Status' }
  ];
  readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return [...this.users()]
      .filter((user) => this.statusFilter() === 'all' || (user.isActive ? 'active' : 'inactive') === this.statusFilter())
      .filter((user) => this.roleFilter() === 'all' || user.role === this.roleFilter())
      .filter((user) => !query || [this.fullName(user), user.mobileNumber, user.email ?? ''].some((value) => value.toLowerCase().includes(query)))
      .sort((first, second) => this.compareUsers(first, second));
  });
  readonly hasActiveFilters = computed(() => Boolean(
    this.searchTerm().trim() || this.statusFilter() !== 'all' || this.roleFilter() !== 'all' || this.sortField() !== 'userId' || this.sortDirection() !== 'asc'
  ));

  constructor() { this.loadUsers(); }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.adminUserService.getUsers().pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (users) => this.users.set(users),
      error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'Unable to load users right now.'))
    });
  }

  setSearchTerm(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  onFilterChange(key: string, value: string): void {
    if (key === 'status') this.statusFilter.set(value as 'all' | 'active' | 'inactive');
    if (key === 'role') this.roleFilter.set(value as 'all' | 'User' | 'Admin');
  }
  onSortChange(value: string): void { this.sortField.set(value as UserSortField); }
  onDirectionChange(value: string): void { this.sortDirection.set(value as SortDirection); }
  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.roleFilter.set('all');
    this.sortField.set('userId');
    this.sortDirection.set('asc');
  }
  fullName(user: AdminUser): string { return `${user.firstName} ${user.lastName}`.trim() || 'Unnamed user'; }
  isCurrentUser(user: AdminUser): boolean { return user.userId === this.authService.currentUser()?.userId; }
  isBusy(userId: number): boolean { return this.busyUserId() === userId; }

  startEdit(user: AdminUser): void {
    if (this.isCurrentUser(user)) return;
    this.updateError.set(null);
    this.editingUserId.set(user.userId);
    this.editDraft.set({ firstName: user.firstName, lastName: user.lastName, mobileNumber: user.mobileNumber, email: user.email });
  }

  cancelEdit(): void { this.editingUserId.set(null); this.editDraft.set(null); }

  updateDraft(field: EditableField, event: Event): void {
    const draft = this.editDraft();
    if (!draft) return;
    this.editDraft.set({ ...draft, [field]: (event.target as HTMLInputElement).value } as UserDraft);
  }

  saveUser(userId: number): void {
    const draft = this.editDraft();
    if (!draft) return;
    this.updateError.set(null);
    this.operationNotice.set(null);
    this.busyUserId.set(userId);
    this.adminUserService.updateUser(userId, draft).pipe(finalize(() => this.busyUserId.set(null))).subscribe({
      next: (updatedUser) => {
        this.replaceUser(updatedUser);
        this.showOperationNotice(`User #${userId} updated successfully.`, 'success');
        this.cancelEdit();
      },
      error: (error: unknown) => {
        this.showOperationNotice('Failed to update user details.', 'error');
        this.updateError.set(this.getErrorMessage(error, 'Unable to save user changes.'));
      }
    });
  }

  requestStatusChange(user: AdminUser): void {
    if (this.isCurrentUser(user) && user.isActive) return;
    if (user.isActive) {
      this.pendingStatusUser.set(user);
      return;
    }
    this.updateStatus(user);
  }

  confirmStatusChange(): void {
    const user = this.pendingStatusUser();
    if (!user) return;
    this.pendingStatusUser.set(null);
    this.updateStatus(user);
  }

  cancelStatusChange(): void { this.pendingStatusUser.set(null); }

  private updateStatus(user: AdminUser): void {
    this.updateError.set(null);
    this.operationNotice.set(null);
    this.busyUserId.set(user.userId);
    this.adminUserService.updateStatus(user.userId, !user.isActive).pipe(finalize(() => this.busyUserId.set(null))).subscribe({
      next: (updatedUser) => {
        this.replaceUser(updatedUser);
        const action = user.isActive ? 'deactivated' : 'activated';
        this.showOperationNotice(`User #${user.userId} ${action} successfully.`, 'success');
      },
      error: (error: unknown) => {
        const action = user.isActive ? 'deactivate' : 'activate';
        this.showOperationNotice(`Failed to ${action} user.`, 'error');
        this.updateError.set(this.getErrorMessage(error, 'Unable to update user status.'));
      }
    });
  }

  updateRole(user: AdminUser, event: Event): void {
    if (this.isCurrentUser(user)) return;
    const role = (event.target as HTMLSelectElement).value as AdminUser['role'];
    this.updateError.set(null);
    this.operationNotice.set(null);
    this.busyUserId.set(user.userId);
    this.adminUserService.updateRole(user.userId, role).pipe(finalize(() => this.busyUserId.set(null))).subscribe({
      next: (updatedUser) => {
        this.replaceUser(updatedUser);
        this.showOperationNotice(`User #${user.userId} role updated successfully.`, 'success');
      },
      error: (error: unknown) => {
        this.showOperationNotice('Failed to update user role.', 'error');
        this.updateError.set(this.getErrorMessage(error, 'Unable to update user role.'));
      }
    });
  }

  private showOperationNotice(message: string, type: OperationToastNotice['type']): void {
    this.operationNotice.set({ message, type });
  }

  private replaceUser(updatedUser: AdminUser): void { this.users.update((users) => users.map((user) => user.userId === updatedUser.userId ? updatedUser : user)); }
  private compareUsers(first: AdminUser, second: AdminUser): number {
    let result: number;
    switch (this.sortField()) {
      case 'name': result = this.fullName(first).localeCompare(this.fullName(second)); break;
      case 'email': result = (first.email ?? '').localeCompare(second.email ?? ''); break;
      case 'createdAt': result = this.compareDates(first.createdAt, second.createdAt); break;
      case 'status': result = Number(second.isActive) - Number(first.isActive); break;
      case 'userId': result = first.userId - second.userId; break;
    }
    return this.sortDirection() === 'asc' ? result : -result;
  }
  private compareDates(first: string, second: string): number { return (Date.parse(first) || 0) - (Date.parse(second) || 0); }
  private getErrorMessage(error: unknown, fallback: string): string { const response = error as { error?: { title?: string; message?: string } }; return response.error?.title ?? response.error?.message ?? fallback; }
}
