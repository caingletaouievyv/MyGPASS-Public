import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { GuestBookingSessionService } from '../guest-booking-session.service';

@Component({
  selector: 'app-booking-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './booking-header.component.html',
  styleUrl: './booking-header.component.scss'
})
export class BookingHeaderComponent {
  readonly authService = inject(AuthService);
  private readonly guestBookingSession = inject(GuestBookingSessionService);
  private readonly router = inject(Router);
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isGuestSession = this.guestBookingSession.hasActiveSession;

  logout(): void {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }
}
