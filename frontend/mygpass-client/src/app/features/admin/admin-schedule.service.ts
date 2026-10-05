import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url';
import { ShippingLineCatalogItem } from '../booking/booking.models';

export type PortCatalogItem = {
  portId: number;
  name: string;
};

export type VesselCatalogItem = {
  vesselId: number;
  shippingLineId: number;
  name: string;
};

export type AdminSchedule = {
  vesselVisitId: number;
  originPortId: number;
  originPortName: string;
  destinationPortId: number;
  destinationPortName: string;
  shippingLineId: number;
  shippingLineName: string;
  vesselId: number;
  vesselName: string;
  dayOfDeparture: string | null;
  estimatedTimeOfDeparture: string;
};

export type ScheduleCreateRequest = {
  originPortId: number;
  destinationPortId: number;
  vesselId: number;
  dayOfDeparture: string | null;
  estimatedTimeOfDeparture: string;
};

export type ScheduleUpdateRequest = ScheduleCreateRequest;

@Injectable({ providedIn: 'root' })
export class AdminScheduleService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getSchedules(): Observable<AdminSchedule[]> {
    return this.http.get<AdminSchedule[]>(`${this.apiBaseUrl}/api/VesselVisits`);
  }

  getPorts(): Observable<PortCatalogItem[]> {
    return this.http.get<PortCatalogItem[]>(`${this.apiBaseUrl}/api/Ports`);
  }

  getVessels(): Observable<VesselCatalogItem[]> {
    return this.http.get<VesselCatalogItem[]>(`${this.apiBaseUrl}/api/Vessels`);
  }

  getShippingLines(): Observable<ShippingLineCatalogItem[]> {
    return this.http.get<ShippingLineCatalogItem[]>(`${this.apiBaseUrl}/api/ShippingLines`);
  }

  createSchedule(request: ScheduleCreateRequest): Observable<AdminSchedule> {
    return this.http.post<AdminSchedule>(`${this.apiBaseUrl}/api/VesselVisits`, request);
  }

  updateSchedule(scheduleId: number, request: ScheduleUpdateRequest): Observable<AdminSchedule> {
    return this.http.put<AdminSchedule>(`${this.apiBaseUrl}/api/VesselVisits/${scheduleId}`, request);
  }

  deleteSchedule(scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/VesselVisits/${scheduleId}`);
  }
}
