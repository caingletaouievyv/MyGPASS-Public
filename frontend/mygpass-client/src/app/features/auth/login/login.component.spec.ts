import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginComponent } from '../login/login.component';
import { RegistrationComponent } from '../registration/registration.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'register', component: RegistrationComponent }])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the login heading and form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Login');
    expect(compiled.querySelector('form')).not.toBeNull();
    expect(compiled.querySelector('a[href="/register"]')).not.toBeNull();
  });

  it('should require mobile number and password', () => {
    component.mobileNumberControl.markAsTouched();
    component.passwordControl.markAsTouched();

    expect(component.mobileNumberControl.hasError('required')).toBe(true);
    expect(component.passwordControl.hasError('required')).toBe(true);
    expect(component.loginForm.invalid).toBe(true);
  });

  it('should render mobile number and reject non-numeric input', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const mobileInput = compiled.querySelector('#login-mobile-number') as HTMLInputElement;

    expect(compiled.textContent).toContain('Mobile Number');
    expect(compiled.textContent).not.toContain('Email Address');
    expect(mobileInput.type).toBe('tel');
    expect(mobileInput.inputMode).toBe('numeric');

    component.mobileNumberControl.setValue('0917ABC1234');
    expect(component.mobileNumberControl.hasError('invalidMobileNumber')).toBe(true);
  });

  it('should preserve the existing authentication-failure message for 401 responses', () => {
    submitLogin();

    httpTestingController.expectOne('/api/Auth/login').flush(
      {},
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component.errorMessage()).toBe('Unable to sign in. Please check your credentials.');
  });

  it('should show a rate-limit message for 429 responses', () => {
    submitLogin();

    httpTestingController.expectOne('/api/Auth/login').flush(
      { title: 'Too many requests.' },
      { status: 429, statusText: 'Too Many Requests' }
    );

    expect(component.errorMessage()).toBe('Too many sign-in attempts. Please try again later.');
  });

  function submitLogin(): void {
    component.mobileNumberControl.setValue('09171234567');
    component.passwordControl.setValue('Password1!');
    component.onSubmit();
  }
});