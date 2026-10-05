import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { API_BASE_URL } from '../../../config/api-base-url';
import { AuthService } from '../../auth/auth.service';
import { GuestBookingSessionService } from '../guest-booking-session.service';

@Component({
  selector: 'app-dummy-payment',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <main class="payment-page">
      <section class="payment-shell" aria-labelledby="payment-title">
        <div class="payment-brand" aria-label="GCash demo page">
          <span class="brand-mark">G</span>
          <span>GCash</span>
        </div>

        <div class="payment-content">
          <p class="eyebrow">Payment demo</p>
          <h1 id="payment-title">Confirm your payment</h1>
          <p class="description">This is a visual payment placeholder for the booking flow.</p>

          <div class="amount-panel">
            <span>Total amount</span>
            <strong>{{ amount | currency:'PHP':'symbol-narrow':'1.2-2' }}</strong>
          </div>

          <div class="booking-summary">
            <div>
              <span>Route</span>
              <strong>{{ origin || 'Selected route' }} <span aria-hidden="true">→</span> {{ destination || 'Selected trip' }}</strong>
            </div>
            <div>
              <span>Passengers</span>
              <strong>{{ passengerCount }}</strong>
            </div>
          </div>

          <button type="button" class="merchant-button" (click)="backToMerchant()">
            BACK TO MERCHANT
          </button>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .payment-page {
      min-height: 100%;
      padding: 40px 20px 56px;
      background: #f4f7fb;
    }

    .payment-shell {
      width: min(100%, 520px);
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid #d8e0eb;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
    }

    .payment-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 24px;
      color: #ffffff;
      background: #007df0;
      font-size: 1.3rem;
      font-weight: 800;
    }

    .brand-mark {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 50%;
      background: #ffffff;
      color: #007df0;
      font-weight: 900;
    }

    .payment-content {
      padding: 32px 28px 30px;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #007df0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #172033;
      font-size: clamp(1.7rem, 4vw, 2.2rem);
    }

    .description {
      margin: 12px 0 24px;
      color: #5b6678;
      line-height: 1.5;
    }

    .amount-panel,
    .booking-summary {
      border: 1px solid #e1e7ef;
      border-radius: 12px;
    }

    .amount-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      background: #f1f7ff;
      color: #526176;
    }

    .amount-panel strong {
      color: #172033;
      font-size: 1.45rem;
    }

    .booking-summary {
      display: grid;
      gap: 14px;
      margin: 16px 0 26px;
      padding: 16px 18px;
    }

    .booking-summary div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .booking-summary span:first-child {
      color: #6b7585;
    }

    .booking-summary strong {
      color: #172033;
      text-align: right;
    }

    .merchant-button {
      width: 100%;
      border: 0;
      border-radius: 10px;
      padding: 14px 18px;
      background: #007df0;
      color: #ffffff;
      cursor: pointer;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .merchant-button:hover,
    .merchant-button:focus-visible {
      background: #0069ca;
      outline: 3px solid rgba(0, 125, 240, 0.2);
      outline-offset: 2px;
    }

    @media (max-width: 520px) {
      .payment-page {
        padding: 20px 12px 36px;
      }

      .payment-content {
        padding: 26px 20px 24px;
      }

      .booking-summary div {
        align-items: flex-start;
        flex-direction: column;
        gap: 4px;
      }

      .booking-summary strong {
        text-align: left;
      }
    }
  `
})
export class DummyPaymentComponent {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly guestBookingSession = inject(GuestBookingSessionService);
  private readonly paymentState = (this.router.getCurrentNavigation()?.extras.state ?? window.history.state) as {
    bookingId?: number;
    bookingReference?: string;
    paymentId?: number;
    amount?: number;
    passengerCount?: number;
    origin?: string;
    destination?: string;
    departureAt?: string;
    terminalFee?: number;
  };

  readonly amount = this.paymentState.amount ?? 0;
  readonly bookingId = this.paymentState.bookingId;
  readonly bookingReference = this.paymentState.bookingReference ?? '';
  readonly paymentId = this.paymentState.paymentId;
  readonly passengerCount = this.paymentState.passengerCount ?? 1;
  readonly origin = this.paymentState.origin ?? '';
  readonly destination = this.paymentState.destination ?? '';
  readonly departureAt = this.paymentState.departureAt ?? '';
  readonly terminalFee = this.paymentState.terminalFee ?? 0;

  backToMerchant(): void {
    if (!this.paymentId) return;

    const guestAccessToken = this.authService.isAuthenticated() ? null : this.guestBookingSession.getAccessToken();
    const endpoint = guestAccessToken
      ? `${this.apiBaseUrl}/api/Payments/${this.paymentId}/guest-demo-confirm`
      : `${this.apiBaseUrl}/api/Payments/${this.paymentId}/demo-confirm`;
    const options = guestAccessToken
      ? { headers: { 'X-Guest-Access-Token': guestAccessToken } }
      : {};

    this.http.post(endpoint, null, options).subscribe({
      next: () => this.router.navigate(['/booking/pass'], {
        state: {
          bookingId: this.bookingId,
          bookingReference: this.bookingReference,
          amount: this.amount,
          passengerCount: this.passengerCount,
          origin: this.origin,
          destination: this.destination,
          departureAt: this.departureAt,
          terminalFee: this.terminalFee
        }
      })
    });
  }
}