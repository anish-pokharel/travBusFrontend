import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { notify, npDate } from '../core/util';
import { ModalComponent } from '../shared/modal.component';
import { PagerComponent } from '../shared/pager.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, PagerComponent, StatusBadgeComponent],
  template: `
  <div class="d-flex justify-content-between mb-3"><h4 class="mb-0">Users</h4><button class="btn btn-primary" (click)="edit(null)"><i class="bi bi-plus-lg"></i> New user</button></div>
  <div class="card p-3 mb-3"><div class="row g-2">
    <div class="col-8 col-md-5"><input class="form-control" placeholder="Search name, email, phone" [(ngModel)]="search" (keyup.enter)="load(1)" aria-label="Search"></div>
    <div class="col-4 col-md-3"><select class="form-select" [(ngModel)]="role" (ngModelChange)="load(1)" aria-label="Role"><option value="">All roles</option><option value="admin">Admin</option><option value="counter">Counter staff</option><option value="passenger">Passenger</option></select></div>
    <div class="col-12 col-md-2"><button class="btn btn-outline-primary w-100" (click)="load(1)">Search</button></div></div></div>
  <div class="card table-responsive"><table class="table table-hover mb-0">
    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Counter</th><th>Status</th><th>Joined</th><th></th></tr></thead>
    <tbody>@for (u of items(); track u.id) {
      <tr><td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.phone }}</td><td class="text-capitalize">{{ u.role }}</td><td>{{ u.counter?.name }}</td>
        <td><app-badge [value]="u.isActive ? 'active' : 'inactive'" /></td><td>{{ day(u.createdAt) }}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary me-1" (click)="edit(u)">Edit</button>
          @if (u.id !== me.user()?.id) { <button class="btn btn-sm btn-outline-danger" (click)="deactivate(u)" [disabled]="!u.isActive">Deactivate</button> }</td></tr>
    } @empty { <tr><td colspan="8" class="text-center text-muted py-4">No users.</td></tr> }</tbody></table></div>
  <app-pager [page]="page()" [limit]="20" [total]="total()" (go)="load($event)" />

  <app-modal [open]="show()" [title]="editing() ? 'Edit user' : 'New user'" (closed)="show.set(false)">
    <form id="uf" [formGroup]="f" (ngSubmit)="save()">
      <div class="mb-2"><label class="form-label" for="un">Name</label><input id="un" class="form-control" formControlName="name"></div>
      <div class="mb-2"><label class="form-label" for="ue">Email</label><input id="ue" type="email" class="form-control" formControlName="email" [attr.disabled]="editing() ? '' : null"></div>
      <div class="mb-2"><label class="form-label" for="up">Phone</label><input id="up" class="form-control" formControlName="phone"></div>
      <div class="mb-2"><label class="form-label" for="ur">Role</label><select id="ur" class="form-select" formControlName="role"><option value="passenger">Passenger</option><option value="counter">Counter staff</option><option value="admin">Admin</option></select></div>
      @if (f.value.role === 'counter') { <div class="mb-2"><label class="form-label" for="uc">Counter</label><select id="uc" class="form-select" formControlName="counterId"><option value="">Select counter…</option>@for (c of counters(); track c._id) { <option [value]="c._id">{{ c.name }}</option> }</select></div> }
      <div class="mb-2"><label class="form-label" for="upw">{{ editing() ? 'New password (leave blank to keep)' : 'Password' }}</label><input id="upw" type="password" class="form-control" formControlName="password" autocomplete="new-password"></div>
      @if (editing()) { <div class="form-check"><input id="ua" type="checkbox" class="form-check-input" formControlName="isActive"><label class="form-check-label" for="ua">Account active</label></div> }
    </form>
    <div footer><button class="btn btn-secondary" (click)="show.set(false)">Cancel</button><button class="btn btn-primary" form="uf" [disabled]="f.invalid">Save</button></div>
  </app-modal>`,
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService); private fb = inject(FormBuilder); me = inject(AuthService);
  items = signal<any[]>([]); counters = signal<any[]>([]); page = signal(1); total = signal(0);
  search = ''; role = ''; day = npDate;
  show = signal(false); editing = signal<any>(null);
  f = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]], email: ['', [Validators.required, Validators.email]], phone: ['', Validators.pattern(/^[0-9+\-\s]{7,20}$/)],
    role: ['passenger'], counterId: [''], password: [''], isActive: [true],
  });
  ngOnInit() { this.load(1); this.api.get<any[]>('/counters').subscribe((r) => this.counters.set(r.data)); }
  load(p: number) { this.api.get<any[]>('/users', { page: p, limit: 20, search: this.search, role: this.role }).subscribe((r) => { this.items.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); }); }
  edit(u: any) {
    this.editing.set(u);
    this.f.reset({ name: u?.name || '', email: u?.email || '', phone: u?.phone || '', role: u?.role || 'passenger', counterId: u?.counterId?._id || u?.counter?._id || u?.counterId || '', password: '', isActive: u?.isActive ?? true });
    this.f.controls.password.setValidators(u ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]);
    this.f.controls.password.updateValueAndValidity();
    this.show.set(true);
  }
  save() {
    const v = this.f.getRawValue(); const u = this.editing();
    const body: any = { name: v.name, phone: v.phone || undefined, role: v.role, counterId: v.role === 'counter' ? v.counterId : undefined };
    if (v.password) body.password = v.password;
    const req = u ? this.api.patch(`/users/${u.id}`, { ...body, isActive: v.isActive }) : this.api.post('/users', { ...body, email: v.email, password: v.password });
    req.subscribe({ next: () => { this.show.set(false); notify.success('Saved'); this.load(this.page()); }, error: (e) => notify.error(e, 'Could not save user') });
  }
  async deactivate(u: any) {
    if (!(await notify.confirmDanger(`Deactivate ${u.name}?`, 'They will be logged out and cannot sign in. Booking history is kept.'))) return;
    this.api.delete(`/users/${u.id}`).subscribe({ next: () => { notify.toast('User deactivated'); this.load(this.page()); }, error: (e) => notify.error(e) });
  }
}
