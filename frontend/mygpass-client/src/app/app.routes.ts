import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login.component';
import { RegistrationComponent } from './features/auth/registration/registration.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { BookingDetailsComponent } from './features/booking/details/booking-details.component';
import { DummyPaymentComponent } from './features/booking/payment/dummy-payment.component';
import { BookingConfirmationComponent } from './features/booking/confirmation/booking-confirmation.component';
import { BookingLayoutComponent } from './features/booking/layout/booking-layout.component';
import { BookingRouteComponent } from './features/booking/route/booking-route.component';
import { AdminUsersComponent } from './features/admin/admin-users.component';
import { AdminSchedulesComponent } from './features/admin/admin-schedules.component';
import { adminGuard, authGuard } from './features/auth/auth.guard';
import { AccountComponent } from './features/account/account.component';
import { HistoryComponent } from './features/history/history.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegistrationComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  {
    path: 'booking',
    component: BookingLayoutComponent,
    children: [
      { path: '', redirectTo: 'details', pathMatch: 'full' },
      { path: 'route', component: BookingRouteComponent },
      { path: 'details', component: BookingDetailsComponent },
      { path: 'payment', component: DummyPaymentComponent },
      { path: 'pass', component: BookingConfirmationComponent }
    ]
  },
  {
    path: 'account',
    component: BookingLayoutComponent,
    canActivate: [authGuard],
    children: [{ path: '', component: AccountComponent }]
  },
  {
    path: 'history',
    component: BookingLayoutComponent,
    canActivate: [authGuard],
    children: [{ path: '', component: HistoryComponent }]
  },
  {
    path: 'admin',
    component: BookingLayoutComponent,
    children: [
      {
        path: 'users',
        component: AdminUsersComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'schedules',
        component: AdminSchedulesComponent,
        canActivate: [adminGuard]
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
