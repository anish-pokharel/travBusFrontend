import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errMsg } from '../core/util';

/** Handles both "request a reset link" and "set a new password" (when ?token= is present). */
@Component({
  selector: 'app-forgot',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
  <div class="container py-5" style="max-width:440px">
    <div class="card p-4">
      @if (!token) {
        <h4>Forgot password</h4>
        <form [formGroup]="f1" (ngSubmit)="request()">
          <label class="form-label" for="e">Email</label>
          <input id="e" type="email" class="form-control mb-3" formControlName="email" autocomplete="email">
          <button class="btn btn-primary w-100" [disabled]="f1.invalid || busy()">Send reset link</button>
        </form>
      } @else {
        <h4>Set a new password</h4>
        <form [formGroup]="f2" (ngSubmit)="reset()">
          <label class="form-label" for="p">New password</label>
          <input id="p" type="password" class="form-control mb-1" formControlName="password" autocomplete="new-password">
          <div class="form-text mb-3">8+ characters, at least one letter and one number.</div>
          <button class="btn btn-primary w-100" [disabled]="f2.invalid || busy()">Reset password</button>
        </form>
      }
      @if (msg()) { <div class="alert alert-success mt-3 mb-0 py-2">{{ msg() }}</div> }
      @if (error()) { <div class="alert alert-danger mt-3 mb-0 py-2">{{ error() }}</div> }
      <div class="small mt-3 text-center"><a routerLink="/login">Back to login</a></div>
    </div>
  </div>`,
})
export class ForgotComponent {
  private fb = inject(FormBuilder); private api = inject(ApiService);
  @Input() token = '';
  busy = signal(false); msg = signal(''); error = signal('');
  f1 = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  f2 = this.fb.nonNullable.group({ password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]] });
  request() {
    this.busy.set(true); this.error.set('');
    this.api.post('/auth/forgot-password', this.f1.getRawValue()).subscribe({
      next: (r) => { this.msg.set(r.message ?? ''); this.busy.set(false); }, error: (e) => { this.error.set(errMsg(e)); this.busy.set(false); },
    });
  }
  reset() {
    this.busy.set(true); this.error.set('');
    this.api.post('/auth/reset-password', { token: this.token, password: this.f2.getRawValue().password }).subscribe({
      next: (r) => { this.msg.set(r.message ?? ''); this.busy.set(false); }, error: (e) => { this.error.set(errMsg(e)); this.busy.set(false); },
    });
  }
}
