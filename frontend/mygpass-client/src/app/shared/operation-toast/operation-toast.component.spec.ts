import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationToastComponent } from './operation-toast.component';

describe('OperationToastComponent', () => {
  let fixture: ComponentFixture<OperationToastComponent>;
  let component: OperationToastComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OperationToastComponent] }).compileComponents();
    fixture = TestBed.createComponent(OperationToastComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => vi.useRealTimers());

  it('renders a polite success notification with atomic announcement', () => {
    fixture.componentRef.setInput('notice', { type: 'success', message: 'Saved successfully.' });
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.getAttribute('aria-atomic')).toBe('true');
    expect(toast.textContent).toContain('Saved successfully.');
    expect(toast.querySelector('.notice-icon')?.textContent).toContain('✓');
  });

  it('renders an assertive error notification with atomic announcement', () => {
    fixture.componentRef.setInput('notice', { type: 'error', message: 'Unable to save.' });
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
    expect(toast.getAttribute('aria-atomic')).toBe('true');
    expect(toast.textContent).toContain('Unable to save.');
    expect(toast.querySelector('.notice-icon')?.textContent).toContain('!');
  });

  it('emits dismissal from the accessible button and clears its timer', () => {
    vi.useFakeTimers();
    const dismissed = vi.fn();
    component.dismissed.subscribe(() => {
      dismissed();
      fixture.componentRef.setInput('notice', null);
    });
    fixture.componentRef.setInput('notice', { type: 'success', message: 'Saved successfully.' });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.dismiss-button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Dismiss notification');
    button.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(3500);

    expect(dismissed).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });

  it('auto-dismisses success and error notifications after 3.5 seconds', () => {
    vi.useFakeTimers();
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);

    fixture.componentRef.setInput('notice', { type: 'success', message: 'Saved successfully.' });
    fixture.detectChanges();
    vi.advanceTimersByTime(3499);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('notice', { type: 'error', message: 'Unable to save.' });
    fixture.detectChanges();
    vi.advanceTimersByTime(3500);
    expect(dismissed).toHaveBeenCalledTimes(2);
  });

  it('replaces the previous notification and restarts its dismissal timer', () => {
    vi.useFakeTimers();
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);

    fixture.componentRef.setInput('notice', { type: 'success', message: 'First notice.' });
    fixture.detectChanges();
    vi.advanceTimersByTime(3000);
    fixture.componentRef.setInput('notice', { type: 'error', message: 'Replacement notice.' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast')?.textContent).toContain('Replacement notice.');
    vi.advanceTimersByTime(1000);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('clears the dismissal timer when destroyed', () => {
    vi.useFakeTimers();
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);
    fixture.componentRef.setInput('notice', { type: 'success', message: 'Saved successfully.' });
    fixture.detectChanges();

    fixture.destroy();
    vi.advanceTimersByTime(3500);

    expect(dismissed).not.toHaveBeenCalled();
  });
});