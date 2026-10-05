import { computed, Injectable, signal } from '@angular/core';

type GuestBookingSession = {
  accessToken?: string;
};

@Injectable({ providedIn: 'root' })
export class GuestBookingSessionService {
  private readonly session = signal<GuestBookingSession | null>(null);
  readonly hasActiveSession = computed(() => this.session() !== null);

  start(accessToken: string): void {
    const session = { accessToken };
    this.session.set(session);
  }

  startGuestMode(): void {
    const session = {};
    this.session.set(session);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  clear(): void {
    this.session.set(null);
  }
}