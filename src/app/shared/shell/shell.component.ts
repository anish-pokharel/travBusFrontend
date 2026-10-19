import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface NavItem { label: string; link: string; icon: string; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary sticky-top no-print">
    <div class="container-fluid">
      <a class="navbar-brand fw-bold" routerLink="/"><i class="bi bi-bus-front me-1"></i> Yatra Ticket</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="nav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item"><a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a></li>
          <li class="nav-item"><a class="nav-link" routerLink="/verify" routerLinkActive="active">Verify ticket</a></li>
        </ul>
        <ul class="navbar-nav ms-auto align-items-lg-center">
          @if (auth.user(); as u) {
            <li class="nav-item"><a class="nav-link" [routerLink]="auth.homeFor(u.role)"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
            <li class="nav-item"><span class="navbar-text me-2 small">{{ u.name }} <span class="badge bg-light text-primary">{{ u.role }}</span></span></li>
            <li class="nav-item"><button class="btn btn-sm btn-outline-light" (click)="auth.logout()">Logout</button></li>
          } @else {
            <li class="nav-item"><a class="nav-link" routerLink="/login">Login</a></li>
            <li class="nav-item"><a class="btn btn-sm btn-light ms-lg-2" routerLink="/register">Sign up</a></li>
          }
        </ul>
      </div>
    </div>
  </nav>
  <router-outlet />
  <footer class="text-center text-muted small py-4 no-print">© {{ year }} Yatra Ticket · Nepal vehicle ticket booking</footer>`,
})
export class PublicShellComponent {
  auth = inject(AuthService);
  year = new Date().getFullYear();
}

/** Sidebar layout used by admin, counter and passenger areas. */
@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
  <nav class="navbar navbar-dark bg-dark sticky-top no-print">
    <div class="container-fluid">
      <button class="btn btn-outline-light d-lg-none me-2" (click)="open = !open" aria-label="Toggle menu"><i class="bi bi-list"></i></button>
      <a class="navbar-brand me-auto" routerLink="/"><i class="bi bi-bus-front me-1"></i> Yatra Ticket
        <span class="badge bg-primary ms-1 text-capitalize">{{ auth.role() }}</span></a>
      <span class="navbar-text me-3 d-none d-md-inline small">{{ auth.user()?.name }}</span>
      <button class="btn btn-sm btn-outline-light" (click)="auth.logout()"><i class="bi bi-box-arrow-right"></i> Logout</button>
    </div>
  </nav>
  <div class="d-flex">
    <aside class="sidebar bg-white border-end no-print" [class.open]="open">
      <div class="list-group list-group-flush">
        @for (n of items; track n.link) {
          <a class="list-group-item list-group-item-action" [routerLink]="n.link" routerLinkActive="active" [routerLinkActiveOptions]="{exact: n.link === base}" (click)="open=false">
            <i class="bi me-2" [ngClass]="n.icon"></i>{{ n.label }}</a>
        }
      </div>
    </aside>
    <main class="flex-grow-1 p-3 p-md-4 print-area" style="min-width:0"><router-outlet /></main>
  </div>`,
  styles: [`
    .sidebar { width: 230px; min-height: calc(100vh - 56px); flex-shrink: 0; }
    @media (max-width: 991px) { .sidebar { position: fixed; z-index: 1030; left: -240px; top: 56px; bottom: 0; transition: left .2s; overflow-y: auto; } .sidebar.open { left: 0; } }
  `],
})
export class DashboardShellComponent {
  auth = inject(AuthService);
  open = false;
  get base() { return this.auth.homeFor(this.auth.role()); }
  get items(): NavItem[] {
    switch (this.auth.role()) {
      case 'admin': return [
        { label: 'Dashboard', link: '/admin', icon: 'bi-speedometer2' }, { label: 'Users', link: '/admin/users', icon: 'bi-people' },
        { label: 'Vehicles', link: '/admin/vehicles', icon: 'bi-truck-front' }, { label: 'Seat Layouts', link: '/admin/layouts', icon: 'bi-grid-3x3-gap' },
        { label: 'Routes', link: '/admin/routes', icon: 'bi-signpost-split' }, { label: 'Trips', link: '/admin/trips', icon: 'bi-calendar-event' },
        { label: 'Bookings', link: '/admin/bookings', icon: 'bi-ticket-perforated' }, { label: 'Payments & Refunds', link: '/admin/payments', icon: 'bi-cash-coin' },
        { label: 'Counters', link: '/admin/counters', icon: 'bi-shop' }, { label: 'Reports', link: '/admin/reports', icon: 'bi-bar-chart' },
        { label: 'Settings', link: '/admin/settings', icon: 'bi-gear' }, { label: 'Audit logs', link: '/admin/audit', icon: 'bi-journal-text' },
        { label: 'Profile', link: '/admin/profile', icon: 'bi-person-circle' },
      ];
      case 'counter': return [
        { label: 'Dashboard', link: '/counter', icon: 'bi-speedometer2' }, { label: 'Book ticket', link: '/counter/book', icon: 'bi-plus-circle' },
        { label: 'Tickets / sales', link: '/counter/sales', icon: 'bi-receipt' }, { label: 'Verify ticket', link: '/counter/verify', icon: 'bi-qr-code-scan' },
        { label: 'Daily closing', link: '/counter/closing', icon: 'bi-clipboard-check' }, { label: 'Profile', link: '/counter/profile', icon: 'bi-person-circle' },
      ];
      default: return [
        { label: 'Dashboard', link: '/user', icon: 'bi-house' }, { label: 'My bookings', link: '/user/bookings', icon: 'bi-ticket-perforated' },
        { label: 'Refunds', link: '/user/refunds', icon: 'bi-arrow-counterclockwise' }, { label: 'Profile', link: '/user/profile', icon: 'bi-person-circle' },
      ];
    }
  }
}
