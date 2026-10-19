import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Layout, SeatState } from '../core/models';
import { SeatMapComponent } from '../shared/seat-map/seat-map.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { money, notify, npDateTime } from '../core/util';

@Component({
  selector: 'app-admin-trip-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SeatMapComponent, StatusBadgeComponent],
  template: `
  <a routerLink="/admin/trips" class="btn btn-sm btn-outline-secondary mb-3"><i class="bi bi-arrow-left"></i> Trips</a>
  @if (d(); as m) {
    <div class="card p-3 mb-3"><div class="d-flex flex-wrap justify-content-between gap-2">
      <div><div class="fw-bold fs-5">{{ m.trip.routeId.name }} <app-badge [value]="m.trip.status" /></div>
        <div class="text-muted">{{ dt(m.trip.departureAt) }} · {{ m.trip.vehicleId.name }} ({{ m.trip.vehicleId.registrationNumber }})</div>
        <div class="small mt-1">Available {{ m.counts.available || 0 }} · Held {{ m.counts.held || 0 }} · Booked {{ m.counts.booked || 0 }} · Blocked {{ m.counts.blocked || 0 }}</div></div>
      <div class="d-flex flex-wrap gap-2 align-items-start">
        @if (m.trip.status === 'scheduled') {
          <button class="btn btn-sm btn-outline-warning" (click)="toggleOpen(m.trip)">{{ m.trip.bookingOpen ? 'Close booking' : 'Reopen booking' }}</button>
          <button class="btn btn-sm btn-outline-info" (click)="setStatus('boarding')">Mark boarding</button>
          <button class="btn btn-sm btn-outline-danger" (click)="cancelTrip()">Cancel trip</button>
        }
        @if (m.trip.status === 'boarding') { <button class="btn btn-sm btn-outline-info" (click)="setStatus('departed')">Mark departed</button> }
        @if (m.trip.status === 'departed') { <button class="btn btn-sm btn-outline-success" (click)="setStatus('completed')">Mark completed</button> }
      </div></div></div>
    <div class="row g-3"><div class="col-lg-8"><div class="card p-3">
      <h6>Seat map <small class="text-muted">— select available seats to block, or blocked seats to release</small></h6>
      <div class="overflow-auto text-center"><app-seat-map [layout]="m.layout" [state]="m.seats" [selected]="sel()" [interactive]="true" [selectableStatuses]="['available','blocked']" (toggle)="toggle($event)" [showPrice]="true" /></div></div></div>
      <div class="col-lg-4"><div class="card p-3"><h6>Block / unblock seats</h6>
        <div class="small text-muted mb-2">Blocked seats cannot be sold online or at counters (e.g. staff or reserved seats).</div>
        <div class="mb-2">Selected: <b>{{ names() || 'none' }}</b></div>
        <button class="btn btn-sm btn-dark me-1" [disabled]="!sel().length" (click)="block(true)">Block</button>
        <button class="btn btn-sm btn-outline-dark" [disabled]="!blockedSel().length" (click)="blockUnblocked()">Unblock selected</button></div></div></div>
  }`,
})
export class AdminTripDetailComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  @Input() id = '';
  d = signal<{ trip: any; layout: Layout; seats: Record<string, SeatState>; counts: any } | null>(null);
  sel = signal<string[]>([]); dt = npDateTime; money = money; private t: any;
  ngOnInit() { this.load(); this.t = setInterval(() => this.load(), 10000); }
  ngOnDestroy() { clearInterval(this.t); }
  load() { this.api.get<any>(`/seats/trip/${this.id}`).subscribe((r) => this.d.set(r.data)); }
  /** Admin can pick blocked seats too (to unblock), unlike the passenger map. */
  toggle(id: string) { this.sel.update((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])); }
  names() { return this.sel().map((i) => this.d()?.seats[i]?.seatNumber).join(', '); }
  blockedSel() { return this.sel().filter((i) => this.d()?.seats[i]?.status === 'blocked'); }
  block(b: boolean) {
    const ids = this.sel().filter((i) => this.d()?.seats[i]?.status === 'available');
    if (!ids.length) { notify.toast('Only available seats can be blocked', 'info'); return; }
    this.api.post(`/trips/${this.id}/block-seats`, { seatIds: ids, blocked: b }).subscribe({ next: () => { this.sel.set([]); this.load(); }, error: (e) => notify.error(e) });
  }
  blockUnblocked() { this.api.post(`/trips/${this.id}/block-seats`, { seatIds: this.blockedSel(), blocked: false }).subscribe({ next: () => { this.sel.set([]); this.load(); }, error: (e) => notify.error(e) }); }
  toggleOpen(t: any) { this.api.patch(`/trips/${this.id}`, { bookingOpen: !t.bookingOpen }).subscribe({ next: () => this.load(), error: (e) => notify.error(e) }); }
  setStatus(s: string) { this.api.patch(`/trips/${this.id}`, { status: s }).subscribe({ next: () => this.load(), error: (e) => notify.error(e) }); }
  async cancelTrip() {
    if (!(await notify.confirmDanger('Cancel this trip?', 'All confirmed bookings are cancelled with a full refund queued. This cannot be undone.', 'Cancel trip'))) return;
    const reason = await notify.prompt('Reason shown on cancelled bookings', 'e.g. vehicle breakdown'); if (reason === null) return;
    this.api.post<any>(`/trips/${this.id}/cancel`, { reason }).subscribe({ next: (r) => { notify.success('Trip cancelled', r.message); this.load(); }, error: (e) => notify.error(e) });
  }
}
