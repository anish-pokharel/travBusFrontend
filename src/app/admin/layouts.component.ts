import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { VEHICLE_TYPE_LABELS } from '../core/models';
import { notify } from '../core/util';

@Component({
  selector: 'app-admin-layouts',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3"><h4 class="mb-0">Seat layouts</h4>
    <div class="d-flex gap-2"><a class="btn btn-outline-primary" routerLink="/admin/layouts/new"><i class="bi bi-plus-lg"></i> Blank layout</a>
      <div class="dropdown"><button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown">New from template</button>
        <ul class="dropdown-menu dropdown-menu-end">@for (t of templates(); track t.key) { <li><a class="dropdown-item" [routerLink]="['/admin/layouts/new']" [queryParams]="{template: t.key}">{{ t.label }}</a></li> }</ul></div></div></div>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>Name</th><th>Type</th><th>Version</th><th>Grid</th><th>Bookable seats</th><th></th></tr></thead>
    <tbody>@for (l of items(); track l._id) {
      <tr><td>{{ l.name }}</td><td>{{ label(l.vehicleType) }}</td><td>v{{ l.version }}</td><td>{{ l.rows }} × {{ l.columns }}</td><td>{{ l.bookableSeats }} <small class="text-muted">/ {{ l.totalSeats }}</small></td>
        <td class="text-nowrap"><a class="btn btn-sm btn-outline-primary me-1" [routerLink]="['/admin/layouts', l._id]">Edit</a>
          <button class="btn btn-sm btn-outline-secondary me-1" (click)="dup(l)">Duplicate</button><button class="btn btn-sm btn-outline-danger" (click)="archive(l)">Archive</button></td></tr>
    } @empty { <tr><td colspan="6" class="text-center text-muted py-4">No layouts yet. Start from a template.</td></tr> }</tbody></table></div>
  <p class="text-muted small mt-2">Editing a layout that is already used by trips creates a new version; existing trips keep their original seat map.</p>`,
})
export class AdminLayoutsComponent implements OnInit {
  private api = inject(ApiService); private router = inject(Router);
  items = signal<any[]>([]); templates = signal<{ key: string; label: string }[]>([]);
  label = (t: string) => VEHICLE_TYPE_LABELS[t] || t;
  ngOnInit() { this.load(); this.api.get<any[]>('/vehicle-layouts/templates').subscribe((r) => this.templates.set(r.data)); }
  load() { this.api.get<any[]>('/vehicle-layouts', { latestOnly: true }).subscribe((r) => this.items.set(r.data)); }
  dup(l: any) { this.api.post<any>(`/vehicle-layouts/${l._id}/duplicate`).subscribe({ next: (r) => this.router.navigate(['/admin/layouts', r.data._id]), error: (e) => notify.error(e) }); }
  async archive(l: any) {
    if (!(await notify.confirmDanger(`Archive "${l.name}"?`, 'Archived layouts cannot be assigned to vehicles.'))) return;
    this.api.delete(`/vehicle-layouts/${l._id}`).subscribe({ next: () => { notify.toast('Layout archived'); this.load(); }, error: (e) => notify.error(e, 'Cannot archive') });
  }
}
