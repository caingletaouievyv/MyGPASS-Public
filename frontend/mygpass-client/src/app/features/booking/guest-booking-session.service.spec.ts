import { describe, expect, it } from 'vitest';

import { GuestBookingSessionService } from './guest-booking-session.service';

describe('GuestBookingSessionService', () => {
  it('keeps the token in memory without persisting it in sessionStorage', () => {
    const service = new GuestBookingSessionService();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    service.start('guest-token');

    expect(service.getAccessToken()).toBe('guest-token');
    expect(service.hasActiveSession()).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('keeps guest mode active without an access token', () => {
    const service = new GuestBookingSessionService();

    service.startGuestMode();

    expect(service.hasActiveSession()).toBe(true);
    expect(service.getAccessToken()).toBeNull();
  });

  it('clears the in-memory guest session and token', () => {
    const service = new GuestBookingSessionService();
    service.start('guest-token');

    service.clear();

    expect(service.hasActiveSession()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
  });
});