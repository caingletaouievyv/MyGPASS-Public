import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';
import { AdminSchedulesComponent } from './features/admin/admin-schedules.component';
import { AdminUsersComponent } from './features/admin/admin-users.component';
import { adminGuard } from './features/auth/auth.guard';

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

  it('keeps all existing user-facing routes', () => {
    const userFacingPaths = routes.flatMap((route) => {
      if (!route.path || route.path === '**' || route.path === 'admin') return [];
      const childPaths = route.children?.map((child) => child.path).filter((path) => Boolean(path)) ?? [];
      return childPaths.length ? childPaths.map((path) => `${route.path}/${path}`) : [route.path];
    });

    expect(userFacingPaths).toEqual([
      'login',
      'register',
      'forgot-password',
      'reset-password',
      'verify-email',
      'booking/route',
      'booking/details',
      'booking/payment',
      'booking/pass',
      'account',
      'history'
    ]);
  });

  it('registers admin routes and protects each page with adminGuard', () => {
    const adminRoute = routes.find((route) => route.path === 'admin');

    expect(adminRoute).toBeDefined();
    expect(adminRoute?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'users',
          component: AdminUsersComponent,
          canActivate: [adminGuard]
        }),
        expect.objectContaining({
          path: 'schedules',
          component: AdminSchedulesComponent,
          canActivate: [adminGuard]
        })
      ])
    );
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
    vi.useFakeTimers();

    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      expect(app.isAppReady()).toBeFalsy();
      const loadingLogo = fixture.nativeElement.querySelector('.loading-logo');
      expect(loadingLogo).not.toBeNull();
      expect(loadingLogo.getAttribute('alt')).toBe('GPASS');

      if (document.readyState !== 'complete') {
        window.dispatchEvent(new Event('load'));
      }

      vi.advanceTimersByTime(3999);
      expect(app.isAppReady()).toBeFalsy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(app.isAppReady()).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});