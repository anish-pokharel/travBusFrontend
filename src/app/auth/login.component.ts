import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
  <div class="container py-5" style="max-width:440px">
    <form class="card p-4" [formGroup]="f" (ngSubmit)="submit()" novalidate>
      <h4 class="mb-3">Log in</h4>
      @if (error()) { <div class="alert alert-danger py-2" role="alert">{{ error() }}</div> }
      <div class="mb-3"><label class="form-label" for="email">Email</label>
        <input id="email" type="email" class="form-control" formControlName="email" autocomplete="username" [class.is-invalid]="f.controls.email.invalid && f.controls.email.touched">
        <div class="invalid-feedback">Enter a valid email.</div></div>
      <div class="mb-3"><label class="form-label" for="pw">Password</label>
        <input id="pw" type="password" class="form-control" formControlName="password" autocomplete="current-password" [class.is-invalid]="f.controls.password.invalid && f.controls.password.touched">
        <div class="invalid-feedback">Password is required.</div></div>
      <button class="btn btn-primary w-100" [disabled]="busy()">@if (busy()) { <span class="spinner-border spinner-border-sm me-1"></span> }Log in</button>
      <div class="d-flex justify-content-between small mt-3"><a routerLink="/forgot-password">Forgot password?</a><a routerLink="/register">Create account</a></div>
    </form>
  </div>`,
})
export class LoginComponent {
  private fb = inject(FormBuilder); private auth = inject(AuthService); private router = inject(Router);
  @Input() returnUrl = '';
  busy = signal(false); error = signal('');
  f = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  async submit() {
    this.f.markAllAsTouched();
    if (this.f.invalid) return;
    this.busy.set(true); this.error.set('');
    try {
      const u = await this.auth.login(this.f.value.email!, this.f.value.password!);
      // only follow same-site relative return URLs (prevents open redirects)
      const safe = this.returnUrl && this.returnUrl.startsWith('/') && !this.returnUrl.startsWith('//') ? this.returnUrl : this.auth.homeFor(u.role);
      this.router.navigateByUrl(safe);
    } catch (e) { this.error.set(errMsg(e)); } finally { this.busy.set(false); }
  }
}
