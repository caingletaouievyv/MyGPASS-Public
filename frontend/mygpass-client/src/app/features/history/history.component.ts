import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { finalize } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url';
import { BackToTopComponent } from '../../shared/back-to-top/back-to-top.component';
import { CollectionControlsComponent } from '../../shared/collection-controls/collection-controls.component';
import { BookingHistoryItem } from '../booking/booking.models';

type BookingSortOption = 'createdAt' | 'departureAt';
type SortDirection = 'asc' | 'desc';
type BookingFilter = 'all' | 'pending' | 'confirmed';

interface QRCodeResponse {
  qrCodeId: number;
  passengerNumber: number;
  qrCodeValue: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, BackToTopComponent, CollectionControlsComponent],
  template: `
    <main class="page-shell">
      <section class="content-card" aria-live="polite">
        <header class="page-header">
          <div class="header-badge">History</div>
          <div>
            <p class="eyebrow">Trips</p>
            <h1>My bookings</h1>
          </div>
        </header>

        @if (isLoading()) {
          <div class="status-box loading" role="status">
            <div class="spinner" aria-hidden="true"></div>
            <p>Loading your booking history...</p>
          </div>
        } @else if (error()) {
          <div class="status-box error" role="alert">
            <p>Unable to load your booking history right now.</p>
            <button type="button" class="retry-button" (click)="loadHistory()">Try again</button>
          </div>
        } @else if (bookings().length === 0) {
          <div class="status-box empty" aria-live="polite">
            <p>You have no bookings yet.</p>
          </div>
        } @else {
          <app-collection-controls
            searchLabel="Search bookings"
            searchPlaceholder="Reference, route, date, status, or payment"
            [searchValue]="searchTerm()"
            [filters]="bookingFilters()"
            [sortOptions]="bookingSortOptions"
            [sortValue]="sortOption()"
            [sortDirection]="sortDirection()"
            [visibleCount]="visibleBookings().length"
            [totalCount]="bookings().length"
            resultLabel="records"
            [hasActiveFilters]="hasActiveFilters()"
            [summaryOnNewRow]="true"
            (searchChange)="searchTerm.set($event)"
            (filterChange)="onFilterChange($event.value)"
            (sortChange)="onSortChange($event)"
            (directionChange)="onDirectionChange($event)"
            (clear)="clearFilters()" />
          @if (visibleBookings().length === 0) {
            <div class="empty-state" role="status">
              <h2>No records match your filters.</h2>
              <p>Try a different booking reference, route, date, status, or payment status.</p>
              <button type="button" class="secondary-button" (click)="clearFilters()">Clear filters</button>
            </div>
          } @else {
            <div class="history-list">
              @for (booking of visibleBookings(); track booking.bookingId) {
                <article class="booking-card">
                <div class="booking-summary">
                  <div class="booking-field route-group">
                    <span class="field-label">Route</span>
                    <div class="route-line">
                      <span>{{ booking.originPortName || 'Origin' }}</span>
                      <span class="route-arrow" aria-hidden="true">→</span>
                      <span>{{ booking.destinationPortName || 'Destination' }}</span>
                    </div>
                  </div>

                  <div class="booking-field departure-group">
                    <span class="field-label">Departure</span>
                    <strong class="departure-desktop">{{ formatDeparture(booking) }}</strong>
                    <strong class="departure-mobile">{{ formatDepartureMobile(booking) }}</strong>
                  </div>

                  <div class="booking-field status-group">
                    <span class="field-label">Booking status</span>
                    <span class="status-value" [class.pending]="isPending(booking.status)">{{ booking.status || 'Unknown' }}</span>
                  </div>

                  <div class="booking-actions">
                    @if (hasActivePass(booking)) {
                      <button type="button" class="view-pass-button" (click)="viewPass(booking)">VIEW PASS</button>
                      <button type="button" class="download-qr-button" (click)="downloadQRCodes(booking)">
                        DOWNLOAD QR{{ booking.passengerCount > 1 ? 's' : '' }}
                      </button>
                    } @else if (canContinuePayment(booking)) {
                      <button type="button" class="continue-payment-button" (click)="continuePayment(booking)">CONTINUE PAYMENT</button>
                    }
                  </div>
                </div>
                </article>
              }
            </div>
          }
        }
      </section>
      <app-back-to-top />
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .page-shell {
      width: min(1120px, calc(100% - 48px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }

    .content-card {
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
    }

    .page-header {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }

    .page-header > div:last-child { min-width: 0; }

    .header-badge {
      display: inline-flex;
      width: 96px;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: rgba(34, 197, 94, 0.12);
      color: #166534;
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .eyebrow {
      margin: 0 0 8px;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #15803d;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      color: #111827;
      font-size: clamp(1.8rem, 2.6vw, 2.5rem);
      line-height: 1.15;
    }

    .status-box {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 18px 20px;
      background: #f8fafc;
      color: #374151;
    }

    .status-box.error {
      background: #fff7f7;
      border-color: #fecaca;
      flex-direction: column;
      align-items: flex-start;
    }

    .status-box.empty {
      justify-content: center;
    }

    .empty-state {
      padding: 20px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      color: #374151;
    }

    .empty-state h2 {
      margin: 0 0 6px;
      color: #111827;
      font-size: 1.08rem;
    }

    .empty-state p {
      margin: 0 0 14px;
      line-height: 1.45;
    }

    .secondary-button {
      min-height: 38px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px 12px;
      background: #ffffff;
      color: #374151;
      cursor: pointer;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .secondary-button:hover,
    .secondary-button:focus-visible {
      border-color: #15803d;
      color: #166534;
      background: #f0fdf4;
      outline: none;
    }

    .status-box p {
      margin: 0;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(21, 128, 61, 0.2);
      border-top-color: #15803d;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .retry-button {
      margin-top: 10px;
      border: 0;
      border-radius: 10px;
      background: #15803d;
      color: white;
      padding: 10px 16px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .retry-button:hover,
    .retry-button:focus-visible {
      background: #166534;
      outline: none;
    }

    .history-list {
      display: grid;
      gap: 18px;
    }

    .booking-card {
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      background: #ffffff;
      border-left: 4px solid #15803d;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }

    .booking-summary {
      position: relative;
      display: grid;
      gap: 10px;
      padding: 18px 20px;
      padding-right: 220px;
      background: linear-gradient(135deg, rgba(22, 163, 74, 0.05), rgba(255, 255, 255, 0.7));
    }

    .booking-field {
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 14px;
      grid-column: 1;
    }

    .route-group {
      grid-row: 1;
    }

    .departure-group {
      grid-row: 2;
    }

    .status-group {
      grid-row: 3;
    }

    .field-label {
      flex: 0 0 124px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      font-weight: 700;
    }

    .booking-field > .route-line,
    .booking-field > strong {
      flex: 1 1 auto;
    }

    .departure-group strong {
      min-width: 0;
      color: #111827;
      font-size: 0.95rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .departure-mobile {
      display: none;
    }

    .route-line {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      min-width: 0;
      font-size: clamp(1.1rem, 2vw, 1.55rem);
      font-weight: 800;
      color: #111827;
    }

    .route-line span {
      overflow-wrap: anywhere;
    }

    .route-arrow {
      color: #15803d;
      font-weight: 700;
    }

    .booking-actions {
      position: absolute;
      top: 18px;
      right: 20px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 10px;
    }

    .view-pass-button,
    .download-qr-button,
    .continue-payment-button {
      white-space: nowrap;
    }

    .view-pass-button,
    .continue-payment-button,
    .download-qr-button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      background: #15803d;
      color: #ffffff;
      cursor: pointer;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .continue-payment-button {
      background: #b45309;
    }

    .view-pass-button:hover,
    .view-pass-button:focus-visible,
    .continue-payment-button:hover,
    .continue-payment-button:focus-visible,
    .download-qr-button:hover,
    .download-qr-button:focus-visible {
      background: #166534;
      outline: 3px solid rgba(21, 128, 61, 0.18);
      outline-offset: 2px;
    }

    .continue-payment-button:hover,
    .continue-payment-button:focus-visible {
      background: #92400e;
      outline-color: rgba(180, 83, 9, 0.2);
    }

    .status-value {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 8px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      font-size: 0.76rem;
      text-transform: capitalize;
      border: 1px solid rgba(22, 163, 74, 0.15);
    }

    .status-value.pending {
      background: #fef3c7;
      color: #92400e;
      border-color: rgba(245, 158, 11, 0.2);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 760px) {
      .booking-summary {
        gap: 14px;
        padding: 16px;
        padding-right: 16px;
      }

      .route-line {
        font-size: 1.05rem;
      }

      .departure-desktop {
        display: none;
      }

      .departure-mobile {
        display: block;
      }

      .booking-field {
        align-items: flex-start;
      }

      .booking-actions {
        position: static;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-left: 0;
      }
    }

    @media (max-width: 640px) {
      .content-card {
        padding: 20px 16px;
      }

      .page-header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .booking-actions {
        padding-top: 2px;
      }

      .booking-card,
      .booking-summary,
      .booking-field,
      .route-line {
        min-width: 0;
        max-width: 100%;
      }

      .booking-field {
        gap: 10px;
      }

      .field-label {
        flex-basis: 104px;
      }

      .view-pass-button,
      .continue-payment-button,
      .download-qr-button {
        width: 100%;
        min-height: 44px;
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
      }
    }
  `
})
export class HistoryComponent {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly bookings = signal<BookingHistoryItem[]>([]);
  readonly searchTerm = signal('');
  readonly filter = signal<BookingFilter>('all');
  readonly sortOption = signal<BookingSortOption>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly bookingFilters = computed(() => [{
    key: 'status',
    label: 'Status',
    value: this.filter(),
    options: [
      { value: 'all', label: 'All statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' }
    ]
  }]);
  readonly bookingSortOptions = [
    { value: 'createdAt', label: 'Created date' },
    { value: 'departureAt', label: 'Departure date' }
  ];
  readonly visibleBookings = computed(() => [...this.bookings()]
    .filter((booking) => this.matchesSearch(booking))
    .filter((booking) => this.filter() === 'all' || booking.status?.toLowerCase() === this.filter())
    .sort((first, second) => this.compareBookings(first, second)));
  readonly hasActiveFilters = computed(() => Boolean(
    this.searchTerm().trim() ||
    this.filter() !== 'all' ||
    this.sortOption() !== 'createdAt' ||
    this.sortDirection() !== 'desc'
  ));

  constructor() {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<BookingHistoryItem[]>(`${this.apiBaseUrl}/api/Bookings/mine`).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (bookings) => this.bookings.set(bookings ?? []),
      error: (err: HttpErrorResponse) => {
        this.bookings.set([]);
        this.error.set(err.error?.detail ?? err.error?.title ?? 'Unable to load booking history.');
      }
    });
  }

  formatDeparture(booking: BookingHistoryItem): string {
    if (booking.departureAt) {
      const parsed = new Date(booking.departureAt);
      if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })} · ${parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
    }

    const date = booking.departureDay || 'Unavailable';
    const time = booking.departureTime ? this.formatLegacyTime(booking.departureTime) : '';
    return time ? `${date} · ${time}` : date;
  }

  formatDepartureMobile(booking: BookingHistoryItem): string {
    if (booking.departureAt) {
      const parsed = new Date(booking.departureAt);
      if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.toLocaleDateString('en-US', {
          weekday: 'short',
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        })} · ${parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
    }

    return booking.departureDay || 'Unavailable';
  }

  private formatLegacyTime(value: string): string {
    const parsed = new Date(`1970-01-01T${value}`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  isPending(status: string | undefined | null): boolean {
    return status?.toLowerCase() === 'pending';
  }

  onFilterChange(value: string): void {
    this.filter.set(value as BookingFilter);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filter.set('all');
    this.sortOption.set('createdAt');
    this.sortDirection.set('desc');
  }

  onSortChange(value: string): void { this.sortOption.set(value as BookingSortOption); }

  onDirectionChange(value: string): void { this.sortDirection.set(value as SortDirection); }

  hasActivePass(booking: BookingHistoryItem): boolean {
    return booking.status?.toLowerCase() === 'confirmed' && booking.paymentStatus?.toLowerCase() === 'paid';
  }

  canContinuePayment(booking: BookingHistoryItem): boolean {
    const paymentStatus = booking.paymentStatus?.toLowerCase();
    return this.isPending(booking.status) &&
      booking.paymentId != null &&
      (paymentStatus === 'init' || paymentStatus === 'pending' || paymentStatus === 'unpaid');
  }

  private compareBookings(first: BookingHistoryItem, second: BookingHistoryItem): number {
    const firstValue = this.sortOption() === 'createdAt' ? first.createdAt : first.departureAt ?? first.departureDay;
    const secondValue = this.sortOption() === 'createdAt' ? second.createdAt : second.departureAt ?? second.departureDay;
    return this.compareDates(firstValue, secondValue, this.sortDirection() === 'desc');
  }

  viewPass(booking: BookingHistoryItem): void {
    this.router.navigate(['/booking/pass'], {
      state: {
        bookingId: booking.bookingId,
        bookingReference: booking.bookingReference,
        passengerCount: booking.passengerCount,
        origin: booking.originPortName,
        destination: booking.destinationPortName,
        departureAt: booking.departureAt,
        amount: booking.totalAmount,
        terminalFee: 30
      }
    });
  }

  downloadQRCodes(booking: BookingHistoryItem): void {
    this.http.get<QRCodeResponse[]>(`${this.apiBaseUrl}/api/QRCodes/booking/${booking.bookingId}`).subscribe({
      next: (qrCodes) => void this.downloadQRCodeImages(qrCodes ?? []),
      error: (_error: HttpErrorResponse) => console.error('Unable to download the booking QR code.')
    });
  }

  private async downloadQRCodeImages(qrCodes: QRCodeResponse[]): Promise<void> {
    for (const qrCode of qrCodes) {
      try {
        const imageUrl = await this.createQRCodeImage(qrCode);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `booking-passenger-${qrCode.passengerNumber}-qr.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch {
        console.error('Unable to download the booking QR code.');
      }
    }
  }

  private async createQRCodeImage(qrCode: QRCodeResponse): Promise<string> {
    return QRCode.toDataURL(qrCode.qrCodeValue, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
  }

  continuePayment(booking: BookingHistoryItem): void {
    if (booking.paymentId == null) return;

    this.router.navigate(['/booking/payment'], {
      state: {
        bookingId: booking.bookingId,
        bookingReference: booking.bookingReference,
        paymentId: booking.paymentId,
        amount: booking.totalAmount,
        passengerCount: booking.passengerCount,
        origin: booking.originPortName,
        destination: booking.destinationPortName
      }
    });
  }

  private compareDates(
    firstValue: string | null | undefined,
    secondValue: string | null | undefined,
    descending: boolean
  ): number {
    const firstTime = this.parseDate(firstValue);
    const secondTime = this.parseDate(secondValue);

    if (firstTime == null && secondTime == null) return 0;
    if (firstTime == null) return 1;
    if (secondTime == null) return -1;

    return descending ? secondTime - firstTime : firstTime - secondTime;
  }

  private matchesSearch(booking: BookingHistoryItem): boolean {
    const searchTerm = this.normalizeSearchText(this.searchTerm());
    if (!searchTerm) return true;

    const searchableValues = [
      booking.bookingReference,
      booking.originPortName,
      booking.destinationPortName,
      booking.status,
      booking.paymentStatus,
      this.formatDeparture(booking),
      this.formatDepartureMobile(booking),
      booking.departureAt,
      booking.departureDay,
      booking.departureTime,
      booking.createdAt
    ];

    return searchableValues.some((value) => value && this.normalizeSearchText(value).includes(searchTerm));
  }

  private normalizeSearchText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private parseDate(value: string | null | undefined): number | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
}
