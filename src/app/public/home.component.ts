import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { VEHICLE_TYPE_LABELS } from '../core/models';
import { todayNp } from '../core/util';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section class="hero">
    <div class="container">
      <h1 class="display-5 fw-bold">Book bus, HiAce, van & car seats across Nepal</h1>
      <p class="lead mb-0">Pick your exact seat on the real vehicle layout. Pay online or at any counter.</p>
    </div>
  </section>
  <div class="container" style="margin-top:-4rem">
    <form class="card p-3 p-md-4" [formGroup]="f" (ngSubmit)="go()">
      <div class="row g-3 align-items-end">
        <div class="col-12 col-md-3"><label class="form-label" for="from">From</label>
          <input id="from" class="form-control" list="cities" formControlName="from" placeholder="e.g. Kathmandu" autocomplete="off"
                 [class.is-invalid]="bad('from')"></div>
        <div class="col-12 col-md-3"><label class="form-label" for="to">To</label>
          <input id="to" class="form-control" list="cities" formControlName="to" placeholder="e.g. Pokhara" autocomplete="off"
                 [class.is-invalid]="bad('to')"></div>
        <div class="col-6 col-md-2"><label class="form-label" for="date">Travel date</label>
          <input id="date" type="date" class="form-control" formControlName="date" [min]="today" [class.is-invalid]="bad('date')"></div>
        <div class="col-6 col-md-2"><label class="form-label" for="type">Vehicle</label>
          <select id="type" class="form-select" formControlName="type"><option value="">Any</option>
            @for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select></div>
        <div class="col-12 col-md-2 d-grid"><button class="btn btn-primary btn-lg" type="submit"><i class="bi bi-search"></i> Search</button></div>
      </div>
      <datalist id="cities">@for (c of cities(); track c) { <option [value]="c"></option> }</datalist>
      @if (f.errors?.['same']) { <div class="text-danger small mt-2">Departure and destination must be different.</div> }
    </form>

    <div class="row g-3 my-4 text-center">
      @for (x of features; track x.t) {
        <div class="col-6 col-lg-3"><div class="card h-100 p-3"><i class="bi fs-1 text-primary" [ngClass]="x.i"></i><div class="fw-semibold mt-2">{{ x.t }}</div><div class="small text-muted">{{ x.d }}</div></div></div>
      }
    </div>
  </div>`,
})
export class HomeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  today = todayNp();
  cities = signal<string[]>([]);
  types = Object.entries(VEHICLE_TYPE_LABELS);
  features = [
    { i: 'bi-grid-3x3-gap', t: 'Choose your seat', d: 'See the real layout of the vehicle' },
    { i: 'bi-shield-check', t: 'Secure payment', d: 'eSewa & Khalti, verified on our server' },
    { i: 'bi-qr-code', t: 'QR tickets', d: 'Show your ticket on your phone' },
    { i: 'bi-shop', t: 'Counters nationwide', d: 'Book or collect at any counter' },
  ];
  f = this.fb.nonNullable.group({
    from: ['', [Validators.required, Validators.maxLength(60)]], to: ['', [Validators.required, Validators.maxLength(60)]],
    date: [todayNp(), Validators.required], type: [''],
  }, { validators: (g) => (g.value.from && g.value.to && g.value.from.trim().toLowerCase() === g.value.to.trim().toLowerCase() ? { same: true } : null) });

  ngOnInit() { this.api.get<string[]>('/routes/cities').subscribe({ next: (r) => this.cities.set(r.data), error: () => {} }); }
  bad(n: 'from' | 'to' | 'date') { const c = this.f.controls[n]; return c.invalid && c.touched; }
  go() {
    if (this.f.invalid) { this.f.markAllAsTouched(); return; }
    const v = this.f.getRawValue();
    this.router.navigate(['/search'], { queryParams: { from: v.from.trim(), to: v.to.trim(), date: v.date, ...(v.type ? { type: v.type } : {}) } });
  }
}
