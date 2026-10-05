import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BookingHistoryItem } from '../booking/booking.models';
import { HistoryComponent } from './history.component';

describe('HistoryComponent search', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let component: HistoryComponent;
  let httpTesting: HttpTestingController;

  const bookings: BookingHistoryItem[] = [
    {
      bookingId: 1,
      bookingReference: 'GP-ABC123',
      paymentId: 11,
      userId: 5,
      originPortName: 'Manila',
      destinationPortName: 'Cebu',
      departureAt: '2026-09-20T08:00:00Z',
      departureDay: 'Sunday',
      departureTime: '08:00:00',
      passengerCount: 1,
      totalAmount: 500,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      bookingId: 2,
      bookingReference: 'GP-XYZ789',
      paymentId: 12,
      userId: 5,
      originPortName: 'Batangas',
      destinationPortName: 'Manila',
      departureAt: '2026-10-02T10:00:00Z',
      departureDay: 'Friday',
      departureTime: '10:00:00',
      passengerCount: 2,
      totalAmount: 900,
      status: 'Pending',
      paymentStatus: 'Pending',
      createdAt: '2026-09-02T08:00:00Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/Bookings/mine').flush(bookings);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  it('shows all bookings when search is empty', () => {
    expect(component.visibleBookings()).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.booking-card')).toHaveLength(2);
  });

  it('finds a booking by reference, origin, destination, or status', () => {
    component.searchTerm.set('abc123');
    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([1]);

    component.searchTerm.set('BATANGAS');
    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([2]);

    component.searchTerm.set('cebu');
    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([1]);

    component.searchTerm.set('pending');
    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([2]);
  });

  it('is case-insensitive and ignores leading/trailing whitespace', () => {
    component.searchTerm.set('  gP-AbC123  ');

    expect(component.visibleBookings()).toHaveLength(1);
    expect(component.visibleBookings()[0].bookingId).toBe(1);
  });

  it('searches available date fields', () => {
    component.searchTerm.set('2026-10-02');

    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([2]);
  });

  it('finds a booking using the exact desktop departure text displayed in the card', () => {
    component.searchTerm.set(`  ${component.formatDeparture(bookings[0])}  `);

    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([1]);
  });

  it('finds a booking using the mobile departure text displayed in the card', () => {
    component.searchTerm.set(component.formatDepartureMobile(bookings[1]));

    expect(component.visibleBookings().map((booking) => booking.bookingId)).toEqual([2]);
  });

  it('shows the no-results state when nothing matches', () => {
    component.searchTerm.set('does-not-exist');
    fixture.detectChanges();

    expect(component.visibleBookings()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('No records match your filters.');
  });

  it('clears the search and restores all bookings', () => {
    component.searchTerm.set('cebu');
    expect(component.visibleBookings()).toHaveLength(1);

    component.clearFilters();

    expect(component.searchTerm()).toBe('');
    expect(component.visibleBookings()).toHaveLength(2);
  });
});
