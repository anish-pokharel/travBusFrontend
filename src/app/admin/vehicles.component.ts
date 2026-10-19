import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Layout, VEHICLE_TYPE_LABELS } from '../core/models';
import { notify } from '../core/util';
import { ModalComponent } from '../shared/modal.component';
import { PagerComponent } from '../shared/pager.component';
import { SeatMapComponent } from '../shared/seat-map/seat-map.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ModalComponent, PagerComponent, SeatMapComponent, StatusBadgeComponent],
  template: `
  <div class="d-flex justify-content-between mb-3"><h4 class="mb-0">Vehicles</h4><button class="btn btn-primary" (click)="edit(null)"><i class="bi bi-plus-lg"></i> Add vehicle</button></div>
  <div class="card p-3 mb-3"><div class="row g-2">
    <div class="col-12 col-md-4"><input class="form-control" placeholder="Search name / reg. no. / operator" [(ngModel)]="search" (keyup.enter)="load(1)" aria-label="Search"></div>
    <div class="col-6 col-md-3"><select class="form-select" [(ngModel)]="type" (ngModelChange)="load(1)" aria-label="Type"><option value="">All types</option>@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select></div>
    <div class="col-6 col-md-3"><select class="form-select" [(ngModel)]="status" (ngModelChange)="load(1)" aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    <div class="col-12 col-md-2"><button class="btn btn-outline-primary w-100" (click)="load(1)">Search</button></div></div></div>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>Name</th><th>Reg. no.</th><th>Operator</th><th>Type</th><th>Layout</th><th>Seats</th><th>Status</th><th></th></tr></thead>
    <tbody>@for (v of items(); track v._id) {
      <tr><td>{{ v.name }}</td><td>{{ v.registrationNumber }}</td><td>{{ v.operator }}</td><td>{{ label(v.vehicleType) }}</td>
        <td>{{ v.layoutId?.name || '—' }} @if (v.layoutId) { <small class="text-muted">v{{ v.layoutId.version }}</small> }</td><td>{{ v.seatCapacity }}</td>
        <td><app-badge [value]="v.status" /></td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary me-1" [disabled]="!v.layoutId" (click)="preview(v)">Layout</button>
          <button class="btn btn-sm btn-outline-primary me-1" (click)="edit(v)">Edit</button>
          <button class="btn btn-sm" [ngClass]="v.status==='active' ? 'btn-outline-danger' : 'btn-outline-success'" (click)="toggle(v)">{{ v.status==='active' ? 'Deactivate' : 'Activate' }}</button></td></tr>
    } @empty { <tr><td colspan="8" class="text-center text-muted py-4">No vehicles yet.</td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="20" [total]="total()" (go)="load($event)" />

  <app-modal [open]="show()" [title]="editing() ? 'Edit vehicle' : 'Add vehicle'" size="lg" (closed)="show.set(false)">
    <form id="vf" [formGroup]="f" (ngSubmit)="save()" class="row g-2">
      <div class="col-md-6"><label class="form-label" for="vn">Name *</label><input id="vn" class="form-control" formControlName="name"></div>
      <div class="col-md-6"><label class="form-label" for="vr">Registration number *</label><input id="vr" class="form-control text-uppercase" formControlName="registrationNumber" placeholder="e.g. LU 1 KHA 1234"></div>
      <div class="col-md-6"><label class="form-label" for="vo">Operator *</label><input id="vo" class="form-control" formControlName="operator"></div>
      <div class="col-md-6"><label class="form-label" for="vt">Vehicle type *</label><select id="vt" class="form-select" formControlName="vehicleType">@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select></div>
      <div class="col-12"><label class="form-label" for="vl">Seat layout</label>
        <select id="vl" class="form-select" formControlName="layoutId"><option value="">— none (cannot be scheduled) —</option>@for (l of layouts(); track l._id) { <option [value]="l._id">{{ l.name }} · v{{ l.version }} · {{ l.bookableSeats }} seats · {{ label(l.vehicleType) }}</option> }</select>
        <div class="form-text">Design layouts in <a routerLink="/admin/layouts" (click)="show.set(false)">Seat Layouts</a>. Seat capacity comes from the layout.</div></div>
      <div class="col-12"><label class="form-label">Amenities</label><div class="d-flex flex-wrap gap-3">
        @for (a of amenityOptions; track a) { <div class="form-check"><input type="checkbox" class="form-check-input" [id]="'a-'+a" [checked]="am().includes(a)" (change)="toggleAm(a)"><label class="form-check-label" [for]="'a-'+a">{{ a }}</label></div> }</div></div>
      <div class="col-12"><label class="form-label" for="vi">Notes</label><textarea id="vi" rows="2" class="form-control" formControlName="info"></textarea></div>
    </form>
    <div footer><button class="btn btn-secondary" (click)="show.set(false)">Cancel</button><button class="btn btn-primary" form="vf" [disabled]="f.invalid">Save</button></div>
  </app-modal>

  <app-modal [open]="!!prev()" title="Assigned seat layout" size="lg" (closed)="prev.set(null)">
    @if (prev(); as l) { <div class="text-center overflow-auto"><div class="fw-semibold mb-2">{{ l.name }} — {{ l.bookableSeats }} bookable seats</div><app-seat-map [layout]="l" [interactive]="false" [showLegend]="false" /></div> }
  </app-modal>`,
})
export class AdminVehiclesComponent implements OnInit {
  private api = inject(ApiService); private fb = inject(FormBuilder);
  items = signal<any[]>([]); layouts = signal<any[]>([]); page = signal(1); total = signal(0);
  search = ''; type = ''; status = '';
  types = Object.entries(VEHICLE_TYPE_LABELS); label = (t: string) => VEHICLE_TYPE_LABELS[t] || t;
  amenityOptions = ['AC', 'WiFi', 'Charging port', 'Water', 'TV', 'Toilet', 'Blanket', 'Reclining seats'];
  show = signal(false); editing = signal<any>(null); am = signal<string[]>([]); prev = signal<Layout | null>(null);
  f = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], registrationNumber: ['', [Validators.required, Validators.minLength(3)]],
    operator: ['', [Validators.required, Validators.minLength(2)]], vehicleType: ['bus'], layoutId: [''], info: [''] });

  ngOnInit() { this.load(1); this.api.get<any[]>('/vehicle-layouts', { latestOnly: true }).subscribe((r) => this.layouts.set(r.data)); }
  load(p: number) { this.api.get<any[]>('/vehicles', { page: p, limit: 20, search: this.search, type: this.type, status: this.status }).subscribe((r) => { this.items.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); }); }
  toggleAm(a: string) { this.am.update((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a])); }
  edit(v: any) {
    this.editing.set(v); this.am.set(v?.amenities || []);
    this.f.reset({ name: v?.name || '', registrationNumber: v?.registrationNumber || '', operator: v?.operator || '', vehicleType: v?.vehicleType || 'bus', layoutId: v?.layoutId?._id || '', info: v?.info || '' });
    this.show.set(true);
  }
  save() {
    const v = this.f.getRawValue();
    const body = { ...v, layoutId: v.layoutId || undefined, amenities: this.am() };
    const v0 = this.editing();
    (v0 ? this.api.patch(`/vehicles/${v0._id}`, body) : this.api.post('/vehicles', body)).subscribe({
      next: () => { this.show.set(false); notify.success('Vehicle saved'); this.load(this.page()); }, error: (e) => notify.error(e, 'Could not save vehicle'),
    });
  }
  async toggle(v: any) {
    const next = v.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !(await notify.confirmDanger(`Deactivate ${v.name}?`, 'It will no longer appear in new trips.'))) return;
    this.api.patch(`/vehicles/${v._id}/status`, { status: next }).subscribe({ next: () => this.load(this.page()), error: (e) => notify.error(e) });
  }
  preview(v: any) { this.api.get<Layout>(`/vehicle-layouts/${v.layoutId._id}`).subscribe((r) => this.prev.set(r.data)); }
}
