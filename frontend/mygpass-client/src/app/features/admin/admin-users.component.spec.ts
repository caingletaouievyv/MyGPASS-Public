import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AdminUser, AdminUserService } from './admin-user.service';
import { AdminUsersComponent } from './admin-users.component';

describe('AdminUsersComponent operation notifications', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let component: AdminUsersComponent;
  let user: AdminUser;
  let adminUserService: {
    getUsers: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
  };

  const makeUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
    userId: 42,
    firstName: 'Ava',
    lastName: 'Ng',
    mobileNumber: '09171234567',
    email: 'ava@example.com',
    isActive: true,
    isEmailVerified: true,
    role: 'User',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    user = makeUser();
    adminUserService = {
      getUsers: vi.fn(() => of([user])),
      updateUser: vi.fn((userId: number, request: Pick<AdminUser, 'firstName' | 'lastName' | 'mobileNumber' | 'email'>) =>
        of({ ...user, ...request, userId })),
      updateStatus: vi.fn((userId: number, isActive: boolean) => of({ ...user, userId, isActive })),
      updateRole: vi.fn((userId: number, role: AdminUser['role']) => of({ ...user, userId, role }))
    };

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        { provide: AdminUserService, useValue: adminUserService },
        { provide: AuthService, useValue: { currentUser: () => null } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('notifies after a profile update succeeds', () => {
    component.startEdit(user);
    component.saveUser(user.userId);

    expect(component.operationNotice()).toEqual({ message: 'User #42 updated successfully.', type: 'success' });
  });

  it('notifies when a profile update fails', () => {
    adminUserService.updateUser.mockReturnValue(throwError(() => new Error('Service unavailable.')));
    component.startEdit(user);
    component.saveUser(user.userId);

    expect(component.operationNotice()).toEqual({ message: 'Failed to update user details.', type: 'error' });
  });

  it('notifies after a role update succeeds', () => {
    component.updateRole(user, { target: { value: 'Admin' } } as unknown as Event);

    expect(component.operationNotice()).toEqual({ message: 'User #42 role updated successfully.', type: 'success' });
  });

  it('notifies when a role update fails', () => {
    adminUserService.updateRole.mockReturnValue(throwError(() => new Error('Service unavailable.')));
    component.updateRole(user, { target: { value: 'Admin' } } as unknown as Event);

    expect(component.operationNotice()).toEqual({ message: 'Failed to update user role.', type: 'error' });
  });

  it('notifies after a confirmed deactivation succeeds', () => {
    component.requestStatusChange(user);
    component.confirmStatusChange();

    expect(adminUserService.updateStatus).toHaveBeenCalledWith(42, false);
    expect(component.operationNotice()).toEqual({ message: 'User #42 deactivated successfully.', type: 'success' });
  });

  it('reports activation accurately for an inactive user', () => {
    const inactiveUser = makeUser({ isActive: false });
    component.requestStatusChange(inactiveUser);

    expect(adminUserService.updateStatus).toHaveBeenCalledWith(42, true);
    expect(component.operationNotice()).toEqual({ message: 'User #42 activated successfully.', type: 'success' });
  });

  it('notifies when deactivation fails', () => {
    adminUserService.updateStatus.mockReturnValue(throwError(() => new Error('Service unavailable.')));
    component.requestStatusChange(user);
    component.confirmStatusChange();

    expect(component.operationNotice()).toEqual({ message: 'Failed to deactivate user.', type: 'error' });
  });
});