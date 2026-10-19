import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Layout, SeatState } from '../core/models';
import { SeatMapComponent } from '../shared/seat-map/seat-map.component';
import { duration, errMsg, money, notify, npDate, npTime } from '../core/util';

const PHONE = /^[0-9+\-\s]{7,20}$/;

@Component({
  selector: 'app-trip-book',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SeatMapComponent],
  template: `
  <div class="container py-4">
    @if (loading()) { <div class="text-center py-5"><div class="spinner-border text-primary"></div></div> }
    @else if (error()) { <div class="alert alert-danger">{{ error() }} <a routerLink="/">Back to search</a></div> }
    @else {
    @if (data(); as d) {
      <div class="card p-3 mb-3">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div><div class="fw-bold fs-5">{{ d.trip.routeId.departureCity }} <i class="bi bi-arrow-right"></i> {{ d.trip.routeId.destinationCity }}</div>
            <div class="text-muted small">{{ d.trip.vehicleId.operator }} · {{ d.trip.vehicleId.name }} ({{ d.trip.vehicleId.registrationNumber }})</div></div>
          <div class="text-md-end"><div class="fw-semibold">{{ day(d.trip.departureAt) }} · {{ time(d.trip.departureAt) }} → {{ time(d.trip.arrivalAt) }}</div>
            <div class="small text-muted">{{ dur(d.trip.routeId.durationMin) }}</div></div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card p-3">
            <div class="d-flex justify-content-between mb-2"><h6 class="mb-0">{{ step() === 1 ? 'Choose your seats' : 'Your seats' }}</h6>
              <small class="text-muted">{{ d.counts.available || 0 }} available</small></div>
            <div class="overflow-auto text-center">
              <app-seat-map [layout]="layout()" [state]="d.seats" [selected]="selected()" [interactive]="step()===1" (toggle)="toggle($event)" />
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          @if (step() === 1) {
            <div class="card p-3">
              <h6>Selected seats</h6>
              @if (!selected().length) { <div class="text-muted small">Tap an available seat to select it (max 10).</div> }
              @for (id of selected(); track id) {
                <div class="d-flex justify-content-between border-bottom py-1"><span><b>{{ d.seats[id]?.seatNumber }}</b></span><span>{{ money(d.seats[id]?.price) }}</span></div>
              }
              <div class="d-flex justify-content-between fw-bold mt-2"><span>Estimated total</span><span>{{ money(estimate()) }}</span></div>
              <div class="form-text">Final price is confirmed by the server when seats are reserved.</div>
              <button class="btn btn-primary mt-3" [disabled]="!selected().length || busy()" (click)="hold()">
                @if (busy()) { <span class="spinner-border spinner-border-sm me-1"></span> }Continue</button>
            </div>
          } @else {
            <form class="card p-3" [formGroup]="form" (ngSubmit)="pay()">
              <div class="alert alert-warning py-2 small d-flex justify-content-between mb-3">
                <span><i class="bi bi-hourglass-split"></i> Seats reserved for you</span><b>{{ remaining() }}</b></div>
              <h6>Passenger details</h6>
              <div formArrayName="passengers">
                @for (g of paxArray.controls; track $index) {
                  <div class="border rounded p-2 mb-2" [formGroupName]="$index">
                    <div class="small fw-semibold mb-1">Seat {{ hold$()!.seats[$index].seatNumber }} · {{ money(hold$()!.seats[$index].price) }}</div>
                    <div class="row g-2">
                      <div class="col-12"><input class="form-control form-control-sm" placeholder="Full name *" formControlName="name" [class.is-invalid]="inv(g,'name')" aria-label="Passenger name"></div>
                      <div class="col-6"><input class="form-control form-control-sm" placeholder="Phone" formControlName="phone" [class.is-invalid]="inv(g,'phone')" aria-label="Passenger phone"></div>
                      <div class="col-3"><input class="form-control form-control-sm" type="number" placeholder="Age" formControlName="age" aria-label="Age"></div>
                      <div class="col-3"><select class="form-select form-select-sm" formControlName="gender" aria-label="Gender"><option value="">-</option><option value="male">M</option><option value="female">F</option><option value="other">Other</option></select></div>
                    </div>
                  </div>
                }
              </div>
              <h6 class="mt-2">Contact</h6>
              <div formGroupName="contact" class="row g-2 mb-2">
                <div class="col-12"><input class="form-control form-control-sm" placeholder="Contact name *" formControlName="name" [class.is-invalid]="inv(form.controls.contact,'name')" aria-label="Contact name"></div>
                <div class="col-6"><input class="form-control form-control-sm" placeholder="Phone *" formControlName="phone" [class.is-invalid]="inv(form.controls.contact,'phone')" aria-label="Contact phone"></div>
                <div class="col-6"><input class="form-control form-control-sm" placeholder="Email" formControlName="email" [class.is-invalid]="inv(form.controls.contact,'email')" aria-label="Contact email"></div>
              </div>
              <h6>Payment</h6>
              <div class="btn-group w-100 mb-3" role="group">
                <input type="radio" class="btn-check" id="m-esewa" value="esewa" formControlName="method"><label class="btn btn-outline-success" for="m-esewa">eSewa</label>
                <input type="radio" class="btn-check" id="m-khalti" value="khalti" formControlName="method"><label class="btn btn-outline-primary" for="m-khalti">Khalti</label>
              </div>
              <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>{{ money(hold$()!.total) }}</span></div>
              <div class="d-flex gap-2 mt-3">
                <button type="button" class="btn btn-outline-secondary" (click)="back()" [disabled]="busy()">Back</button>
                <button class="btn btn-success flex-grow-1" type="submit" [disabled]="busy()">
                  @if (busy()) { <span class="spinner-border spinner-border-sm me-1"></span> }Pay {{ money(hold$()!.total) }}</button>
              </div>
              <div class="form-text mt-2">You will be redirected to the payment provider. Your ticket is issued only after the payment is verified.</div>
            </form>
          }
        </div>
      </div>
    }
    }
  </div>`,
})
export class TripBookComponent implements OnChanges, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  @Input() id = '';

  data = signal<{ trip: any; layout: Layout; seats: Record<string, SeatState>; counts: any } | null>(null);
  layout = () => this.data()?.layout ?? null;
  loading = signal(true); error = signal(''); busy = signal(false);
  step = signal<1 | 2>(1);
  selected = signal<string[]>([]);
  hold$ = signal<{ reservationId: string; holdExpiresAt: string; total: number; seats: { seatId: string; seatNumber: string; price: number }[] } | null>(null);
  remaining = signal('');
  private timers: any[] = [];
  private submitted = false;
  money = money; dur = duration; time = npTime; day = npDate;

  form = this.fb.nonNullable.group({
    passengers: this.fb.array<any>([]),
    contact: this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], phone: ['', [Validators.required, Validators.pattern(PHONE)]], email: ['', Validators.email] }),
    method: ['esewa' as 'esewa' | 'khalti'],
  });
  get paxArray() { return this.form.controls.passengers as FormArray; }
  inv(g: any, n: string) { const c = g.get(n); return c && c.invalid && (c.touched || c.dirty); }

  ngOnChanges() { this.load(true); this.clearTimers(); this.timers.push(setInterval(() => this.step() === 1 && this.load(false), 8000)); }
  ngOnDestroy() { this.clearTimers(); this.releaseHeld(); }
  private clearTimers() { this.timers.forEach(clearInterval); this.timers = []; }

  load(first: boolean) {
    if (!this.id) return;
    this.api.get<any>(`/seats/trip/${this.id}`).subscribe({
      next: (r) => {
        this.data.set(r.data); this.loading.set(false);
        // drop seats somebody else just took
        const lost = this.selected().filter((s) => r.data.seats[s]?.status !== 'available');
        if (lost.length && this.step() === 1) { this.selected.update((a) => a.filter((s) => !lost.includes(s))); notify.toast('A seat you selected was just taken', 'info'); }
      },
      error: (e) => { if (first) { this.error.set(errMsg(e)); this.loading.set(false); } },
    });
  }

  toggle(seatId: string) {
    if (this.step() !== 1) return;
    const cur = this.selected();
    if (cur.includes(seatId)) this.selected.set(cur.filter((s) => s !== seatId));
    else if (cur.length >= 10) notify.toast('You can book up to 10 seats at a time', 'info');
    else this.selected.set([...cur, seatId]);
  }
  estimate() { return this.selected().reduce((s, id) => s + (this.data()?.seats[id]?.price || 0), 0); }

  hold() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login'], { queryParams: { returnUrl: `/trip/${this.id}` } }); return; }
    this.busy.set(true);
    this.api.post<any>('/bookings/hold', { tripId: this.id, seatIds: this.selected() }).subscribe({
      next: (r) => {
        this.busy.set(false); this.hold$.set(r.data);
        const u = this.auth.user()!;
        this.paxArray.clear();
        r.data.seats.forEach((_s: any, i: number) => this.paxArray.push(this.fb.nonNullable.group({
          name: [i === 0 ? u.name : '', [Validators.required, Validators.minLength(2)]], phone: [i === 0 ? u.phone || '' : '', Validators.pattern(PHONE)], age: [null as number | null], gender: [''],
        })));
        this.form.controls.contact.patchValue({ name: u.name, phone: u.phone || '', email: u.email });
        this.step.set(2); this.startCountdown(r.data.holdExpiresAt);
      },
      error: (e) => { this.busy.set(false); this.load(false); notify.error(e, 'Could not reserve seats'); this.selected.set([]); },
    });
  }

  private startCountdown(until: string) {
    const t = setInterval(() => {
      const ms = new Date(until).getTime() - Date.now();
      if (ms <= 0) { clearInterval(t); this.remaining.set('0:00'); this.expired(); return; }
      this.remaining.set(`${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`);
    }, 1000);
    this.timers.push(t);
  }
  private expired() { if (this.step() === 2 && !this.submitted) { notify.info('Reservation expired', 'Your seats were released. Please select again.'); this.hold$.set(null); this.selected.set([]); this.step.set(1); this.load(false); } }

  back() { this.releaseHeld(); this.hold$.set(null); this.step.set(1); this.load(false); }
  private releaseHeld() {
    const h = this.hold$();
    if (h && !this.submitted) this.api.post('/bookings/release', { reservationId: h.reservationId }).subscribe({ error: () => {} });
  }

  pay() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    const h = this.hold$()!;
    const v = this.form.getRawValue();
    const passengers = v.passengers.map((p: any, i: number) => ({
      name: p.name.trim(), phone: p.phone || undefined, age: p.age ?? undefined, gender: p.gender || undefined, seatId: h.seats[i].seatId,
    }));
    this.busy.set(true);
    this.api.post<any>('/bookings/checkout', { tripId: this.id, reservationId: h.reservationId, method: v.method, passengers, contact: { ...v.contact, email: v.contact.email || undefined } }).subscribe({
      next: (r) => {
        this.submitted = true; this.clearTimers();
        const init = r.data.init;
        if (init.type === 'form') this.postForm(init.url, init.fields);
        else window.location.href = init.url;
      },
      error: (e) => { this.busy.set(false); notify.error(e, 'Payment could not be started'); },
    });
  }

  /** eSewa v2 requires a browser form POST with signed fields (signed by the server). */
  private postForm(url: string, fields: Record<string, string>) {
    const f = document.createElement('form');
    f.method = 'POST'; f.action = url;
    Object.entries(fields).forEach(([k, v]) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); });
    document.body.appendChild(f); f.submit();
  }
}
