import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackToTopComponent } from './back-to-top.component';

describe('BackToTopComponent', () => {
  let fixture: ComponentFixture<BackToTopComponent>;
  let component: BackToTopComponent;
  let scrollY = 0;

  beforeEach(async () => {
    scrollY = 0;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY
    });

    await TestBed.configureTestingModule({
      imports: [BackToTopComponent]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('is hidden near the top and visible after the scroll threshold', () => {
    fixture = TestBed.createComponent(BackToTopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isVisible()).toBe(false);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    scrollY = 321;
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isVisible()).toBe(true);
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('scrolls smoothly to the top when clicked', () => {
    scrollY = 500;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(BackToTopComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('can be activated by keyboard and has an accessible label', () => {
    scrollY = 500;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(BackToTopComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Back to top');
    expect(button.textContent).toContain('Back to top');
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    button.click();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('removes its scroll listener when destroyed', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    fixture = TestBed.createComponent(BackToTopComponent);
    fixture.detectChanges();

    fixture.destroy();

    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
  });
});
