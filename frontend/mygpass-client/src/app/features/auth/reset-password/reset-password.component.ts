import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { passwordComplexityValidators } from '../password.validator';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  passwordVisible = signal(false);
  confirmPasswordVisible = signal(false);
  resetToken = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.formBuilder.group(
      {
        newPassword: ['', [Validators.required, ...passwordComplexityValidators()]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'] || '';
      if (!this.resetToken) {
        this.errorMessage.set('Invalid or missing reset token.');
      }
    });
  }

  get newPasswordControl() {
    return this.resetPasswordForm.get('newPassword')!;
  }

  get confirmPasswordControl() {
    return this.resetPasswordForm.get('confirmPassword')!;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.set(!this.confirmPasswordVisible());
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid || !this.resetToken) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const newPassword = this.resetPasswordForm.get('newPassword')?.value;
      await firstValueFrom(this.authService.resetPassword(this.resetToken, newPassword));

      this.successMessage.set('Your password has been reset successfully. Redirecting to login...');
      this.resetPasswordForm.reset();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage.set(error?.error?.detail || 'Failed to reset password. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

}
