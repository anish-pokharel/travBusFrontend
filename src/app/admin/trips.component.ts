import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { money, notify, npDateTime } from '../core/util';
import { ModalComponent } from '../shared/modal.component';
import { PagerComponent } from '../shared/pager.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-trips',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ModalComponent,
    PagerComponent,
    StatusBadgeComponent,
  ],
  template: ` <div class="d-flex justify-content-between mb-3">
      <h4 class="mb-0">Trips & schedule</h4>
      <button class="btn btn-primary" (click)="open()">
        <i class="bi bi-plus-lg"></i> Schedule trip
      </button>
    </div>
    <div class="card p-3 mb-3">
      <div class="row g-2">
        <div class="col-6 col-md-3">
          <input
            type="date"
            class="form-control"
            [(ngModel)]="date"
            (ngModelChange)="load(1)"
            aria-label="Date"
          />
        </div>
        <div class="col-6 col-md-3">
          <select
            class="form-select"
            [(ngModel)]="status"
            (ngModelChange)="load(1)"
            aria-label="Status"
          >
            <option value="">Any status</option>
            <option value="scheduled">Scheduled</option>
            <option value="boarding">Boarding</option>
            <option value="departed">Departed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="col-12 col-md-2">
          <button
            class="btn btn-outline-secondary w-100"
            (click)="date = ''; status = ''; load(1)"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
    <div class="card table-responsive">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th>Departure</th>
            <th>Route</th>
            <th>Vehicle</th>
            <th>Fare</th>
            <th>Seats (free / booked)</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (t of items(); track t._id) {
            <tr>
              <td>{{ dt(t.departureAt) }}</td>
              <td>{{ t.routeId?.name }}</td>
              <td>
                {{ t.vehicleId?.name }}
                <div class="small text-muted">
                  {{ t.vehicleId?.registrationNumber }}
                </div>
              </td>
              <td>{{ money(t.fare?.base) }}</td>
              <td>
                {{ t.seatCounts?.available || 0 }} /
                {{ t.seatCounts?.booked || 0 }}
                @if (t.seatCounts?.held) {
                  <span class="text-muted small">
                    (+{{ t.seatCounts.held }} held)</span
                  >
                }
              </td>
              <td>
                <app-badge [value]="t.status" />
                @if (!t.bookingOpen && t.status === 'scheduled') {
                  <span class="badge text-bg-warning ms-1">closed</span>
                }
              </td>
              <td>
                <a
                  class="btn btn-sm btn-outline-primary"
                  [routerLink]="['/admin/trips', t._id]"
                  >Manage</a
                >
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted py-4">No trips.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager
      [page]="page()"
      [limit]="20"
      [total]="total()"
      (go)="load($event)"
    />

    <app-modal
      [open]="show()"
      title="Schedule a trip"
      (closed)="show.set(false)"
    >
      <form id="tf" [formGroup]="f" (ngSubmit)="save()">
        <div class="mb-2">
          <label class="form-label" for="tv">Vehicle *</label
          ><select
            id="tv"
            class="form-select"
            formControlName="vehicleId"
            (change)="vehicleChanged()"
          >
            <option value="">Select…</option>
            @for (v of vehicles(); track v._id) {
              <option [value]="v._id" [disabled]="!v.layoutId">
                {{ v.name }} ({{ v.registrationNumber }})
                {{
                  v.layoutId ? '· ' + v.seatCapacity + ' seats' : '· no layout'
                }}
              </option>
            }
          </select>
        </div>
        <div class="mb-2">
          <label class="form-label" for="tr">Route *</label
          ><select id="tr" class="form-select" formControlName="routeId">
            <option value="">Select…</option>
            @for (r of routes(); track r._id) {
              <option [value]="r._id">{{ r.name }}</option>
            }
          </select>
        </div>
        <div class="mb-2">
          <label class="form-label" for="td">Departure (date & time) *</label
          ><input
            id="td"
            type="datetime-local"
            class="form-control"
            formControlName="departureAt"
          />
        </div>
        <div class="mb-2">
          <label class="form-label" for="tb">Base fare (Rs.) *</label
          ><input
            id="tb"
            type="number"
            min="0"
            class="form-control"
            formControlName="base"
          />
        </div>
        @if (cats().length) {
          <div class="mb-2">
            <label class="form-label"
              >Fare by seat group (blank = base fare)</label
            >
            @for (c of cats(); track c) {
              <div class="input-group input-group-sm mb-1">
                <span class="input-group-text" style="min-width:130px">{{
                  c.replace('_', ' ')
                }}</span
                ><input
                  type="number"
                  min="0"
                  class="form-control"
                  [ngModel]="prices[c]"
                  (ngModelChange)="prices[c] = $event"
                  [ngModelOptions]="{ standalone: true }"
                  [attr.aria-label]="c + ' price'"
                />
              </div>
            }
          </div>
        }
      </form>
      <div footer>
        <button class="btn btn-secondary" (click)="show.set(false)">
          Cancel</button
        ><button
          class="btn btn-primary"
          form="tf"
          [disabled]="f.invalid || busy()"
        >
          Create trip
        </button>
      </div>
    </app-modal>`,
})
export class AdminTripsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  items = signal<any[]>([]);
  page = signal(1);
  total = signal(0);
  date = '';
  status = '';
  vehicles = signal<any[]>([]);
  routes = signal<any[]>([]);
  cats = signal<string[]>([]);
  prices: Record<string, any> = {};
  show = signal(false);
  busy = signal(false);
  money = money;
  dt = npDateTime;
  f = this.fb.nonNullable.group({
    vehicleId: ['', Validators.required],
    routeId: ['', Validators.required],
    departureAt: ['', Validators.required],
    base: [0, [Validators.required, Validators.min(0)]],
  });
  ngOnInit() {
    this.load(1);
  }
  load(p: number) {
    this.api
      .get<
        any[]
      >('/trips', { page: p, limit: 20, date: this.date, status: this.status })
      .subscribe((r) => {
        this.items.set(r.data);
        this.page.set(p);
        this.total.set(r.meta?.total || 0);
      });
  }
  open() {
    this.f.reset({ vehicleId: '', routeId: '', departureAt: '', base: 0 });
    this.prices = {};
    this.cats.set([]);
    this.api
      .get<any[]>('/vehicles', { status: 'active', limit: 100 })
      .subscribe((r) => this.vehicles.set(r.data));
    this.api
      .get<any[]>('/routes', { status: 'active' })
      .subscribe((r) => this.routes.set(r.data));
    this.show.set(true);
  }
  vehicleChanged() {
    const v = this.vehicles().find((x) => x._id === this.f.value.vehicleId);
    this.prices = {};
    this.cats.set([]);
    if (v?.layoutId?._id)
      this.api
        .get<any>(`/vehicle-layouts/${v.layoutId._id}`)
        .subscribe((r) =>
          this.cats.set([
            ...new Set<string>(r.data.seats.map((s: any) => s.pricingCategory)),
          ]),
        );
  }
  save() {
    const v = this.f.getRawValue();
    const categoryPrices: Record<string, number> = {};
    Object.entries(this.prices).forEach(([k, val]) => {
      if (val !== '' && val !== null && val !== undefined && Number(val) >= 0)
        categoryPrices[k] = Number(val);
    });
    this.busy.set(true);
    // this.api
    //   .post('/trips', {
    //     vehicleId: v.vehicleId,
    //     routeId: v.routeId,
    //     departureAt: new Date(v.departureAt).toISOString(),
    //     fare: { base: Number(v.base), categoryPrices },
    //   })
    //   .subscribe({

    const route = this.routes().find((r) => r._id === v.routeId);
    // const dep = new Date(v.departureAt);
    // const arr = new Date(dep.getTime() + (route?.durationMin || 60) * 60000);

// Temporarily force arrivalAt to be 5 hours after departure to test
const dep = new Date(v.departureAt);
const arr = new Date(dep.getTime() + 5 * 60 * 60 * 1000); // +5 hours

    this.api
      .post('/trips', {
        vehicleId: v.vehicleId,
        routeId: v.routeId,
        departureAt: dep.toISOString(),
        arrivalAt: arr.toISOString(),
        fare: { base: Number(v.base), categoryPrices },
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.show.set(false);
          notify.success('Trip scheduled');
          this.load(1);
        },
        error: (e) => {
          this.busy.set(false);
          notify.error(e, 'Could not schedule trip');
        },
      });
  }
}
