import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginComponent } from '../login/login.component';
import { RegistrationComponent } from './registration.component';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: LoginComponent }])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the registration heading and form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Create Account');
    expect(compiled.querySelector('form')).not.toBeNull();
    expect(compiled.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('should validate password confirmation match', () => {
    component.registrationForm.controls.mobileNumber.setValue('09171234567');
    component.registrationForm.controls.email.setValue('jane@example.com');
    component.registrationForm.controls.password.setValue('Password123');
    component.registrationForm.controls.confirmPassword.setValue('Password456');
    component.registrationForm.controls.termsAccepted.setValue(true);
    component.registrationForm.controls.confirmPassword.markAsTouched();

    expect(component.registrationForm.invalid).toBe(true);
    expect(component.registrationForm.hasError('passwordMismatch')).toBe(true);
  });

  it('should open and accept the terms modal', () => {
    component.showTermsModal.set(false);
    component.openTermsModal();

    expect(component.showTermsModal()).toBe(true);

    component.acceptTerms();

    expect(component.termsAcceptedControl.value).toBe(true);
    expect(component.showTermsModal()).toBe(false);
  });

  it('should accept a valid Philippine mobile number', () => {
    component.mobileNumberControl.setValue('09171234567');

    expect(component.mobileNumberControl.valid).toBe(true);
  });

  it.each([
    ['too short', '0917123456'],
    ['too long', '091712345678'],
    ['letters', '0917ABC1234'],
    ['invalid characters', '0917-123-4567'],
    ['repeated placeholder', '09000000000']
  ])('should reject %s mobile numbers', (_description, value) => {
    component.mobileNumberControl.setValue(value);

    expect(component.mobileNumberControl.hasError('invalidMobileNumber')).toBe(true);
  });
});