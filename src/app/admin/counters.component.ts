import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { money, notify } from '../core/util';
import { ModalComponent } from '../shared/modal.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-counters',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, StatusBadgeComponent],
  template: `
  <div class="d-flex justify-content-between mb-3"><h4 class="mb-0">Counters & staff</h4><button class="btn btn-primary" (click)="edit(null)"><i class="bi bi-plus-lg"></i> Add counter</button></div>
  <div class="row g-3">@for (c of items(); track c._id) {
    <div class="col-md-6 col-xl-4"><div class="card p-3 h-100">
      <div class="d-flex justify-content-between"><div><div class="fw-bold">{{ c.name }}</div><div class="small text-muted">{{ c.code }} · {{ c.city }}</div></div><app-badge [value]="c.status" /></div>
      <div class="small mt-1">{{ c.address }} {{ c.phone ? '· ' + c.phone : '' }}</div>
      <div class="small mt-2"><b>Staff:</b> @for (s of c.staff; track s._id) { <span class="badge text-bg-light border me-1">{{ s.name }}</span> } @if (!c.staff.length) { <span class="text-muted">none assigned</span> }</div>
      @if (stats()[c._id]; as st) { <div class="small mt-2 border-top pt-2">Today: {{ st.ticketsSold }} tickets · {{ money(st.sales) }} · cash {{ money(st.cashCollected) }}</div> }
      <div class="mt-auto pt-2 d-flex gap-1 flex-wrap"><button class="btn btn-sm btn-outline-primary" (click)="edit(c)">Edit</button><button class="btn btn-sm btn-outline-secondary" (click)="assign(c)">Assign staff</button><button class="btn btn-sm btn-outline-info" (click)="loadStats(c)">Today's sales</button></div>
    </div></div>
  } @empty { <div class="col-12"><div class="card p-4 text-center text-muted">No counters yet.</div></div> }</div>

  <app-modal [open]="show()" [title]="editing() ? 'Edit counter' : 'Add counter'" (closed)="show.set(false)">
    <form id="cf" [formGroup]="f" (ngSubmit)="save()" class="row g-2">
      <div class="col-8"><label class="form-label" for="cn">Name *</label><input id="cn" class="form-control" formControlName="name"></div>
      <div class="col-4"><label class="form-label" for="cc">Code *</label><input id="cc" class="form-control text-uppercase" formControlName="code" maxlength="12"></div>
      <div class="col-6"><label class="form-label" for="cy">City</label><input id="cy" class="form-control" formControlName="city"></div>
      <div class="col-6"><label class="form-label" for="cph">Phone</label><input id="cph" class="form-control" formControlName="phone"></div>
      <div class="col-12"><label class="form-label" for="ca">Address</label><input id="ca" class="form-control" formControlName="address"></div>
      <div class="col-6"><label class="form-label" for="ce">Email</label><input id="ce" type="email" class="form-control" formControlName="email"></div>
      <div class="col-6"><label class="form-label" for="cs">Status</label><select id="cs" class="form-select" formControlName="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    </form>
    <div footer><button class="btn btn-secondary" (click)="show.set(false)">Cancel</button><button class="btn btn-primary" form="cf" [disabled]="f.invalid">Save</button></div>
  </app-modal>

  <app-modal [open]="!!asg()" [title]="'Assign staff to ' + (asg()?.name || '')" (closed)="asg.set(null)">
    <label class="form-label" for="as">Counter staff user</label>
    <select id="as" class="form-select" [(ngModel)]="staffId"><option value="">Select…</option>@for (u of staff(); track u.id) { <option [value]="u.id">{{ u.name }} ({{ u.email }})</option> }</select>
    <div class="form-text">Create counter staff accounts in Users (role: Counter staff). A staff member belongs to one counter at a time.</div>
    <div footer><button class="btn btn-secondary" (click)="asg.set(null)">Cancel</button><button class="btn btn-primary" [disabled]="!staffId" (click)="doAssign()">Assign</button></div>
  </app-modal>`,
})
export class AdminCountersComponent implements OnInit {
  private api = inject(ApiService); private fb = inject(FormBuilder);
  items = signal<any[]>([]); show = signal(false); editing = signal<any>(null); asg = signal<any>(null); staff = signal<any[]>([]); staffId = ''; stats = signal<Record<string, any>>({}); money = money;
  f = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], code: ['', [Validators.required, Validators.minLength(2)]], city: [''], address: [''], phone: ['', Validators.pattern(/^[0-9+\-\s]{7,20}$/)], email: ['', Validators.email], status: ['active'] });
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/counters').subscribe((r) => this.items.set(r.data)); }
  edit(c: any) { this.editing.set(c); this.f.reset({ name: c?.name || '', code: c?.code || '', city: c?.city || '', address: c?.address || '', phone: c?.phone || '', email: c?.email || '', status: c?.status || 'active' }); this.show.set(true); }
  save() {
    const c = this.editing(); const body = this.f.getRawValue();
    (c ? this.api.patch(`/counters/${c._id}`, body) : this.api.post('/counters', body)).subscribe({ next: () => { this.show.set(false); notify.success('Counter saved'); this.load(); }, error: (e) => notify.error(e, 'Could not save counter') });
  }
  assign(c: any) { this.asg.set(c); this.staffId = ''; this.api.get<any[]>('/users', { role: 'counter', limit: 100 }).subscribe((r) => this.staff.set(r.data.filter((u) => u.isActive))); }
  doAssign() { this.api.post(`/counters/${this.asg()._id}/staff`, { userId: this.staffId }).subscribe({ next: () => { this.asg.set(null); notify.success('Staff assigned'); this.load(); }, error: (e) => notify.error(e) }); }
  loadStats(c: any) { this.api.get<any>(`/counters/${c._id}/stats`).subscribe((r) => this.stats.update((s) => ({ ...s, [c._id]: r.data }))); }
}
