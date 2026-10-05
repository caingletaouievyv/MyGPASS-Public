import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should redirect the root route to login', async () => {
    vi.spyOn(window, 'setTimeout').mockImplementation((handler: TimerHandler) => {
      (handler as () => void)();
      return 0 as any;
    });

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(router.url).toBe('/login');
    expect(fixture.nativeElement.textContent).toContain('Login');
  });

  it('should render the registration route', async () => {
    vi.spyOn(window, 'setTimeout').mockImplementation((handler: TimerHandler) => {
      (handler as () => void)();
      return 0 as any;
    });

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/register');
    fixture.detectChanges();

    expect(router.url).toBe('/register');
    expect(fixture.nativeElement.textContent).toContain('Create Account');
  });

  it('should keep the initial splash visible during startup', () => {
    let loadCallback: (() => void) | undefined;
    let startupCallback: (() => void) | undefined;

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'load') {
        loadCallback = listener as () => void;
      }
    });

    const splashTimer = vi.spyOn(window, 'setTimeout').mockImplementation((handler: TimerHandler, delay?: number) => {
      if (delay === 4000) {
        startupCallback = handler as () => void;
      }
      return 0 as any;
    });

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app.isAppReady()).toBeFalsy();
    const loadingLogo = fixture.nativeElement.querySelector('.loading-logo');
    expect(loadingLogo).not.toBeNull();
    expect(loadingLogo.textContent).toBe('MyGPASS');

    if (document.readyState === 'complete') {
      expect(startupCallback).toBeDefined();
    } else {
      expect(loadCallback).toBeDefined();
      loadCallback?.();
      expect(startupCallback).toBeDefined();
    }

    expect(splashTimer).toHaveBeenCalledWith(expect.any(Function), 4000);
    startupCallback?.();
    fixture.detectChanges();

    expect(app.isAppReady()).toBeTruthy();
  });
});