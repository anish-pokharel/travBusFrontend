import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { PagerComponent } from '../shared/pager.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-counter-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PagerComponent, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">Tickets & sales</h4>
  <form class="card p-3 mb-3" (ngSubmit)="search(1)"><div class="row g-2">
    <div class="col-6 col-md-3"><input class="form-control" name="pnr" placeholder="PNR" [(ngModel)]="f.pnr" aria-label="PNR"></div>
    <div class="col-6 col-md-3"><input class="form-control" name="phone" placeholder="Phone" [(ngModel)]="f.phone" aria-label="Phone"></div>
    <div class="col-6 col-md-3"><input class="form-control" name="name" placeholder="Passenger name" [(ngModel)]="f.name" aria-label="Name"></div>
    <div class="col-6 col-md-2"><input class="form-control" type="date" name="td" [(ngModel)]="f.travelDate" aria-label="Travel date"></div>
    <div class="col-12 col-md-1 d-grid"><button class="btn btn-primary">Go</button></div>
  </div></form>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>PNR</th><th>Passenger</th><th>Route</th><th>Departure</th><th>Seats</th><th>Amount</th><th>Status</th><th></th></tr></thead>
    <tbody>
      @for (b of items(); track b._id) {
        <tr><td class="fw-semibold">{{ b.pnr }}</td><td>{{ b.contact?.name }}<div class="small text-muted">{{ b.contact?.phone }}</div></td><td>{{ b.trip?.routeId?.name }}</td>
          <td>{{ dt(b.trip?.departureAt) }}</td><td>{{ seats(b) }}</td><td>{{ money(b.totalAmount) }}</td><td><app-badge [value]="b.status" /></td>
          <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/counter/tickets', b._id]">Open</a></td></tr>
      } @empty { <tr><td colspan="8" class="text-center text-muted py-4">No tickets found.</td></tr> }
    </tbody></table></div>
  <app-pager [page]="page()" [limit]="20" [total]="total()" (go)="search($event)" />`,
})
export class CounterSalesComponent implements OnInit {
  private api = inject(ApiService);
  f = { pnr: '', phone: '', name: '', travelDate: '' };
  items = signal<any[]>([]); page = signal(1); total = signal(0);
  money = money; dt = npDateTime;
  seats = (b: any) => b.passengers.map((p: any) => p.seatNumber).join(', ');
  ngOnInit() { this.search(1); }
  search(p: number) {
    this.api.get<any[]>('/bookings', { ...this.f, page: p, limit: 20 }).subscribe((r) => { this.items.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); });
  }
}
