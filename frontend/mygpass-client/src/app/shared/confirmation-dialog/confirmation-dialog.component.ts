import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  template: `
    <div class="confirmation-backdrop" (click)="cancel.emit()">
      <section class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" (click)="$event.stopPropagation()">
        <header class="confirmation-header">
          <h2 id="confirmation-title">{{ title }}</h2>
          <button type="button" class="dialog-close" aria-label="Close confirmation" (click)="cancel.emit()">×</button>
        </header>
        <p class="confirmation-message">{{ message }}</p>
        @if (details.length > 0) {
          <div class="confirmation-details">
            @for (detail of details; track detail) {
              <p>{{ detail }}</p>
            }
          </div>
        }
        <div class="confirmation-actions">
          <button type="button" class="secondary-button" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="warning-button" (click)="confirm.emit()">{{ confirmLabel }}</button>
        </div>
      </section>
    </div>
  `,
  styles: `
    :host { display: contents; }

    .confirmation-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.42);
    }

    .confirmation-dialog {
      width: min(100%, 420px);
      box-sizing: border-box;
      padding: 22px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
      color: #111827;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2);
    }

    .confirmation-header,
    .confirmation-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .confirmation-header { justify-content: space-between; }

    .confirmation-header h2 {
      margin: 0;
      color: #111827;
      font-size: 1.2rem;
    }

    .confirmation-message {
      margin: 18px 0 14px;
      color: #374151;
      line-height: 1.5;
    }

    .confirmation-details {
      display: grid;
      gap: 4px;
      margin-bottom: 22px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f8fafc;
      color: #374151;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .confirmation-details p { margin: 0; }

    .confirmation-actions { justify-content: flex-end; }

    .secondary-button,
    .warning-button,
    .dialog-close {
      min-height: 38px;
      border-radius: 8px;
      padding: 8px 12px;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }

    .secondary-button {
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #374151;
    }

    .secondary-button:hover,
    .secondary-button:focus-visible {
      border-color: #15803d;
      color: #166534;
      background: #f0fdf4;
    }

    .warning-button {
      border: 1px solid #f59e0b;
      background: #fffbeb;
      color: #92400e;
    }

    .warning-button:hover,
    .warning-button:focus-visible {
      background: #fef3c7;
    }

    .dialog-close {
      width: 32px;
      min-height: 32px;
      padding: 4px;
      border: 0;
      background: transparent;
      color: #4b5563;
      font-size: 1.25rem;
      line-height: 1;
    }

    .dialog-close:hover,
    .dialog-close:focus-visible {
      background: #f3f4f6;
      color: #111827;
    }

    button:focus-visible {
      outline: 3px solid rgba(21, 128, 61, 0.2);
      outline-offset: 2px;
    }

    @media (max-width: 480px) {
      .confirmation-backdrop { padding: 12px; }
      .confirmation-dialog { padding: 18px; }
      .confirmation-actions { align-items: stretch; flex-direction: column-reverse; }
      .confirmation-actions button { width: 100%; }
    }
  `
})
export class ConfirmationDialogComponent {
  @Input() title = 'Confirm action';
  @Input() message = '';
  @Input() details: string[] = [];
  @Input() confirmLabel = 'Confirm';

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
