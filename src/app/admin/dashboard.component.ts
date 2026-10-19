import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">Dashboard</h4>
  @if (d(); as x) {
    <div class="row g-3">
      @for (c of cards(x); track c[0]) {
        <div class="col-6 col-md-4 col-xl-3"><div class="card stat-card p-3"><div class="small text-muted"><i class="bi me-1" [ngClass]="c[2]"></i>{{ c[0] }}</div><div class="value">{{ c[1] }}</div></div></div>
      }
    </div>
    <div class="row g-3 mt-1">
      <div class="col-lg-7"><div class="card p-3"><h6>Bookings & revenue — last 14 days</h6>
        @if (!x.trend.length) { <div class="text-muted small">No confirmed bookings in this period.</div> }
        <div class="d-flex align-items-end gap-1" style="height:170px" role="img" aria-label="Daily bookings bar chart">
          @for (t of x.trend; track t._id) { <div class="flex-fill text-center" [title]="t._id + ': ' + t.bookings + ' bookings, ' + money(t.revenue)">
            <div class="bg-primary rounded-top" [style.height.px]="barH(t.revenue, x.trend)"></div><div class="small text-muted" style="font-size:.6rem">{{ t._id.slice(8) }}</div></div> }
        </div></div></div>
      <div class="col-lg-5"><div class="card p-3 h-100"><h6>Online vs counter</h6>
        @for (s of x.source; track s._id) { <div class="mb-2"><div class="d-flex justify-content-between small"><span class="text-capitalize">{{ s._id }}</span><span>{{ s.bookings }} · {{ money(s.revenue) }}</span></div>
          <div class="progress" style="height:10px"><div class="progress-bar" [class.bg-success]="s._id==='counter'" [style.width.%]="pct(s.bookings, totalBookings(x))"></div></div></div> }
        @if (!x.source.length) { <div class="text-muted small">No data yet.</div> }
        <h6 class="mt-3">Seat inventory (upcoming trips)</h6>
        <div class="progress" style="height:18px">
          <div class="progress-bar bg-success" [style.width.%]="pct(x.seats.available, seatTotal(x))">{{ x.seats.available }}</div>
          <div class="progress-bar bg-secondary" [style.width.%]="pct(x.seats.occupied, seatTotal(x))">{{ x.seats.occupied }}</div>
          <div class="progress-bar bg-dark" [style.width.%]="pct(x.seats.blocked, seatTotal(x))">{{ x.seats.blocked }}</div></div>
        <div class="small text-muted mt-1">Green available · grey occupied · black blocked</div>
      </div></div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-lg-6"><div class="card p-3"><h6>Route occupancy (30 days)</h6>
        @for (o of x.occupancy; track o._id) { <div class="mb-2"><div class="d-flex justify-content-between small"><span>{{ o.route }}</span><span>{{ o.rate }}% ({{ o.booked }}/{{ o.total }})</span></div>
          <div class="progress" style="height:8px"><div class="progress-bar bg-info" [style.width.%]="o.rate"></div></div></div> }
        @if (!x.occupancy.length) { <div class="text-muted small">No trips yet.</div> }</div></div>
      <div class="col-lg-6"><div class="card p-3"><h6>Counter-wise sales</h6>
        <table class="table table-sm mb-0"><tbody>@for (c of x.counterSales; track c._id) { <tr><td>{{ c.name }}</td><td>{{ c.bookings }} bookings</td><td class="text-end">{{ money(c.revenue) }}</td></tr> }
          @empty { <tr><td class="text-muted">No counter sales yet.</td></tr> }</tbody></table></div></div>
    </div>
    <div class="card p-3 mt-3"><h6>Recent transactions</h6><div class="table-responsive"><table class="table table-sm mb-0">
      <thead><tr><th>When</th><th>PNR</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>@for (p of x.recent; track p._id) { <tr><td>{{ dt(p.createdAt) }}</td><td>{{ p.bookingId?.pnr || '-' }}</td><td class="text-capitalize">{{ p.method }}</td><td>{{ money(p.amount) }}</td><td><app-badge [value]="p.status" /></td></tr> }
        @empty { <tr><td colspan="5" class="text-muted">No transactions yet.</td></tr> }</tbody></table></div></div>
  } @else if (error()) { <div class="alert alert-danger">Could not load the dashboard.</div> }
  @else { <div class="spinner-border text-primary"></div> }`,
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<any>(null); error = signal(false);
  money = money; dt = npDateTime;
  cards = (x: any): [string, any, string][] => [
    ['Passengers', x.passengers, 'bi-people'], ['Vehicles (active)', `${x.vehicles.total} (${x.vehicles.active})`, 'bi-truck-front'], ['Active routes', x.routes, 'bi-signpost-split'], ['Today\'s trips', x.todaysTrips, 'bi-calendar-event'],
    ['Total bookings', x.bookings.total, 'bi-ticket-perforated'], ['Confirmed', x.bookings.confirmed, 'bi-check-circle'], ['Pending', x.bookings.pending, 'bi-hourglass'], ['Cancelled', x.bookings.cancelled, 'bi-x-circle'],
    ['Available seats', x.seats.available, 'bi-grid'], ['Occupied seats', x.seats.occupied, 'bi-person-fill'],
    ['Revenue today', money(x.revenue.today), 'bi-cash'], ['Revenue this month', money(x.revenue.month), 'bi-cash-stack'], ['Revenue this year', money(x.revenue.year), 'bi-graph-up'],
  ];
  totalBookings = (x: any) => x.source.reduce((a: number, s: any) => a + s.bookings, 0);
  seatTotal = (x: any) => x.seats.available + x.seats.occupied + x.seats.blocked;
  pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);
  barH = (v: number, all: any[]) => { const m = Math.max(...all.map((a) => a.revenue), 1); return Math.max(3, (v / m) * 140); };
  ngOnInit() { this.api.get('/reports/dashboard').subscribe({ next: (r) => this.d.set(r.data), error: () => this.error.set(true) }); }
}
