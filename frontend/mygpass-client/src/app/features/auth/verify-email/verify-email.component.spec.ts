import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth.service';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let component: VerifyEmailComponent;
  let authService: { verifyEmail: ReturnType<typeof vi.fn> };

  const setupComponent = (queryParams: Record<string, string> = { token: 'valid-token' }) => {
    authService = { verifyEmail: vi.fn() };

    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authService
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(queryParams))
          }
        }
      ]
    });

    if (queryParams['token']) {
      authService.verifyEmail.mockReturnValue(of({ message: 'Email verified successfully.' }));
    }

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('reads the token from query parameters and calls the verification API', () => {
    setupComponent({ token: 'abc123' });

    expect(authService.verifyEmail).toHaveBeenCalledWith('abc123');
    expect(component.verificationState()).toBe('success');
  });

  it('shows a success state when verification succeeds', () => {
    setupComponent({ token: 'good-token' });

    expect(component.verificationState()).toBe('success');
    expect(component.message()).toContain('Email verified successfully');
  });

  it('shows a failed state when verification fails', () => {
    authService = { verifyEmail: vi.fn() };
    authService.verifyEmail.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Verification failed.' } }))
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ token: 'bad-token' })) } }
      ]
    });

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.verificationState()).toBe('error');
    expect(component.message()).toContain('Verification failed.');
  });

  it('shows a missing token state when no token is present', () => {
    setupComponent({});

    expect(component.verificationState()).toBe('missing');
    expect(component.message()).toContain('missing a valid token');
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('reads the token from the URL without logging the user in automatically', () => {
    setupComponent({ token: 'route-token' });

    expect(authService.verifyEmail).toHaveBeenCalledWith('route-token');
    expect(component.verificationState()).toBe('success');
  });
});
