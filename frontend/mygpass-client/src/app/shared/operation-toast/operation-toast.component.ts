import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

export type OperationToastNotice = {
  message: string;
  type: 'success' | 'error';
};

@Component({
  selector: 'app-operation-toast',
  standalone: true,
  template: `
    @if (notice; as currentNotice) {
      <div
        class="toast"
        [class.error]="currentNotice.type === 'error'"
        [attr.role]="currentNotice.type === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="currentNotice.type === 'error' ? 'assertive' : 'polite'"
        aria-atomic="true">
        <span class="notice-icon" aria-hidden="true">{{ currentNotice.type === 'error' ? '!' : '✓' }}</span>
        <span class="message">{{ currentNotice.message }}</span>
        <button type="button" class="dismiss-button" aria-label="Dismiss notification" (click)="dismiss()">×</button>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset-inline-end: 16px;
      inset-block-end: 16px;
      z-index: 1100;
      width: min(420px, calc(100vw - 32px));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #d1d5db;
      border-inline-start: 4px solid #15803d;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.2);
      color: #1f2937;
      font-size: 0.9rem;
      line-height: 1.4;
      pointer-events: auto;
    }

    .toast.error {
      border-inline-start-color: #dc2626;
    }

    .notice-icon {
      display: inline-flex;
      flex: 0 0 22px;
      width: 22px;
      height: 22px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #dcfce7;
      color: #166534;
      font-size: 0.82rem;
      font-weight: 800;
    }

    .toast.error .notice-icon { background: #fee2e2; color: #991b1b; }
    .message { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }

    .dismiss-button {
      flex: 0 0 auto;
      min-height: 32px;
      min-width: 32px;
      border: 0;
      border-radius: 4px;
      padding: 2px;
      background: transparent;
      color: #6b7280;
      font: inherit;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }

    .dismiss-button:hover { background: #f3f4f6; color: #111827; }

    .dismiss-button:focus-visible {
      outline: 2px solid #15803d;
      outline-offset: 2px;
    }

    @media (max-width: 480px) {
      :host { inset-inline-end: 12px; inset-block-end: 12px; width: calc(100vw - 24px); }
      .toast { gap: 9px; padding: 11px 12px; }
    }
  `]
})
export class OperationToastComponent implements OnChanges, OnDestroy {
  @Input() notice: OperationToastNotice | null = null;
  @Output() readonly dismissed = new EventEmitter<void>();

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['notice']) return;

    this.clearDismissTimer();
    if (this.notice) this.dismissTimer = setTimeout(() => this.dismiss(), 3500);
  }

  ngOnDestroy(): void {
    this.clearDismissTimer();
  }

  dismiss(): void {
    this.clearDismissTimer();
    this.dismissed.emit();
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.dismissTimer = null;
  }
}