import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { npDateTime } from '../core/util';
import { PagerComponent } from '../shared/pager.component';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, PagerComponent],
  template: `
  <h4 class="mb-3">Audit log</h4>
  <div class="row g-2 mb-3"><div class="col-6 col-md-3"><input class="form-control" placeholder="Action prefix (e.g. booking.)" [(ngModel)]="action" (keyup.enter)="load(1)" aria-label="Action"></div>
    <div class="col-6 col-md-3"><select class="form-select" [(ngModel)]="entity" (ngModelChange)="load(1)" aria-label="Entity"><option value="">All entities</option>@for (e of entities; track e) { <option [value]="e">{{ e }}</option> }</select></div>
    <div class="col-12 col-md-2"><button class="btn btn-outline-primary w-100" (click)="load(1)">Filter</button></div></div>
  <div class="card table-responsive"><table class="table table-sm table-hover mb-0"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th><th>Details</th></tr></thead>
    <tbody>@for (a of items(); track a._id) { <tr><td class="text-nowrap">{{ dt(a.createdAt) }}</td><td>{{ a.actorId?.name || '—' }}<div class="small text-muted">{{ a.actorRole }}</div></td><td>{{ a.action }}</td><td>{{ a.entity }}<div class="small text-muted text-truncate" style="max-width:120px">{{ a.entityId }}</div></td><td>{{ a.ip }}</td>
      <td class="small"><code>{{ a.details | json }}</code></td></tr> } @empty { <tr><td colspan="6" class="text-center text-muted py-4">No entries.</td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="30" [total]="total()" (go)="load($event)" />`,
})
export class AdminAuditComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); page = signal(1); total = signal(0); action = ''; entity = ''; dt = npDateTime;
  entities = ['Booking', 'Trip', 'Vehicle', 'VehicleLayout', 'Route', 'User', 'Counter', 'Refund', 'Setting'];
  ngOnInit() { this.load(1); }
  load(p: number) { this.api.get<any[]>('/audit-logs', { page: p, limit: 30, action: this.action, entity: this.entity }).subscribe((r) => { this.items.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); }); }
}
