import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BackToTopComponent } from './shared/back-to-top/back-to-top.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BackToTopComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private splashTimer: number | null = null;
  private loadHandler: (() => void) | null = null;
  readonly isAppReady = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const markReady = () => {
      if (!this.isAppReady()) {
        this.isAppReady.set(true);
      }
    };

    const startSplashTimer = () => {
      this.splashTimer = window.setTimeout(markReady, 4000);
    };

    if (document.readyState === 'complete') {
      startSplashTimer();
    } else {
      this.loadHandler = startSplashTimer;
      window.addEventListener('load', this.loadHandler, { once: true });
    }
  }

  ngOnDestroy(): void {
    if (this.loadHandler) {
      window.removeEventListener('load', this.loadHandler);
      this.loadHandler = null;
    }

    if (this.splashTimer !== null) {
      window.clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
  }
}
