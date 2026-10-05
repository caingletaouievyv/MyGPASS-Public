import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { philippineMobileNumberValidator } from '../mobile-number.validator';
import { passwordComplexityValidators } from '../password.validator';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly showTermsModal = signal(false);

  readonly registrationForm = new FormGroup(
    {
      firstName: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true
      }),
      lastName: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true
      }),
      mobileNumber: new FormControl('', {
        validators: [Validators.required, philippineMobileNumberValidator],
        nonNullable: true
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
        nonNullable: true
      }),
      password: new FormControl('', {
        validators: [Validators.required, ...passwordComplexityValidators()],
        nonNullable: true
      }),
      confirmPassword: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true
      }),
      termsAccepted: new FormControl(false, {
        validators: [Validators.requiredTrue],
        nonNullable: true
      })
    },
    { validators: passwordMatchValidator }
  );

  get firstNameControl() {
    return this.registrationForm.controls.firstName;
  }

  get lastNameControl() {
    return this.registrationForm.controls.lastName;
  }

  get mobileNumberControl() {
    return this.registrationForm.controls.mobileNumber;
  }

  get emailControl() {
    return this.registrationForm.controls.email;
  }

  get passwordControl() {
    return this.registrationForm.controls.password;
  }

  get confirmPasswordControl() {
    return this.registrationForm.controls.confirmPassword;
  }

  get termsAcceptedControl() {
    return this.registrationForm.controls.termsAccepted;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  openTermsModal(): void {
    this.showTermsModal.set(true);
  }

  closeTermsModal(): void {
    this.showTermsModal.set(false);
  }

  acceptTerms(): void {
    this.termsAcceptedControl.setValue(true);
    this.termsAcceptedControl.markAsTouched();
    this.closeTermsModal();
  }

  onSubmit(): void {
    this.registrationForm.markAllAsTouched();

    if (this.registrationForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { firstName, lastName, mobileNumber, email, password } = this.registrationForm.getRawValue();
    this.authService.register({ firstName, lastName, mobileNumber, email, password }).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { registered: 'true' } }),
      error: (error: HttpErrorResponse) => this.errorMessage.set(
        error.error?.detail ?? error.error?.title ?? 'Unable to create your account. Please try again.'
      )
    });
  }
}
