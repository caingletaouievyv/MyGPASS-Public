import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api-base-url';
import { AuthService } from '../auth/auth.service';
import { BookingCreateRequest, BookingResponse, PortCatalogItem, ShippingLineCatalogItem, VesselVisitCatalogItem } from './booking.models';

@Injectable({
  providedIn: 'root'
})
export class BookingCatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authService = inject(AuthService);

  getPorts(): Observable<PortCatalogItem[]> {
    return this.http.get<PortCatalogItem[]>(`${this.apiBaseUrl}/api/Ports`);
  }

  getShippingLines(): Observable<ShippingLineCatalogItem[]> {
    return this.http.get<ShippingLineCatalogItem[]>(`${this.apiBaseUrl}/api/ShippingLines`);
  }

  getVesselVisits(): Observable<VesselVisitCatalogItem[]> {
    return this.http.get<VesselVisitCatalogItem[]>(`${this.apiBaseUrl}/api/VesselVisits`);
  }

  createBooking(request: BookingCreateRequest): Observable<BookingResponse> {
    const endpoint = this.authService.isAuthenticated()
      ? `${this.apiBaseUrl}/api/Bookings`
      : `${this.apiBaseUrl}/api/Bookings/guest`;
    return this.http.post<BookingResponse>(endpoint, request);
  }
}
