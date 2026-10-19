import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { VEHICLE_TYPE_LABELS } from '../core/models';
import { duration, errMsg, money, npDate, npTime } from '../core/util';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
      <h4 class="mb-0">{{ from }} <i class="bi bi-arrow-right"></i> {{ to }} <small class="text-muted fs-6">· {{ date }}</small></h4>
      <a routerLink="/" class="btn btn-outline-primary btn-sm">Modify search</a>
    </div>
    <div class="row g-3">
      <aside class="col-lg-3">
        <div class="card p-3">
          <div class="fw-semibold mb-2">Filters</div>
          <label class="form-label small">Departure time</label>
          <select class="form-select form-select-sm mb-2" [(ngModel)]="fTime">
            <option value="">Any</option><option value="morning">Morning (before 12:00)</option><option value="afternoon">Afternoon (12:00-17:59)</option><option value="evening">Evening / night (18:00+)</option>
          </select>
          <label class="form-label small">Max price (Rs.)</label>
          <input class="form-control form-control-sm mb-2" type="number" min="0" [(ngModel)]="fPrice">
          <label class="form-label small">Min. available seats</label>
          <input class="form-control form-control-sm mb-2" type="number" min="1" [(ngModel)]="fSeats">
          <label class="form-label small">Vehicle type</label>
          <select class="form-select form-select-sm mb-2" [(ngModel)]="fType">
            <option value="">Any</option>@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }
          </select>
          <div class="small mb-1">Amenities</div>
          @for (a of amenityOptions; track a) {
            <div class="form-check"><input class="form-check-input" type="checkbox" [id]="'am-'+a" [checked]="fAm.includes(a)" (change)="toggleAm(a)"><label class="form-check-label small" [for]="'am-'+a">{{ a }}</label></div>
          }
          <button class="btn btn-sm btn-link mt-2 p-0" (click)="reset()">Clear filters</button>
        </div>
      </aside>
      <section class="col-lg-9">
        @if (loading()) { <div class="text-center py-5"><div class="spinner-border text-primary"></div></div> }
        @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        @else if (!filtered().length) {
          <div class="card p-5 text-center text-muted"><i class="bi bi-emoji-frown fs-1"></i>
            <div class="mt-2">{{ all().length ? 'No trips match your filters.' : 'No trips available for this route and date. Try another date.' }}</div></div>
        } @else {
          @for (t of filtered(); track t._id) {
            <div class="card mb-3"><div class="card-body">
              <div class="row align-items-center g-3">
                <div class="col-md-5">
                  <div class="fw-bold">{{ t.vehicle.operator }}</div>
                  <div class="text-muted small">{{ t.vehicle.name }} · <span class="badge text-bg-light border">{{ typeLabel(t.vehicle.vehicleType) }}</span></div>
                  @if (t.vehicle.amenities?.length) { <div class="mt-1">@for (a of t.vehicle.amenities; track a) { <span class="badge text-bg-secondary me-1">{{ a }}</span> }</div> }
                  @if (t.route.stops?.length) { <div class="small text-muted mt-1">Via: {{ stops(t) }}</div> }
                </div>
                <div class="col-6 col-md-3 text-md-center">
                  <div class="fs-5 fw-semibold">{{ time(t.departureAt) }} → {{ time(t.arrivalAt) }}</div>
                  <div class="small text-muted">{{ dur(t.durationMin) }} · {{ day(t.departureAt) }}</div>
                </div>
                <div class="col-6 col-md-2 text-end text-md-center">
                  <div class="fw-bold text-primary">{{ money(t.fareFrom) }}@if (t.fareTo > t.fareFrom) { <span class="small"> – {{ money(t.fareTo) }}</span> }</div>
                  <div class="small" [class.text-danger]="t.availableSeats<=3">{{ t.availableSeats }} seat{{ t.availableSeats===1?'':'s' }} left</div>
                </div>
                <div class="col-12 col-md-2 d-grid">
                  <a class="btn btn-primary" [class.disabled]="!t.availableSeats" [routerLink]="['/trip', t._id]">{{ t.availableSeats ? 'Select seats' : 'Sold out' }}</a>
                </div>
              </div>
            </div></div>
          }
        }
      </section>
    </div>
  </div>`,
})
export class SearchComponent implements OnChanges {
  private api = inject(ApiService);
  @Input() from = ''; @Input() to = ''; @Input() date = ''; @Input() type = '';
  all = signal<any[]>([]); loading = signal(true); error = signal('');
  fTime = ''; fPrice: number | null = null; fSeats: number | null = null; fType = ''; fAm: string[] = [];
  types = Object.entries(VEHICLE_TYPE_LABELS);
  amenityOptions = ['AC', 'WiFi', 'Charging port', 'Water', 'TV', 'Toilet', 'Blanket', 'Reclining seats'];
  money = money; dur = duration; time = npTime; day = npDate;
  typeLabel = (t: string) => VEHICLE_TYPE_LABELS[t] || t;

  filtered() {
    return this.all().filter((t) => {
      const h = Number(new Date(t.departureAt).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', hour12: false }));
      if (this.fTime === 'morning' && h >= 12) return false;
      if (this.fTime === 'afternoon' && (h < 12 || h >= 18)) return false;
      if (this.fTime === 'evening' && h < 18) return false;
      if (this.fPrice && t.fareFrom > this.fPrice) return false;
      if (this.fSeats && t.availableSeats < this.fSeats) return false;
      if (this.fType && t.vehicle.vehicleType !== this.fType) return false;
      return this.fAm.every((a) => t.vehicle.amenities?.includes(a));
    });
  }

  ngOnChanges() {
    if (!this.from || !this.to || !this.date) return;
    this.fType = this.type || '';
    this.loading.set(true); this.error.set('');
    this.api.get<any[]>('/trips/search', { from: this.from, to: this.to, date: this.date }).subscribe({
      next: (r) => { this.all.set(r.data); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
  stops = (t: any) => t.route.stops.map((s: any) => s.city).join(' → ');
  toggleAm(a: string) { this.fAm = this.fAm.includes(a) ? this.fAm.filter((x) => x !== a) : [...this.fAm, a] }
  reset() { this.fTime = ''; this.fPrice = null; this.fSeats = null; this.fType = ''; this.fAm = [] }
}
