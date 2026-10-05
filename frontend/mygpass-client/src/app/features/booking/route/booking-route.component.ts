import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';

interface ImagePosition {
  x: number;
  y: number;
}

interface MapPort {
  name: string;
}

@Component({
  selector: 'app-booking-route',
  standalone: true,
  templateUrl: './booking-route.component.html',
  styleUrl: './booking-route.component.scss'
})
export class BookingRouteComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly selectedOrigin = signal<string | null>(null);
  readonly showTerminalFeeOptions = signal(false);
  readonly authenticatedUserName = this.authService.currentUserName;
  private readonly preservedDestination = signal<string | null>(null);
  private readonly preservedPassengerCount = signal<number | null>(null);

  // Manual calibration only. Coordinates are PNG pixels (1024 x 1536).
  readonly portImagePositions: Record<string, ImagePosition> = {
    Ozamiz: { x: 650, y: 1130 },
    Iligan: { x: 746, y: 1165 },
    Surigao: { x: 890, y: 1008 },
    Agusan: { x: 828, y: 1086 },
    Bohol: { x: 711, y: 971 },
    Zamboanga: { x: 487, y: 1198 },
    Matnog: { x: 723, y: 699 },
    Cebu: { x: 724, y: 928 },
    DAPA: { x: 944, y: 1007 },
    LILOAN: { x: 852, y: 947 },
    'SAN RICARDO': { x: 864, y: 973 },
    CABALIAN: { x: 854, y: 930 },
    'SAN JOSE': { x: 895, y: 958 },
    'PADRE BURGOS': { x: 836, y: 960 },
    Siquijor: { x: 686, y: 1024 },
    Dumaguete: { x: 650, y: 1020 },
    Manila: { x: 520, y: 470 },
    CDO: { x: 800, y: 1160 },
    'Isabela, Basilan': { x: 540, y: 1240 },
    'Lamitan, Basilan': { x: 555, y: 1250 },
    Bongao: { x: 300, y: 1450 },
    Jolo: { x: 480, y: 1370 },
    Siasi: { x: 440, y: 1400 },
    'Jubasan Port Allen': { x: 748, y: 690 },
    'Palonpon Leyte': { x: 810, y: 800 },
    'Balwharteco Allen': { x: 752, y: 685 },
    'Dapdapport Allen': { x: 760, y: 700 },
    'Maya port Cebu': { x: 732, y: 831 },
    'Calubian, Leyte': { x: 779, y: 794 }
  };

  readonly mapPorts: MapPort[] = Object.keys(this.portImagePositions).map((name) => ({ name }));

  readonly originPortNames = ['Ozamiz', 'Surigao', 'Agusan', 'Bohol', 'Iligan', 'Zamboanga', 'Matnog'];

  constructor() {
    const queryParams = this.route.snapshot.queryParamMap;
    const navigationState = window.history.state as { origin?: string; destination?: string; focus?: string; passengerCount?: number };
    const origin = queryParams.get('origin') ?? navigationState.origin;

    if (navigationState.destination) this.preservedDestination.set(navigationState.destination);
    if (typeof navigationState.passengerCount === 'number') this.preservedPassengerCount.set(navigationState.passengerCount);

    if (origin && this.originPortNames.includes(origin)) {
      this.selectedOrigin.set(origin);
    }

  }

  get originPorts(): MapPort[] {
    return this.mapPorts.filter((port) => this.originPortNames.includes(port.name));
  }

  portImagePosition(port: MapPort): ImagePosition {
    return this.portImagePositions[port.name];
  }

  selectOrigin(port: MapPort): void {
    this.selectedOrigin.set(port.name);
    this.showTerminalFeeOptions.set(true);
  }

  selectPassengerTerminalFee(): void {
    this.showTerminalFeeOptions.set(false);
    this.continueToBooking();
  }

  continueToBooking(): void {
    const origin = this.selectedOrigin();

    if (!origin) {
      return;
    }

    const destination = this.preservedDestination();
    this.router.navigate(['/booking/details'], {
      queryParams: destination ? { origin, destination } : { origin },
      state: { passengerCount: this.preservedPassengerCount() }
    });
  }

}
