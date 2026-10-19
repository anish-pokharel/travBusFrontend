import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Layout, SeatState } from '../core/models';
import { SeatMapComponent } from '../shared/seat-map/seat-map.component';
import { errMsg, money, notify, npDateTime, todayNp } from '../core/util';

@Component({
  selector: 'app-counter-book',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SeatMapComponent],
  template: `
  @if (!tripId()) {
    <h4 class="mb-3">Book a ticket</h4>
    <div class="card p-3 mb-3"><div class="row g-2">
      <div class="col-6 col-md-3"><label class="form-label small" for="d">Travel date</label><input id="d" type="date" class="form-control" [min]="today" [(ngModel)]="date" (ngModelChange)="load()"></div>
      <div class="col-6 col-md-4"><label class="form-label small" for="q">Search route / vehicle</label><input id="q" class="form-control" placeholder="e.g. Pokhara" [(ngModel)]="q"></div>
    </div></div>
    @if (loading()) { <div class="spinner-border text-primary"></div> }
    @else if (!shown().length) { <div class="card p-4 text-center text-muted">No bookable trips found.</div> }
    <div class="row g-3">
      @for (t of shown(); track t._id) {
        <div class="col-md-6 col-xl-4"><div class="card p-3 h-100">
          <div class="fw-bold">{{ t.routeId?.departureCity }} → {{ t.routeId?.destinationCity }}</div>
          <div class="small text-muted">{{ dt(t.departureAt) }}</div><div class="small">{{ t.vehicleId?.name }} ({{ t.vehicleId?.registrationNumber }})</div>
          <div class="d-flex justify-content-between align-items-center mt-2"><span class="badge text-bg-light border">{{ t.availableSeats }} seats left</span>
            <button class="btn btn-sm btn-primary" [disabled]="!t.availableSeats" (click)="open(t)">Select seats</button></div>
        </div></div>
      }
    </div>
  } @else {
    <button class="btn btn-sm btn-outline-secondary mb-3" (click)="close()"><i class="bi bi-arrow-left"></i> Trips</button>
    @if (map(); as m) {
      <div class="row g-3">
        <div class="col-xl-7"><div class="card p-3">
          <div class="fw-bold mb-2">{{ m.trip.routeId.name }} · {{ dt(m.trip.departureAt) }} · {{ m.trip.vehicleId.name }}</div>
          <div class="overflow-auto text-center"><app-seat-map [layout]="m.layout" [state]="m.seats" [selected]="selected()" (toggle)="toggle($event)" /></div>
        </div></div>
        <div class="col-xl-5">
          <form class="card p-3" [formGroup]="form" (ngSubmit)="confirm()">
            <h6>Passengers</h6>
            @if (!pax.length) { <div class="text-muted small mb-2">Select seats on the map.</div> }
            <div formArrayName="passengers">
              @for (g of pax.controls; track g.value.seatId) {
                <div class="row g-2 mb-2" [formGroupName]="$index">
                  <div class="col-2 d-flex align-items-center fw-bold">{{ m.seats[g.value.seatId]?.seatNumber }}</div>
                  <div class="col-6"><input class="form-control form-control-sm" placeholder="Name *" formControlName="name" aria-label="Passenger name" [class.is-invalid]="g.get('name')!.invalid && g.get('name')!.touched"></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Phone" formControlName="phone" aria-label="Passenger phone" [class.is-invalid]="g.get('phone')!.invalid && g.get('phone')!.touched"></div>
                </div>
              }
            </div>
            <label class="form-label small mt-2" for="pm">Payment method</label>
            <select id="pm" class="form-select form-select-sm mb-2" formControlName="paymentMethod"><option value="cash">Cash</option><option value="other">Other (POS / QR at counter)</option></select>
            <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>{{ money(total()) }}</span></div>
            <div class="form-text">The server recalculates the fare when the booking is confirmed.</div>
            <button class="btn btn-success mt-3" [disabled]="!pax.length || busy()">@if (busy()) { <span class="spinner-border spinner-border-sm me-1"></span> }Collect payment & issue ticket</button>
          </form>
        </div>
      </div>
    }
  }`,
})
export class CounterBookComponent implements OnInit, OnDestroy {
  private api = inject(ApiService); private fb = inject(FormBuilder); private router = inject(Router);
  today = todayNp(); date = todayNp(); q = '';
  trips = signal<any[]>([]); loading = signal(true); busy = signal(false);
  tripId = signal(''); map = signal<{ trip: any; layout: Layout; seats: Record<string, SeatState> } | null>(null);
  selected = signal<string[]>([]);
  private poll: any;
  money = money; dt = npDateTime;
  form = this.fb.nonNullable.group({ passengers: this.fb.array<any>([]), paymentMethod: ['cash' as 'cash' | 'other'] });
  get pax() { return this.form.controls.passengers as FormArray; }
  shown = () => this.trips().filter((t) => !this.q || `${t.routeId?.name} ${t.vehicleId?.name} ${t.vehicleId?.registrationNumber}`.toLowerCase().includes(this.q.toLowerCase()));
  total = () => this.selected().reduce((s, id) => s + (this.map()?.seats[id]?.price || 0), 0);

  ngOnInit() { this.load(); }
  ngOnDestroy() { clearInterval(this.poll); }
  load() { this.loading.set(true); this.api.get<any[]>('/trips/upcoming', { date: this.date }).subscribe({ next: (r) => { this.trips.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) }); }

  open(t: any) { this.tripId.set(t._id); this.selected.set([]); this.pax.clear(); this.refresh(); this.poll = setInterval(() => this.refresh(), 6000); }
  close() { clearInterval(this.poll); this.tripId.set(''); this.map.set(null); this.load(); }
  refresh() {
    this.api.get<any>(`/seats/trip/${this.tripId()}`).subscribe((r) => {
      this.map.set(r.data);
      const lost = this.selected().filter((s) => r.data.seats[s]?.status !== 'available');
      lost.forEach((s) => this.toggle(s, true));
      if (lost.length) notify.toast('A selected seat was just sold elsewhere', 'info');
    });
  }
  toggle(seatId: string, force = false) {
    const cur = this.selected();
    if (cur.includes(seatId)) { this.selected.set(cur.filter((s) => s !== seatId)); this.pax.removeAt(this.pax.controls.findIndex((g) => g.value.seatId === seatId)); }
    else if (!force) {
      if (cur.length >= 10) return;
      this.selected.set([...cur, seatId]);
      this.pax.push(this.fb.nonNullable.group({ seatId: [seatId], name: ['', [Validators.required, Validators.minLength(2)]], phone: ['', this.pax.length === 0 ? [Validators.required, Validators.pattern(/^[0-9+\-\s]{7,20}$/)] : [Validators.pattern(/^[0-9+\-\s]{7,20}$/)]] }));
    }
  }
  confirm() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    const v = this.form.getRawValue();
    const pax = v.passengers as any[];
    const first = pax[0];
    this.busy.set(true);
    this.api.post<any>('/bookings/counter', {
      tripId: this.tripId(), seatIds: pax.map((p: any) => p.seatId), paymentMethod: v.paymentMethod,
      passengers: pax.map((p: any) => ({ seatId: p.seatId, name: p.name.trim(), phone: p.phone || undefined })),
      contact: { name: first.name.trim(), phone: first.phone },
    }).subscribe({
      next: (r) => { this.busy.set(false); clearInterval(this.poll); this.router.navigate(['/counter/tickets', r.data._id], { queryParams: { print: 1 } }); },
      error: (e) => { this.busy.set(false); notify.error(e, 'Booking failed'); this.refresh(); },
    });
  }
}
