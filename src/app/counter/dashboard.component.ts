import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-counter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  @if (d(); as x) {
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h4 class="mb-0">{{ x.counter.name }}</h4><small class="text-muted">{{ x.counter.code }} · {{ x.counter.city }}</small></div>
      <a routerLink="/counter/book" class="btn btn-primary"><i class="bi bi-plus-circle"></i> Book ticket</a>
    </div>
    <div class="row g-3">
      @for (s of cards(x); track s[0]) { <div class="col-6 col-lg-3"><div class="card stat-card p-3"><div class="small text-muted">{{ s[0] }}</div><div class="value">{{ s[1] }}</div></div></div> }
    </div>
    <div class="row g-3 mt-1">
      <div class="col-lg-7"><div class="card p-3"><h6>Upcoming departures (24h)</h6>
        @if (!x.upcoming.length) { <div class="text-muted small">No departures.</div> }
        <div class="table-responsive"><table class="table table-sm mb-0"><tbody>
          @for (t of x.upcoming; track t._id) { <tr><td>{{ dt(t.departureAt) }}</td><td>{{ t.routeId?.name }}</td><td>{{ t.vehicleId?.name }}</td><td class="text-end"><span class="badge text-bg-light border">{{ t.remainingSeats }} left</span></td></tr> }
        </tbody></table></div></div></div>
      <div class="col-lg-5"><div class="card p-3"><h6>Recent bookings</h6>
        @if (!x.recent.length) { <div class="text-muted small">Nothing yet today.</div> }
        @for (b of x.recent; track b._id) { <a class="d-flex justify-content-between border-bottom py-1 text-decoration-none text-body" [routerLink]="['/counter/tickets', b._id]">
          <span><b>{{ b.pnr }}</b> <small class="text-muted">{{ b.contact?.name }}</small></span><span>{{ money(b.totalAmount) }} <app-badge [value]="b.status" /></span></a> }
      </div></div>
    </div>
  } @else { <div class="spinner-border text-primary"></div> }`,
})
export class CounterDashboardComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<any>(null); money = money; dt = npDateTime;
  cards = (x: any) => [['Today\'s sales', money(x.stats.sales)], ['Tickets sold', x.stats.ticketsSold], ['Cash collected', money(x.stats.cashCollected)],
    ['Cancellations', `${x.stats.cancellations.bookings} (${money(x.stats.cancellations.refunded)} refunded)`]];
  ngOnInit() { this.api.get('/counters/me/dashboard').subscribe((r) => this.d.set(r.data)); }
}
