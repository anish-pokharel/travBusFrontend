import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errMsg, notify } from '../core/util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
  <h4 class="mb-3">My profile</h4>
  <div class="row g-3">
    <div class="col-lg-6"><form class="card p-3" [formGroup]="pf" (ngSubmit)="save()">
      <h6>Details</h6>
      <label class="form-label" for="pn">Name</label><input id="pn" class="form-control mb-2" formControlName="name">
      <label class="form-label" for="pp">Phone</label><input id="pp" class="form-control mb-2" formControlName="phone">
      <label class="form-label">Email</label><input class="form-control mb-3" [value]="auth.user()?.email" disabled>
      <button class="btn btn-primary" [disabled]="pf.invalid || busy()">Save</button>
    </form></div>
    <div class="col-lg-6"><form class="card p-3" [formGroup]="cf" (ngSubmit)="change()">
      <h6>Change password</h6>
      <label class="form-label" for="cp">Current password</label><input id="cp" type="password" class="form-control mb-2" formControlName="currentPassword" autocomplete="current-password">
      <label class="form-label" for="np">New password</label><input id="np" type="password" class="form-control mb-1" formControlName="newPassword" autocomplete="new-password">
      <div class="form-text mb-3">8+ characters, at least one letter and one number. You will be logged out afterwards.</div>
      <button class="btn btn-warning" [disabled]="cf.invalid || busy()">Update password</button>
    </form></div>
  </div>`,
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(ApiService); auth = inject(AuthService);
  busy = signal(false);
  pf = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.minLength(2)]], phone: ['', Validators.pattern(/^[0-9+\-\s]{7,20}$/)] });
  cf = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
  });
  ngOnInit() { const u = this.auth.user(); if (u) this.pf.patchValue({ name: u.name, phone: u.phone || '' }); }
  save() {
    this.busy.set(true);
    this.api.patch<any>('/auth/profile', this.pf.getRawValue()).subscribe({
      next: (r) => { this.auth.setUser({ ...this.auth.user()!, ...r.data }); this.busy.set(false); notify.success('Profile updated'); },
      error: (e) => { this.busy.set(false); notify.error(e); },
    });
  }
  change() {
    this.busy.set(true);
    this.api.post('/auth/change-password', this.cf.getRawValue()).subscribe({
      next: async () => { this.busy.set(false); await notify.success('Password updated', 'Please log in again.'); this.auth.logout(); },
      error: (e) => { this.busy.set(false); notify.error(e); },
    });
  }
}
