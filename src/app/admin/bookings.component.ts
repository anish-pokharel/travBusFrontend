import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { PagerComponent } from '../shared/pager.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PagerComponent, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">Bookings</h4>
  <form class="card p-3 mb-3" (ngSubmit)="load(1)"><div class="row g-2">
    <div class="col-6 col-md-2"><input class="form-control" name="pnr" placeholder="PNR" [(ngModel)]="f.pnr" aria-label="PNR"></div>
    <div class="col-6 col-md-2"><input class="form-control" name="phone" placeholder="Phone" [(ngModel)]="f.phone" aria-label="Phone"></div>
    <div class="col-6 col-md-2"><input class="form-control" name="name" placeholder="Name" [(ngModel)]="f.name" aria-label="Name"></div>
    <div class="col-6 col-md-2"><select class="form-select" name="st" [(ngModel)]="f.status" aria-label="Status"><option value="">Any status</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option><option value="expired">Expired</option></select></div>
    <div class="col-6 col-md-2"><select class="form-select" name="src" [(ngModel)]="f.source" aria-label="Source"><option value="">Online + counter</option><option value="online">Online</option><option value="counter">Counter</option></select></div>
    <div class="col-6 col-md-2"><input class="form-control" type="date" name="td" [(ngModel)]="f.travelDate" aria-label="Travel date"></div>
    <div class="col-12"><button class="btn btn-primary btn-sm me-2">Search</button><button type="button" class="btn btn-outline-secondary btn-sm" (click)="clear()">Clear</button></div>
  </div></form>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>PNR</th><th>Contact</th><th>Route</th><th>Departure</th><th>Seats</th><th>Amount</th><th>Source</th><th>Status</th><th></th></tr></thead>
    <tbody>@for (b of items(); track b._id) {
      <tr><td class="fw-semibold">{{ b.pnr }}</td><td>{{ b.contact?.name }}<div class="small text-muted">{{ b.contact?.phone }}</div></td><td>{{ b.trip?.routeId?.name }}</td><td>{{ dt(b.trip?.departureAt) }}</td>
        <td>{{ seats(b) }}</td><td>{{ money(b.totalAmount) }}</td><td class="text-capitalize">{{ b.source }}@if (b.counter) { <div class="small text-muted">{{ b.counter.name }}</div> }</td>
        <td><app-badge [value]="b.status" /></td><td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/admin/bookings', b._id]">Open</a></td></tr>
    } @empty { <tr><td colspan="9" class="text-center text-muted py-4">No bookings found.</td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="20" [total]="total()" (go)="load($event)" />`,
})
export class AdminBookingsComponent implements OnInit {
  private api = inject(ApiService);
  f = { pnr: '', phone: '', name: '', status: '', source: '', travelDate: '' };
  items = signal<any[]>([]); page = signal(1); total = signal(0); money = money; dt = npDateTime;
  seats = (b: any) => b.passengers.map((p: any) => p.seatNumber).join(', ');
  ngOnInit() { this.load(1); }
  clear() { this.f = { pnr: '', phone: '', name: '', status: '', source: '', travelDate: '' }; this.load(1); }
  load(p: number) { this.api.get<any[]>('/bookings', { ...this.f, page: p, limit: 20 }).subscribe((r) => { this.items.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); }); }
}
