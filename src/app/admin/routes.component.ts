import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { duration, notify } from '../core/util';
import { ModalComponent } from '../shared/modal.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-routes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, StatusBadgeComponent],
  template: `
  <div class="d-flex justify-content-between mb-3"><h4 class="mb-0">Routes</h4><button class="btn btn-primary" (click)="edit(null)"><i class="bi bi-plus-lg"></i> Add route</button></div>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>Route</th><th>Distance</th><th>Duration</th><th>Stops</th><th>Status</th><th></th></tr></thead>
    <tbody>@for (r of items(); track r._id) {
      <tr><td class="fw-semibold">{{ r.departureCity }} → {{ r.destinationCity }}</td><td>{{ r.distanceKm }} km</td><td>{{ dur(r.durationMin) }}</td>
        <td class="small">{{ stopsText(r) }}</td><td><app-badge [value]="r.status" /></td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary me-1" (click)="edit(r)">Edit</button><button class="btn btn-sm btn-outline-danger" (click)="remove(r)">Delete</button></td></tr>
    } @empty { <tr><td colspan="6" class="text-center text-muted py-4">No routes yet.</td></tr> }</tbody></table></div>

  <app-modal [open]="show()" [title]="editing() ? 'Edit route' : 'Add route'" size="lg" (closed)="show.set(false)">
    <form id="rf" [formGroup]="f" (ngSubmit)="save()" class="row g-2">
      <div class="col-md-6"><label class="form-label" for="rd">Departure city *</label><input id="rd" class="form-control" formControlName="departureCity"></div>
      <div class="col-md-6"><label class="form-label" for="rt">Destination city *</label><input id="rt" class="form-control" formControlName="destinationCity"></div>
      <div class="col-6"><label class="form-label" for="rk">Distance (km)</label><input id="rk" type="number" min="0" class="form-control" formControlName="distanceKm"></div>
      <div class="col-6"><label class="form-label" for="rm">Duration (minutes) *</label><input id="rm" type="number" min="1" class="form-control" formControlName="durationMin"></div>
      <div class="col-12"><label class="form-label" for="rs">Status</label><select id="rs" class="form-select" formControlName="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div class="col-12"><div class="d-flex justify-content-between align-items-center"><label class="form-label mb-0">Intermediate stops (in order)</label><button type="button" class="btn btn-sm btn-outline-primary" (click)="addStop()">Add stop</button></div>
        <div class="small text-muted mb-1">Times are minutes after departure.</div>
        <div formArrayName="stops">@for (g of stops.controls; track $index) {
          <div class="row g-1 mb-1" [formGroupName]="$index">
            <div class="col-4"><input class="form-control form-control-sm" placeholder="City" formControlName="city" aria-label="Stop city"></div>
            <div class="col-2"><input type="number" min="0" class="form-control form-control-sm" placeholder="Arr." formControlName="arrivalOffsetMin" aria-label="Arrival offset"></div>
            <div class="col-2"><input type="number" min="0" class="form-control form-control-sm" placeholder="Dep." formControlName="departureOffsetMin" aria-label="Departure offset"></div>
            <div class="col-3"><input type="number" min="0" class="form-control form-control-sm" placeholder="km" formControlName="distanceFromStartKm" aria-label="Distance from start"></div>
            <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger w-100" (click)="stops.removeAt($index)" aria-label="Remove stop"><i class="bi bi-x"></i></button></div></div> }</div></div>
    </form>
    <div footer><button class="btn btn-secondary" (click)="show.set(false)">Cancel</button><button class="btn btn-primary" form="rf" [disabled]="f.invalid">Save</button></div>
  </app-modal>`,
})
export class AdminRoutesComponent implements OnInit {
  private api = inject(ApiService); private fb = inject(FormBuilder);
  items = signal<any[]>([]); show = signal(false); editing = signal<any>(null); dur = duration;
  f = this.fb.nonNullable.group({
    departureCity: ['', [Validators.required, Validators.minLength(2)]], destinationCity: ['', [Validators.required, Validators.minLength(2)]],
    distanceKm: [0], durationMin: [60, [Validators.required, Validators.min(1)]], status: ['active'], stops: this.fb.array<any>([]),
  });
  get stops() { return this.f.controls.stops as FormArray; }
  stopsText = (r: any) => (r.stops || []).map((s: any) => s.city).join(', ') || '—';
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/routes').subscribe((r) => this.items.set(r.data)); }
  private stopGroup(s?: any) { return this.fb.nonNullable.group({ city: [s?.city || '', Validators.required], arrivalOffsetMin: [s?.arrivalOffsetMin ?? 0], departureOffsetMin: [s?.departureOffsetMin ?? 0], distanceFromStartKm: [s?.distanceFromStartKm ?? 0] }); }
  addStop() { this.stops.push(this.stopGroup()); }
  edit(r: any) {
    this.editing.set(r); this.stops.clear();
    (r?.stops || []).forEach((s: any) => this.stops.push(this.stopGroup(s)));
    this.f.patchValue({ departureCity: r?.departureCity || '', destinationCity: r?.destinationCity || '', distanceKm: r?.distanceKm || 0, durationMin: r?.durationMin || 60, status: r?.status || 'active' });
    this.show.set(true);
  }
  save() {
    const body = this.f.getRawValue(); const r = this.editing();
    (r ? this.api.patch(`/routes/${r._id}`, body) : this.api.post('/routes', body)).subscribe({
      next: () => { this.show.set(false); notify.success('Route saved'); this.load(); }, error: (e) => notify.error(e, 'Could not save route'),
    });
  }
  async remove(r: any) {
    if (!(await notify.confirmDanger(`Delete ${r.departureCity} → ${r.destinationCity}?`, 'Routes that already have trips cannot be deleted; deactivate them instead.'))) return;
    this.api.delete(`/routes/${r._id}`).subscribe({ next: () => { notify.toast('Route deleted'); this.load(); }, error: (e) => notify.error(e) });
  }
}
