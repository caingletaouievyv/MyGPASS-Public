import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get emailControl() {
    return this.forgotPasswordForm.get('email')!;
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const email = this.forgotPasswordForm.get('email')?.value;
      await firstValueFrom(this.authService.forgotPassword(email));

      this.successMessage.set('If an account exists for that email address, a password reset link has been sent.');
      this.forgotPasswordForm.reset();

      // Redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch {
      // Still show generic message to prevent enumeration
      this.successMessage.set('If an account exists for that email address, a password reset link has been sent.');
      this.forgotPasswordForm.reset();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } finally {
      this.isSubmitting.set(false);
    }
  }

}
