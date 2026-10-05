import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

const SHOW_THRESHOLD = 320;

@Component({
  selector: 'app-back-to-top',
  standalone: true,
  template: `
    @if (isVisible()) {
      <button
        type="button"
        class="back-to-top"
        aria-label="Back to top"
        (click)="scrollToTop()">
        <span class="back-to-top-icon" aria-hidden="true">&uarr;</span>
        <span class="back-to-top-label">Back to top</span>
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .back-to-top {
      position: fixed;
      right: 24px;
      bottom: calc(24px + env(safe-area-inset-bottom));
      z-index: 1000;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 118px;
      min-height: 44px;
      justify-content: center;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 10px 15px;
      background: #ffffff;
      color: #334155;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
      transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .back-to-top:hover {
      background: #f0fdf4;
      border-color: #15803d;
      color: #166534;
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.22);
      transform: translateY(-2px);
    }

    .back-to-top:focus-visible {
      outline: 3px solid rgba(34, 197, 94, 0.5);
      outline-offset: 3px;
    }

    .back-to-top:active {
      transform: translateY(0);
    }

    .back-to-top-icon {
      font-size: 1.1rem;
      line-height: 0.8;
    }

    @media (max-width: 640px) {
      .back-to-top {
        right: 12px;
        bottom: calc(12px + env(safe-area-inset-bottom));
        min-width: 112px;
        min-height: 44px;
        padding: 10px 13px;
        font-size: 0.76rem;
      }
    }
  `
})
export class BackToTopComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  readonly isVisible = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.updateVisibility();
    fromEvent(window, 'scroll', { passive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateVisibility());
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private updateVisibility(): void {
    this.isVisible.set(window.scrollY > SHOW_THRESHOLD);
  }
}