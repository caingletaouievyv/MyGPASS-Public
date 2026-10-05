import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { BookingCatalogService } from '../booking-catalog.service';
import { GuestBookingSessionService } from '../guest-booking-session.service';
import { getAvailableDestinationPorts } from '../booking-destination.utils';
import { PortCatalogItem, ShippingLineCatalogItem, VesselVisitCatalogItem } from '../booking.models';

const TERMINAL_FEE = 30;
const GCASH_FEE = 1;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function scheduleMatchesDate(schedule: string | null, date: Date): boolean {
  const normalizedSchedule = schedule?.trim().toLowerCase() ?? '';
  return normalizedSchedule === 'daily' || normalizedSchedule === WEEKDAY_NAMES[date.getDay()].toLowerCase();
}

export function departureScheduleExplanation(schedules: Array<string | null>): string {
  if (schedules.length === 0) {
    return 'Select a shipping line to see available dates.';
  }

  const normalizedSchedules = schedules.map((schedule) => schedule?.trim().toLowerCase() ?? '');
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hasMissingSchedule = normalizedSchedules.some((schedule) => !schedule || (!weekdayOrder.includes(schedule) && schedule !== 'daily'));

  if (hasMissingSchedule) {
    return 'Schedule unavailable. Dates follow the configured vessel visits.';
  }

  if (normalizedSchedules.includes('daily')) {
    return 'Available every day.';
  }

  const days = weekdayOrder.filter((day) => normalizedSchedules.includes(day));
  const abbreviatedDays = days.map((day) => day.slice(0, 3).replace(/^./, (letter) => letter.toUpperCase()));
  const formattedDays = abbreviatedDays.length === 1
    ? abbreviatedDays[0]
    : `${abbreviatedDays.slice(0, -1).join(', ')} & ${abbreviatedDays.at(-1)}`;

  return `Available: ${formattedDays}.`;
}

export function isSelectableDepartureDate(
  value: string,
  schedules: Array<string | null>,
  today = new Date()
): boolean {
  const date = parseDateOnly(value);
  if (!date) return false;

  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < todayOnly) return false;
  return schedules.some((schedule) => scheduleMatchesDate(schedule, date));
}

export function visitsForRecurringDate(
  visits: VesselVisitCatalogItem[],
  value: string
): VesselVisitCatalogItem[] {
  const date = parseDateOnly(value);
  return date ? visits.filter((visit) => scheduleMatchesDate(visit.dayOfDeparture, date)) : [];
}

export function uniqueVisitsByDepartureTime(visits: VesselVisitCatalogItem[]): VesselVisitCatalogItem[] {
  const seenTimes = new Set<string>();

  return visits.filter((visit) => {
    if (seenTimes.has(visit.estimatedTimeOfDeparture)) return false;

    seenTimes.add(visit.estimatedTimeOfDeparture);
    return true;
  });
}

function differentPortsValidator(group: AbstractControl): ValidationErrors | null {
  const origin = group.get('originPortId')?.value;
  const destination = group.get('destinationPortId')?.value;
  return !origin || !destination || origin !== destination ? null : { samePort: true };
}

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-details.component.html',
  styleUrl: './booking-details.component.scss'
})
export class BookingDetailsComponent implements OnDestroy {
  private readonly catalog = inject(BookingCatalogService);
  private readonly guestBookingSession = inject(GuestBookingSessionService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly paymentMethod = 'GCash';
  readonly terminalFee = TERMINAL_FEE;
  readonly gcashFee = GCASH_FEE;
  readonly catalogStatus = signal<'loading' | 'ready' | 'error'>('loading');
  readonly bookingStatus = signal<'idle' | 'creating' | 'error'>('idle');
  readonly ports = signal<PortCatalogItem[]>([]);
  readonly shippingLines = signal<ShippingLineCatalogItem[]>([]);
  readonly vesselVisits = signal<VesselVisitCatalogItem[]>([]);
  readonly calendarMonth = signal(new Date());
  readonly calendarWeekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly showDepartureScheduleInfo = signal(false);
  private departureInfoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly bookingForm = new FormGroup(
    {
      originPortId: new FormControl('', { validators: [Validators.required], nonNullable: true }),
      destinationPortId: new FormControl('', { validators: [Validators.required], nonNullable: true }),
      shippingLineId: new FormControl({ value: '', disabled: true }, { validators: [Validators.required], nonNullable: true }),
      dateOfDeparture: new FormControl({ value: '', disabled: true }, { validators: [Validators.required], nonNullable: true }),
      vesselVisitId: new FormControl({ value: '', disabled: true }, { validators: [Validators.required], nonNullable: true }),
      passengerCount: new FormControl(1, {
        validators: [Validators.required, Validators.min(1), Validators.max(10)],
        nonNullable: true
      })
    },
    { validators: differentPortsValidator }
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.loadCatalog();
  }

  loadCatalog(): void {
    this.catalogStatus.set('loading');
    forkJoin({
      ports: this.catalog.getPorts(),
      shippingLines: this.catalog.getShippingLines(),
      vesselVisits: this.catalog.getVesselVisits()
    }).subscribe({
      next: ({ ports, shippingLines, vesselVisits }) => {
        this.ports.set(ports);
        this.shippingLines.set(shippingLines);
        this.vesselVisits.set(vesselVisits);
        this.applyRouteSelection();
        this.catalogStatus.set('ready');
      },
      error: () => {
        this.ports.set([]);
        this.shippingLines.set([]);
        this.vesselVisits.set([]);
        this.catalogStatus.set('error');
      }
    });
  }

  private applyRouteSelection(): void {
    const origin = this.route.snapshot.queryParamMap.get('origin');
    const destination = this.route.snapshot.queryParamMap.get('destination');
    const navigationState = window.history.state as { passengerCount?: number };
    if (!origin) return;

    const originPort = this.ports().find((port) => this.normalizePortName(port.name) === this.normalizePortName(origin));
    if (!originPort) return;

    this.bookingForm.patchValue({
      originPortId: String(originPort.portId),
      ...(typeof navigationState.passengerCount === 'number' && navigationState.passengerCount > 0
        ? { passengerCount: navigationState.passengerCount }
        : {})
    });
    const destinationPort = destination
      ? this.availableDestinations().find((port) => this.normalizePortName(port.name) === this.normalizePortName(destination))
      : undefined;
    this.destinationPortIdControl.setValue(destinationPort ? String(destinationPort.portId) : '');
    this.onRouteChange();
  }

  get originPortIdControl() { return this.bookingForm.controls.originPortId; }
  get destinationPortIdControl() { return this.bookingForm.controls.destinationPortId; }
  get shippingLineIdControl() { return this.bookingForm.controls.shippingLineId; }
  get dateOfDepartureControl() { return this.bookingForm.controls.dateOfDeparture; }
  get vesselVisitIdControl() { return this.bookingForm.controls.vesselVisitId; }
  get passengerCountControl() { return this.bookingForm.controls.passengerCount; }

  selectedDateOfDeparture(): string { return this.dateOfDepartureControl.value; }

  calendarMonthLabel(): string {
    return this.calendarMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  calendarDays(): Array<{ date: Date | null; inMonth: boolean; selectable: boolean; selected: boolean }> {
    const monthDate = new Date(this.calendarMonth().getFullYear(), this.calendarMonth().getMonth(), 1);
    const startDay = monthDate.getDay();
    const gridStart = new Date(monthDate);
    gridStart.setDate(monthDate.getDate() - startDay);

    const days: Array<{ date: Date | null; inMonth: boolean; selectable: boolean; selected: boolean }> = [];
    for (let index = 0; index < 42; index++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const iso = formatDateOnly(date);
      const selectable = this.isCalendarDateSelectable(date);
      const selected = !!this.dateOfDepartureControl.value && this.dateOfDepartureControl.value === iso;

      days.push({
        date,
        inMonth: date.getMonth() === monthDate.getMonth(),
        selectable,
        selected
      });
    }

    return days;
  }

  changeCalendarMonth(offset: number): void {
    const nextMonth = new Date(this.calendarMonth().getFullYear(), this.calendarMonth().getMonth() + offset, 1);
    this.calendarMonth.set(nextMonth);
  }

  selectCalendarDate(date: Date | null): void {
    if (!date) return;

    const iso = formatDateOnly(date);
    if (!this.isCalendarDateSelectable(date)) return;

    this.dateOfDepartureControl.setValue(iso);
    this.calendarMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    this.updateDateValidity();

    this.vesselVisitIdControl.reset('');
    this.vesselVisitIdControl.disable();

    if (this.dateOfDepartureControl.valid && this.visitsForSelectedDate().length > 0) {
      this.vesselVisitIdControl.enable();
    }
  }

  private isCalendarDateSelectable(date: Date): boolean {
    const iso = formatDateOnly(date);
    const schedules = this.matchingVisits().map((visit) => visit.dayOfDeparture);

    if (!this.matchingVisits().length) return false;
    if (date < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) return false;

    return isSelectableDepartureDate(iso, schedules);
  }

  originName(): string { return this.portName(this.originPortIdControl.value); }
  destinationName(): string { return this.portName(this.destinationPortIdControl.value); }
  availableDestinations(): PortCatalogItem[] {
    return getAvailableDestinationPorts(this.ports(), this.vesselVisits(), Number(this.originPortIdControl.value));
  }
  passengerCount(): number { return Number(this.passengerCountControl.value) || 1; }
  amount(): number { return this.terminalFee * this.passengerCount(); }
  total(): number { return this.amount() + this.gcashFee; }

  availableShippingLines(): ShippingLineCatalogItem[] {
    const originId = Number(this.originPortIdControl.value);
    const destinationId = Number(this.destinationPortIdControl.value);
    if (!originId || !destinationId) return [];

    const matching = this.vesselVisits().filter((visit) => visit.originPortId === originId && visit.destinationPortId === destinationId);
    const lineIds = new Set(matching.map((visit) => visit.shippingLineId));
    return this.shippingLines().filter((line) => lineIds.has(line.shippingLineId));
  }

  matchingVisits(): VesselVisitCatalogItem[] {
    const originId = Number(this.originPortIdControl.value);
    const destinationId = Number(this.destinationPortIdControl.value);
    const shippingLineId = Number(this.shippingLineIdControl.value);
    if (!originId || !destinationId || !shippingLineId) return [];

    return this.vesselVisits().filter(
      (visit) => visit.originPortId === originId && visit.destinationPortId === destinationId && visit.shippingLineId === shippingLineId
    );
  }

  departureScheduleExplanation(): string {
    return departureScheduleExplanation(this.matchingVisits().map((visit) => visit.dayOfDeparture));
  }

  toggleDepartureScheduleInfo(): void {
    if (this.showDepartureScheduleInfo()) {
      this.closeDepartureScheduleInfo();
      return;
    }

    this.showDepartureScheduleInfo.set(true);
    this.departureInfoTimer = setTimeout(() => this.closeDepartureScheduleInfo(), 5000);
  }

  closeDepartureScheduleInfo(): void {
    this.showDepartureScheduleInfo.set(false);
    if (this.departureInfoTimer) {
      clearTimeout(this.departureInfoTimer);
      this.departureInfoTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.closeDepartureScheduleInfo();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const infoRegion = this.elementRef.nativeElement.querySelector('.departure-info');
    if (this.showDepartureScheduleInfo() && (!infoRegion || !infoRegion.contains(event.target as Node))) {
      this.closeDepartureScheduleInfo();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDepartureScheduleInfo();
  }

  visitsForSelectedDate(): VesselVisitCatalogItem[] {
    return visitsForRecurringDate(this.matchingVisits(), this.dateOfDepartureControl.value);
  }

  uniqueVisitsForSelectedDate(): VesselVisitCatalogItem[] {
    return uniqueVisitsByDepartureTime(this.visitsForSelectedDate());
  }

  onVesselVisitChange(event: Event): void {
    const visitId = (event.target as HTMLSelectElement).value;

    this.vesselVisitIdControl.setValue(visitId);
  }
  formatEstimatedTime(visit: VesselVisitCatalogItem): string { return this.formatTime(visit.estimatedTimeOfDeparture); }

  onRouteChange(): void {
    this.closeDepartureScheduleInfo();
    this.shippingLineIdControl.reset('');
    this.dateOfDepartureControl.reset('');
    this.vesselVisitIdControl.reset('');
    this.shippingLineIdControl.disable();
    this.dateOfDepartureControl.disable();
    this.vesselVisitIdControl.disable();

    if (this.originPortIdControl.value && this.destinationPortIdControl.value && this.availableShippingLines().length > 0) {
      this.shippingLineIdControl.enable();
    }
  }

  onDestinationChange(): void {
    const destinationId = this.destinationPortIdControl.value;
    if (destinationId && !this.availableDestinations().some((port) => String(port.portId) === destinationId)) {
      this.destinationPortIdControl.reset('');
    }

    this.onRouteChange();
  }

  onShippingLineChange(): void {
    this.closeDepartureScheduleInfo();
    this.dateOfDepartureControl.reset('');
    this.vesselVisitIdControl.reset('');
    this.dateOfDepartureControl.disable();
    this.vesselVisitIdControl.disable();
    this.calendarMonth.set(new Date());

    if (this.matchingVisits().length > 0) this.dateOfDepartureControl.enable();
  }

  goToRoute(focus: 'origin'): void {
    this.router.navigate(['/booking/route'], {
      queryParams: { focus },
      state: {
        origin: this.originName(),
        destination: this.destinationName(),
        passengerCount: this.passengerCount(),
        focus
      }
    });
  }

  peso(value: number): string { return `Php ${value.toFixed(2)}`; }

  proceedToPayment(): void {
    this.updateDateValidity();
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid || this.bookingStatus() === 'creating') return;

    const formValue = this.bookingForm.getRawValue();
    const selectedVesselVisit = this.visitsForSelectedDate().find(
      (visit) => String(visit.vesselVisitId) === String(formValue.vesselVisitId)
    );
    if (!formValue.dateOfDeparture || !selectedVesselVisit) return;

    const departureTime = selectedVesselVisit.estimatedTimeOfDeparture.slice(0, 8);
    const departureAt = `${formValue.dateOfDeparture}T${departureTime.length === 5 ? `${departureTime}:00` : departureTime}`;
    this.bookingStatus.set('creating');
    this.catalog.createBooking({
      originPortId: Number(formValue.originPortId),
      destinationPortId: Number(formValue.destinationPortId),
      shippingLineId: Number(formValue.shippingLineId),
      vesselVisitId: Number(formValue.vesselVisitId),
      departureAt,
      passengerCount: this.passengerCount()
    }).pipe(
      finalize(() => {
        if (this.bookingStatus() === 'creating') this.bookingStatus.set('idle');
      })
    ).subscribe({
      next: (booking) => {
        if (booking.guestAccessToken) this.guestBookingSession.start(booking.guestAccessToken);
        this.router.navigate(['/booking/payment'], {
          state: {
            bookingId: booking.bookingId,
            bookingReference: booking.bookingReference,
            paymentId: booking.paymentId,
            amount: booking.totalAmount,
            passengerCount: booking.passengerCount ?? this.passengerCount(),
            origin: this.originName(),
            destination: this.destinationName(),
            departureAt,
            terminalFee: this.terminalFee
          }
        });
      },
      error: () => this.bookingStatus.set('error')
    });
  }

  private portName(portId: string): string {
    return this.ports().find((port) => String(port.portId) === portId)?.name ?? '';
  }

  private normalizePortName(name: string): string {
    return name.trim().replace(/\s*,\s*/g, ', ').toLowerCase();
  }

  private updateDateValidity(): void {
    const date = this.dateOfDepartureControl.value;
    if (!date) {
      this.dateOfDepartureControl.setErrors(null);
      return;
    }

    const schedules = this.matchingVisits().map((visit) => visit.dayOfDeparture);
    this.dateOfDepartureControl.setErrors(
      isSelectableDepartureDate(date, schedules) ? null : { unavailableDate: true }
    );
  }

  private formatTime(value: string): string {
    const match = /^(\d{2}):(\d{2})/.exec(value);
    if (!match) return value;
    const hours = Number(match[1]);
    const minutes = match[2];
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  }
}
