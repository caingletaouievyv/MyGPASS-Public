import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authService: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = { forgotPassword: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not log forgot-password diagnostics', async () => {
    vi.useFakeTimers();
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    authService.forgotPassword.mockReturnValue(of({ message: 'generic' }));

    component.forgotPasswordForm.setValue({ email: 'user@example.com' });
    await component.onSubmit();

    expect(consoleLog).not.toHaveBeenCalled();
    expect(component.successMessage()).toBe('If an account exists for that email address, a password reset link has been sent.');
    expect(component.forgotPasswordForm.get('email')?.value).toBeNull();
  });
});