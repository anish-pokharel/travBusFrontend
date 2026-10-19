import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
import { PublicShellComponent, DashboardShellComponent } from './shared/shell/shell.component';

const ticketPage = () => import('./shared/ticket-page.component').then((m) => m.TicketPageComponent);
const profile = () => import('./shared/profile.component').then((m) => m.ProfileComponent);

export const routes: Routes = [
  {
    path: '', component: PublicShellComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./public/home.component').then((m) => m.HomeComponent) },
      { path: 'search', loadComponent: () => import('./public/search.component').then((m) => m.SearchComponent) },
      { path: 'trip/:id', loadComponent: () => import('./public/trip-book.component').then((m) => m.TripBookComponent) },
      { path: 'payment/esewa/success', data: { provider: 'esewa' }, canActivate: [authGuard], loadComponent: () => import('./public/payment-return.component').then((m) => m.PaymentReturnComponent) },
      { path: 'payment/esewa/failure', data: { provider: 'esewa', failed: true }, loadComponent: () => import('./public/payment-return.component').then((m) => m.PaymentReturnComponent) },
      { path: 'payment/khalti/return', data: { provider: 'khalti' }, canActivate: [authGuard], loadComponent: () => import('./public/payment-return.component').then((m) => m.PaymentReturnComponent) },
      { path: 'verify', loadComponent: () => import('./public/verify.component').then((m) => m.VerifyComponent) },
      { path: 'verify/:code', loadComponent: () => import('./public/verify.component').then((m) => m.VerifyComponent) },
      { path: 'login', loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./auth/forgot.component').then((m) => m.ForgotComponent) },
      { path: 'reset-password', loadComponent: () => import('./auth/forgot.component').then((m) => m.ForgotComponent) },
    ],
  },
  {
    path: 'user', component: DashboardShellComponent, canActivate: [roleGuard('passenger')],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./user/dashboard.component').then((m) => m.UserDashboardComponent) },
      { path: 'bookings', loadComponent: () => import('./user/bookings.component').then((m) => m.UserBookingsComponent) },
      { path: 'bookings/:id', loadComponent: ticketPage },
      { path: 'refunds', loadComponent: () => import('./user/refunds.component').then((m) => m.UserRefundsComponent) },
      { path: 'profile', loadComponent: profile },
    ],
  },
  {
    path: 'counter', component: DashboardShellComponent, canActivate: [roleGuard('counter')],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./counter/dashboard.component').then((m) => m.CounterDashboardComponent) },
      { path: 'book', loadComponent: () => import('./counter/book.component').then((m) => m.CounterBookComponent) },
      { path: 'sales', loadComponent: () => import('./counter/sales.component').then((m) => m.CounterSalesComponent) },
      { path: 'tickets/:id', loadComponent: ticketPage },
      { path: 'verify', loadComponent: () => import('./counter/verify.component').then((m) => m.CounterVerifyComponent) },
      { path: 'closing', loadComponent: () => import('./counter/closing.component').then((m) => m.CounterClosingComponent) },
      { path: 'profile', loadComponent: profile },
    ],
  },
  {
    path: 'admin', component: DashboardShellComponent, canActivate: [roleGuard('admin')],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./admin/dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./admin/users.component').then((m) => m.AdminUsersComponent) },
      { path: 'vehicles', loadComponent: () => import('./admin/vehicles.component').then((m) => m.AdminVehiclesComponent) },
      { path: 'layouts', loadComponent: () => import('./admin/layouts.component').then((m) => m.AdminLayoutsComponent) },
      { path: 'layouts/new', loadComponent: () => import('./admin/layout-designer.component').then((m) => m.LayoutDesignerComponent) },
      { path: 'layouts/:id', loadComponent: () => import('./admin/layout-designer.component').then((m) => m.LayoutDesignerComponent) },
      { path: 'routes', loadComponent: () => import('./admin/routes.component').then((m) => m.AdminRoutesComponent) },
      { path: 'trips', loadComponent: () => import('./admin/trips.component').then((m) => m.AdminTripsComponent) },
      { path: 'trips/:id', loadComponent: () => import('./admin/trip-detail.component').then((m) => m.AdminTripDetailComponent) },
      { path: 'bookings', loadComponent: () => import('./admin/bookings.component').then((m) => m.AdminBookingsComponent) },
      { path: 'bookings/:id', loadComponent: ticketPage },
      { path: 'payments', loadComponent: () => import('./admin/payments.component').then((m) => m.AdminPaymentsComponent) },
      { path: 'counters', loadComponent: () => import('./admin/counters.component').then((m) => m.AdminCountersComponent) },
      { path: 'reports', loadComponent: () => import('./admin/reports.component').then((m) => m.AdminReportsComponent) },
      { path: 'settings', loadComponent: () => import('./admin/settings.component').then((m) => m.AdminSettingsComponent) },
      { path: 'audit', loadComponent: () => import('./admin/audit.component').then((m) => m.AdminAuditComponent) },
      { path: 'profile', loadComponent: profile },
    ],
  },
  { path: '**', redirectTo: '' },
];
