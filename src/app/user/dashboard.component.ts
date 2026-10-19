import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { money, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <h4>Welcome, {{ auth.user()?.name }}</h4>
  <div class="row g-3 my-1">
    <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="small text-muted">Upcoming trips</div><div class="value">{{ upcoming().length }}</div></div></div>
    <div class="col-6 col-md-3"><div class="card stat-card p-3"><div class="small text-muted">Total bookings</div><div class="value">{{ all().length }}</div></div></div>
    <div class="col-12 col-md-6 d-grid"><a class="btn btn-primary btn-lg align-self-center" routerLink="/"><i class="bi bi-search"></i> Book a new trip</a></div>
  </div>
  <h6 class="mt-4">Upcoming tickets</h6>
  @if (!upcoming().length) { <div class="card p-4 text-muted text-center">No upcoming trips.</div> }
  @for (b of upcoming(); track b._id) {
    <a class="card p-3 mb-2 text-decoration-none text-body" [routerLink]="['/user/bookings', b._id]">
      <div class="d-flex justify-content-between"><div><b>{{ b.trip?.routeId?.name }}</b><div class="small text-muted">{{ dt(b.trip?.departureAt) }} · Seats {{ seats(b) }}</div></div>
        <div class="text-end"><div class="fw-semibold">{{ b.pnr }}</div><app-badge [value]="b.status" /></div></div>
    </a>
  }`,
})
export class UserDashboardComponent implements OnInit {
  private api = inject(ApiService); auth = inject(AuthService);
  all = signal<any[]>([]); upcoming = signal<any[]>([]);
  money = money; dt = npDateTime;
  seats = (b: any) => b.passengers.map((p: any) => p.seatNumber).join(', ');
  ngOnInit() {
    this.api.get<any[]>('/bookings/mine').subscribe((r) => {
      this.all.set(r.data);
      this.upcoming.set(r.data.filter((b) => b.status === 'confirmed' && new Date(b.trip?.departureAt) > new Date()));
    });
  }
}
