import { describe, expect, it } from 'vitest';
import { Validators } from '@angular/forms';

import { getAvailableDestinationPorts } from '../booking-destination.utils';
import { guestInformationFromUser } from '../guest-information.utils';
import { PortCatalogItem, VesselVisitCatalogItem } from '../booking.models';
import {
  formatDateOnly,
  isSelectableDepartureDate,
  parseDateOnly,
  departureScheduleExplanation,
  scheduleMatchesDate,
  visitsForRecurringDate,
  uniqueVisitsByDepartureTime
} from './booking-details.component';

describe('recurring departure date validation', () => {
  const today = new Date(2026, 7, 28);

  it('rejects only dates before today', () => {
    expect(isSelectableDepartureDate('2026-08-27', ['Friday'], today)).toBe(false);
    expect(isSelectableDepartureDate('2026-08-28', ['Friday'], today)).toBe(true);
  });

  it('accepts today and future dates when their weekday is scheduled', () => {
    expect(isSelectableDepartureDate('2026-08-28', ['Friday'], today)).toBe(true);
    expect(isSelectableDepartureDate('2026-08-29', ['Saturday'], today)).toBe(true);
  });

  it('limits passenger counts to 10', () => {
    const maxValidator = Validators.max(10);

    expect(maxValidator({ value: 11 } as any)).toEqual({ max: { max: 10, actual: 11 } });
    expect(maxValidator({ value: 10 } as any)).toBeNull();
  });

  it('rejects a future date when its weekday is not scheduled', () => {
    expect(isSelectableDepartureDate('2026-08-30', ['Saturday'], today)).toBe(false);
  });

  it('allows every future date for a daily schedule', () => {
    expect(isSelectableDepartureDate('2026-08-29', ['daily'], today)).toBe(true);
    expect(isSelectableDepartureDate('2026-09-02', ['DAILY'], today)).toBe(true);
  });

  it('ignores null, empty, and unknown schedules', () => {
    expect(isSelectableDepartureDate('2026-08-29', [null, '', 'Weekdays'], today)).toBe(false);
  });

  it('matches recurring schedule values case-insensitively', () => {
    const date = parseDateOnly('2026-08-31')!;
    expect(scheduleMatchesDate(' monday ', date)).toBe(true);
    expect(scheduleMatchesDate('Tuesday', date)).toBe(false);
  });

  it('parses and formats dates without UTC shifting', () => {
    const date = parseDateOnly('2026-09-07')!;
    expect(formatDateOnly(date)).toBe('2026-09-07');
  });

  it('filters visits by the selected date weekday and includes daily visits', () => {
    const visits = [
      { vesselVisitId: 1, dayOfDeparture: 'Monday' },
      { vesselVisitId: 2, dayOfDeparture: ' daily ' },
      { vesselVisitId: 3, dayOfDeparture: 'Tuesday' }
    ] as VesselVisitCatalogItem[];

    expect(visitsForRecurringDate(visits, '2026-08-31').map((visit) => visit.vesselVisitId)).toEqual([1, 2]);
  });

  it('keeps one representative visit for duplicate departure times', () => {
    const visits = [
      { vesselVisitId: 179, estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 180, estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 181, estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 182, estimatedTimeOfDeparture: '16:00:00' }
    ] as VesselVisitCatalogItem[];

    expect(uniqueVisitsByDepartureTime(visits).map((visit) => visit.vesselVisitId)).toEqual([179]);
  });

  it('keeps all visits with different departure times', () => {
    const visits = [
      { vesselVisitId: 179, estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 180, estimatedTimeOfDeparture: '17:00:00' },
      { vesselVisitId: 181, estimatedTimeOfDeparture: '18:00:00' }
    ] as VesselVisitCatalogItem[];

    expect(uniqueVisitsByDepartureTime(visits).map((visit) => visit.vesselVisitId)).toEqual([179, 180, 181]);
  });

  it('retains the first visit as the valid representative option', () => {
    const visits = [
      { vesselVisitId: 179, estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 180, estimatedTimeOfDeparture: '16:00:00' }
    ] as VesselVisitCatalogItem[];

    const uniqueVisits = uniqueVisitsByDepartureTime(visits);
    expect(uniqueVisits).toHaveLength(1);
    expect(uniqueVisits[0].vesselVisitId).toBe(179);
  });

  it('deduplicates only after existing date filtering', () => {
    const visits = [
      { vesselVisitId: 179, dayOfDeparture: 'Monday', estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 180, dayOfDeparture: 'Monday', estimatedTimeOfDeparture: '16:00:00' },
      { vesselVisitId: 181, dayOfDeparture: 'Tuesday', estimatedTimeOfDeparture: '16:00:00' }
    ] as VesselVisitCatalogItem[];

    const mondayVisits = visitsForRecurringDate(visits, '2026-08-31');
    expect(uniqueVisitsByDepartureTime(mondayVisits).map((visit) => visit.vesselVisitId)).toEqual([179]);
  });

  it('explains a route-specific weekly schedule', () => {
    expect(departureScheduleExplanation(['Monday', 'Wednesday', 'Friday'])).toBe(
      'Available: Mon, Wed & Fri.'
    );
  });

  it('explains daily schedules', () => {
    expect(departureScheduleExplanation(['Daily'])).toBe(
      'Available every day.'
    );
  });

  it('explains missing weekly schedules without treating null as daily', () => {
    expect(departureScheduleExplanation(['Monday', null])).toBe(
      'Schedule unavailable. Dates follow the configured vessel visits.'
    );
  });

  it('prompts for a shipping line when none is selected', () => {
    expect(departureScheduleExplanation([])).toBe(
      'Select a shipping line to see available dates.'
    );
  });
});

describe('getAvailableDestinationPorts', () => {
  const ports: PortCatalogItem[] = [
    { portId: 1, name: 'Ozamiz' },
    { portId: 2, name: 'Iligan' },
    { portId: 3, name: 'Cebu' },
    { portId: 4, name: 'Manila' }
  ];

  const visits: VesselVisitCatalogItem[] = [
    {
      vesselVisitId: 1,
      originPortId: 1,
      originPortName: 'Ozamiz',
      destinationPortId: 2,
      destinationPortName: 'Iligan',
      shippingLineId: 1,
      shippingLineName: 'Line A',
      vesselId: 1,
      vesselName: 'Vessel A',
      dayOfDeparture: 'Daily',
      estimatedTimeOfDeparture: '08:00'
    },
    {
      vesselVisitId: 2,
      originPortId: 1,
      originPortName: 'Ozamiz',
      destinationPortId: 3,
      destinationPortName: 'Cebu',
      shippingLineId: 1,
      shippingLineName: 'Line A',
      vesselId: 2,
      vesselName: 'Vessel B',
      dayOfDeparture: 'Daily',
      estimatedTimeOfDeparture: '10:00'
    },
    {
      vesselVisitId: 3,
      originPortId: 2,
      originPortName: 'Iligan',
      destinationPortId: 4,
      destinationPortName: 'Manila',
      shippingLineId: 2,
      shippingLineName: 'Line B',
      vesselId: 3,
      vesselName: 'Vessel C',
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '12:00'
    }
  ];

  it('returns only destinations connected to the selected origin', () => {
    expect(getAvailableDestinationPorts(ports, visits, 1).map((port) => port.name)).toEqual(['Iligan', 'Cebu']);
  });

  it('recalculates destinations when the origin changes', () => {
    expect(getAvailableDestinationPorts(ports, visits, 2).map((port) => port.name)).toEqual(['Manila']);
  });

  it('returns no destinations for an unknown origin', () => {
    expect(getAvailableDestinationPorts(ports, visits, 99)).toEqual([]);
  });
});

describe('guestInformationFromUser', () => {
  it('fills guest fields from the authenticated user', () => {
    expect(guestInformationFromUser({ firstName: 'Jane', lastName: 'Doe', mobileNumber: '09171234567', email: 'jane@example.com' })).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      mobileNumber: '09171234567',
      email: 'jane@example.com'
    });
  });

  it('uses empty guest values when no authenticated user is available', () => {
    expect(guestInformationFromUser(null)).toEqual({
      firstName: '',
      lastName: '',
      mobileNumber: '',
      email: ''
    });
  });
});
