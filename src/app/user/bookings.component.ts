import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-user-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">My bookings</h4>
  @if (loading()) { <div class="spinner-border text-primary"></div> }
  @else if (!items().length) { <div class="card p-5 text-center text-muted">No bookings yet. <a routerLink="/">Find a trip</a></div> }
  @else {
    <div class="card table-responsive"><table class="table table-hover mb-0">
      <thead><tr><th>PNR</th><th>Route</th><th>Departure</th><th>Seats</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>@for (b of items(); track b._id) {
        <tr><td class="fw-semibold">{{ b.pnr }}</td><td>{{ b.trip?.routeId?.name }}</td><td>{{ dt(b.trip?.departureAt) }}</td>
          <td>{{ seats(b) }}</td><td>{{ money(b.totalAmount) }}</td><td><app-badge [value]="b.status" /></td>
          <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/user/bookings', b._id]">Ticket</a></td></tr>
      }</tbody></table></div>
  }`,
})
export class UserBookingsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); loading = signal(true);
  money = money; dt = npDateTime;
  seats = (b: any) => b.passengers.map((p: any) => p.seatNumber).join(', ');
  ngOnInit() { this.api.get<any[]>('/bookings/mine').subscribe({ next: (r) => { this.items.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}
