import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BookingFooterComponent } from '../footer/booking-footer.component';
import { BookingHeaderComponent } from '../header/booking-header.component';

@Component({
  selector: 'app-booking-layout',
  standalone: true,
  imports: [BookingHeaderComponent, BookingFooterComponent, RouterOutlet],
  templateUrl: './booking-layout.component.html',
  styleUrl: './booking-layout.component.scss'
})
export class BookingLayoutComponent {}
