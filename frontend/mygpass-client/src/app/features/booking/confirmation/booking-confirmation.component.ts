import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { finalize } from 'rxjs';

import { API_BASE_URL } from '../../../config/api-base-url';
import { AuthService } from '../../auth/auth.service';
import { GuestBookingSessionService } from '../guest-booking-session.service';

interface QRCodeResponse {
  qrCodeId: number;
  bookingId: number;
  passengerNumber: number;
  qrCodeValue: string;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
}

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="confirmation-page" aria-live="polite">
      <section class="confirmation-shell" aria-labelledby="confirmation-title">
        <p class="eyebrow">Booking</p>
        <h1 id="confirmation-title">Booking confirmed</h1>
        <p class="intro">Your demo payment is complete.</p>

        @if (isLoading()) {
          <p class="status-message">Loading your pass...</p>
        } @else if (currentQRCode(); as qrCode) {
            <div class="pass-panel">
              <div class="pass-heading">
                <span class="pass-check" aria-hidden="true">✓</span>
                <div>
                  <span class="eyebrow">Boarding pass</span>
                  <h2>Passenger {{ qrCode.passengerNumber }}</h2>
                </div>
              </div>
              <p class="pass-note">Present this QR code at the terminal.</p>
              @if (qrCodes().length > 1) {
                <div class="qr-navigation" aria-label="Passenger pass pagination">
                  <button type="button" (click)="showPreviousPassenger()" [disabled]="currentPassengerIndex() === 0">
                    ← Previous
                  </button>
                  <div class="qr-stage">
                    @if (qrCodeImages()[qrCode.qrCodeId]) {
                      <img class="qr-code" [src]="qrCodeImages()[qrCode.qrCodeId]" alt="Booking QR code" />
                    }
                  </div>
                  <button type="button" (click)="showNextPassenger()" [disabled]="currentPassengerIndex() === qrCodes().length - 1">
                    Next →
                  </button>
                </div>
                <div class="pass-pagination-status">Passenger {{ currentPassengerIndex() + 1 }} of {{ qrCodes().length }}</div>
              } @else if (qrCodeImages()[qrCode.qrCodeId]) {
                <img class="qr-code" [src]="qrCodeImages()[qrCode.qrCodeId]" alt="Booking QR code" />
              }
              <div class="pass-details">
                <div><span>Route</span><strong>{{ origin || 'Unavailable' }} <span aria-hidden="true">→</span> {{ destination || 'Unavailable' }}</strong></div>
                <div><span>Departure</span><strong><span class="departure-desktop">{{ formatDeparture(departureAt) }}</span><span class="departure-mobile mobile-date-time"><span>{{ formatMobileDate(departureAt) }}</span><span>{{ formatMobileTime(departureAt) }}</span></span></strong></div>
                <div><span>Passengers</span><strong>{{ passengerCount }}</strong></div>
                <div><span>Terminal</span><strong>{{ origin || 'Unavailable' }} / {{ destination || 'Unavailable' }}</strong></div>
                <div><span>Terminal fee</span><strong>{{ terminalFee | currency:'PHP':'symbol-narrow':'1.2-2' }}</strong></div>
                @if (qrCode.expiresAt) {
                  <div class="pass-expiration">
                    <span>Expires</span>
                    <strong><span class="expiration-desktop">{{ formatExpiration(qrCode.expiresAt) }}</span><span class="expiration-mobile mobile-date-time"><span>{{ formatMobileDate(qrCode.expiresAt) }}</span><span>{{ formatMobileTime(qrCode.expiresAt) }}</span></span></strong>
                  </div>
                }
              </div>
            </div>
        } @else {
          <div class="status-message unavailable" role="status">
            <strong>Pass not available yet</strong>
            <p>This demo flow does not have a confirmed booking ID to retrieve a pass for.</p>
          </div>
        }

        @if (qrCodes().length === 1) {
          <button type="button" class="download-button" (click)="downloadCurrentPass()">DOWNLOAD QR</button>
        } @else if (qrCodes().length > 1) {
          <button type="button" class="download-button" (click)="downloadAllQRCodes()">DOWNLOAD ALL QRS</button>
        }

        @if (isAuthenticated()) {
          <button type="button" class="history-button" (click)="viewHistory()">VIEW MY BOOKINGS</button>
        }
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .confirmation-page {
      min-height: 100%;
      padding: 40px 20px 56px;
      background: #f5f7f4;
    }

    .confirmation-shell {
      width: min(100%, 620px);
      margin: 0 auto;
      padding: 34px;
      border: 1px solid #dfe7df;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 18px 40px rgba(24, 55, 35, 0.08);
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #15803d;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1,
    h2 {
      margin: 0;
      color: #17231b;
    }

    h1 {
      font-size: clamp(1.8rem, 4vw, 2.45rem);
    }

    h2 {
      font-size: 1.3rem;
    }

    .intro {
      margin: 10px 0 24px;
      color: #5d6b61;
      line-height: 1.5;
    }

    .pass-panel,
    .status-message {
      border: 1px solid #e2e9e3;
      border-radius: 12px;
    }

    .pass-panel {
      margin-top: 18px;
      padding: 22px;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .pass-heading {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pass-check {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border-radius: 50%;
      background: #16a34a;
      color: #ffffff;
      font-weight: 900;
    }

    .pass-heading .eyebrow {
      margin-bottom: 4px;
    }

    .pass-note {
      margin: 18px 0 14px;
      color: #3f5946;
    }

    .qr-code {
      display: block;
      width: min(100%, 280px);
      height: auto;
      margin: 18px auto 20px;
      background: #ffffff;
    }

    .qr-navigation {
      display: grid;
      grid-template-columns: minmax(84px, 1fr) minmax(0, 280px) minmax(84px, 1fr);
      align-items: center;
      gap: 10px;
    }

    .qr-stage {
      min-width: 0;
    }

    .pass-details {
      display: grid;
      gap: 8px;
      padding: 14px;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: #ffffff;
    }

    .download-button {
      display: block;
      width: 100%;
      margin: 16px auto 0;
      padding: 11px 14px;
      border: 1px solid #15803d;
      border-radius: 8px;
      background: #ffffff;
      color: #166534;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .pass-details div {
      display: grid;
      grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
      align-items: baseline;
      gap: 16px;
    }

    .pass-details > div > span:first-child {
      color: #6b796f;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .pass-details strong {
      color: #14532d;
      min-width: 0;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .departure-mobile {
      display: none;
    }

    .expiration-mobile {
      display: none;
    }

    .pass-expiration {
      display: grid !important;
      grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr) !important;
      gap: 16px !important;
      margin-top: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #b91c1c;
      font-size: 0.88rem;
    }

    .pass-expiration strong {
      color: #b91c1c;
      text-align: right;
    }

    .qr-navigation button {
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: #ffffff;
      color: #166534;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .qr-navigation button:hover:not(:disabled),
    .qr-navigation button:focus-visible:not(:disabled) {
      background: #dcfce7;
      outline: 3px solid rgba(34, 197, 94, 0.2);
      outline-offset: 1px;
    }

    .qr-navigation button:disabled {
      color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.65;
    }

    .pass-pagination-status {
      margin-top: 2px;
      color: #3f5946;
      font-size: 0.86rem;
      font-weight: 700;
      text-align: center;
    }

    .pass-pagination-status + .pass-details {
      margin-top: 10px;
    }

    .download-button:hover,
    .download-button:focus-visible {
      background: #dcfce7;
      outline: 3px solid rgba(34, 197, 94, 0.2);
      outline-offset: 1px;
    }

    .status-message {
      margin-top: 18px;
      padding: 18px;
      color: #526158;
      background: #f8faf8;
    }

    .status-message p {
      margin: 8px 0 0;
      line-height: 1.5;
    }

    .history-button {
      width: 100%;
      margin-top: 24px;
      border: 0;
      border-radius: 10px;
      padding: 14px 18px;
      background: #15803d;
      color: #ffffff;
      cursor: pointer;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .history-button:hover,
    .history-button:focus-visible {
      background: #166534;
      outline: 3px solid rgba(21, 128, 61, 0.18);
      outline-offset: 2px;
    }

    @media (max-width: 520px) {
      .confirmation-page {
        padding: 20px 12px 36px;
      }

      .confirmation-shell {
        padding: 26px 20px;
      }

      .qr-navigation {
        grid-template-columns: 72px minmax(0, 1fr) 72px;
        gap: 6px;
      }

      .qr-navigation button {
        padding: 8px 4px;
        font-size: 0.72rem;
      }

      .pass-details div {
        grid-template-columns: minmax(104px, 0.4fr) minmax(0, 1fr);
        gap: 10px;
      }

      .pass-details div > span:first-child {
        min-width: 0;
      }

      .pass-details strong {
        min-width: 0;
        text-align: right;
      }

      .departure-desktop {
        display: none;
      }

      .departure-mobile {
        display: inline;
      }

      .expiration-desktop {
        display: none;
      }

      .expiration-mobile {
        display: inline-flex;
      }

      .mobile-date-time {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        color: inherit;
        font-size: inherit;
        font-weight: inherit;
        letter-spacing: normal;
        text-transform: none;
      }

      .mobile-date-time span {
        color: inherit;
        font-size: inherit;
        font-weight: inherit;
        letter-spacing: normal;
        text-transform: none;
      }

    }
  `
})
export class BookingConfirmationComponent {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly guestBookingSession = inject(GuestBookingSessionService);
  private readonly state = (this.router.getCurrentNavigation()?.extras.state ?? window.history.state) as {
    amount?: number;
    passengerCount?: number;
    origin?: string;
    destination?: string;
    bookingId?: number;
    bookingReference?: string;
    departureAt?: string;
    terminalFee?: number;
  };

  readonly amount = this.state.amount ?? 0;
  readonly passengerCount = this.state.passengerCount ?? 1;
  readonly origin = this.state.origin ?? '';
  readonly destination = this.state.destination ?? '';
  readonly bookingReference = this.state.bookingReference ?? '';
  readonly departureAt = this.state.departureAt ?? '';
  readonly terminalFee = this.state.terminalFee ?? 0;
  readonly isLoading = signal(false);
  readonly qrCodes = signal<QRCodeResponse[]>([]);
  readonly qrCodeImages = signal<Record<number, string>>({});
  readonly currentPassengerIndex = signal(0);
  readonly isAuthenticated = this.authService.isAuthenticated;

  constructor() {
    if (this.state.bookingId) {
      this.loadQRCode(this.state.bookingId);
    }
  }

  private loadQRCode(bookingId: number): void {
    this.isLoading.set(true);
    const guestAccessToken = this.authService.isAuthenticated() ? null : this.guestBookingSession.getAccessToken();
    const endpoint = guestAccessToken
      ? `${this.apiBaseUrl}/api/QRCodes/guest/booking/${bookingId}`
      : `${this.apiBaseUrl}/api/QRCodes/booking/${bookingId}`;
    const options = guestAccessToken
      ? { headers: { 'X-Guest-Access-Token': guestAccessToken } }
      : {};
    this.http.get<QRCodeResponse[]>(endpoint, options).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (qrCodes) => {
        this.qrCodes.set(qrCodes ?? []);
        this.currentPassengerIndex.set(0);
        qrCodes?.forEach((qrCode) => void this.renderQRCode(qrCode));
      },
      error: (_error: HttpErrorResponse) => this.qrCodes.set([])
    });
  }

  private async renderQRCode(qrCode: QRCodeResponse): Promise<void> {
    try {
      const imageUrl = await this.createQRCodeImage(qrCode);
      this.qrCodeImages.update((images) => ({ ...images, [qrCode.qrCodeId]: imageUrl }));
    } catch {
      console.error('Unable to render the booking QR code.');
    }
  }

  private createQRCodeImage(qrCode: QRCodeResponse): Promise<string> {
    return QRCode.toDataURL(qrCode.qrCodeValue, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
  }

  async downloadAllQRCodes(): Promise<void> {
    for (const qrCode of this.qrCodes()) {
      let imageUrl = this.qrCodeImages()[qrCode.qrCodeId];

      if (!imageUrl) {
        try {
          imageUrl = await this.createQRCodeImage(qrCode);
          this.qrCodeImages.update((images) => ({ ...images, [qrCode.qrCodeId]: imageUrl }));
        } catch {
          console.error('Unable to download the booking QR code.');
          continue;
        }
      }

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `booking-passenger-${qrCode.passengerNumber}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  currentQRCode(): QRCodeResponse | undefined {
    return this.qrCodes()[this.currentPassengerIndex()];
  }

  showPreviousPassenger(): void {
    this.currentPassengerIndex.update((index) => Math.max(0, index - 1));
  }

  showNextPassenger(): void {
    this.currentPassengerIndex.update((index) => Math.min(this.qrCodes().length - 1, index + 1));
  }

  downloadCurrentPass(): void {
    const qrCode = this.currentQRCode();
    const imageUrl = qrCode ? this.qrCodeImages()[qrCode.qrCodeId] : undefined;
    if (!qrCode || !imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `mygpass-${qrCode.bookingId}-pass-${qrCode.passengerNumber}.png`;
    link.click();
  }

  formatExpiration(value: string): string {
    const expiration = new Date(value);
    return Number.isNaN(expiration.getTime())
      ? value
      : expiration.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
  }

  formatDeparture(value: string): string {
    if (!value) return 'Unavailable';
    const departure = new Date(value);
    return Number.isNaN(departure.getTime())
      ? value
      : departure.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
  }

  formatMobileDate(value: string): string {
    if (!value) return 'Unavailable';
    const departure = new Date(value);
    if (Number.isNaN(departure.getTime())) return value;

    return departure.toLocaleDateString('en-US', {
      weekday: 'short',
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  }

  formatMobileTime(value: string): string {
    if (!value) return '';
    const departure = new Date(value);
    if (Number.isNaN(departure.getTime())) return '';

    return departure.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  viewHistory(): void {
    this.router.navigate(['/history']);
  }
}
