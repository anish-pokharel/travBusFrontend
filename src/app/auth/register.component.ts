import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
  <div class="container py-5" style="max-width:480px">
    <form class="card p-4" [formGroup]="f" (ngSubmit)="submit()" novalidate>
      <h4 class="mb-3">Create your account</h4>
      @if (error()) { <div class="alert alert-danger py-2 text-pre-line" role="alert">{{ error() }}</div> }
      <div class="mb-3"><label class="form-label" for="name">Full name</label>
        <input id="name" class="form-control" formControlName="name" autocomplete="name" [class.is-invalid]="bad('name')"><div class="invalid-feedback">Name is required (2+ characters).</div></div>
      <div class="mb-3"><label class="form-label" for="email">Email</label>
        <input id="email" type="email" class="form-control" formControlName="email" autocomplete="email" [class.is-invalid]="bad('email')"><div class="invalid-feedback">Enter a valid email.</div></div>
      <div class="mb-3"><label class="form-label" for="phone">Phone</label>
        <input id="phone" class="form-control" formControlName="phone" autocomplete="tel" [class.is-invalid]="bad('phone')"><div class="invalid-feedback">Enter a valid phone number.</div></div>
      <div class="mb-3"><label class="form-label" for="pw">Password</label>
        <input id="pw" type="password" class="form-control" formControlName="password" autocomplete="new-password" [class.is-invalid]="bad('password')">
        <div class="invalid-feedback">8+ characters with at least one letter and one number.</div></div>
      <div class="mb-3"><label class="form-label" for="pw2">Confirm password</label>
        <input id="pw2" type="password" class="form-control" formControlName="confirm" autocomplete="new-password" [class.is-invalid]="bad('confirm') || (f.errors?.['mismatch'] && f.controls.confirm.touched)">
        <div class="invalid-feedback">Passwords do not match.</div></div>
      <button class="btn btn-primary w-100" [disabled]="busy()">@if (busy()) { <span class="spinner-border spinner-border-sm me-1"></span> }Sign up</button>
      <div class="small mt-3 text-center">Already registered? <a routerLink="/login">Log in</a></div>
    </form>
  </div>`,
})
export class RegisterComponent {
  private fb = inject(FormBuilder); private auth = inject(AuthService); private router = inject(Router);
  busy = signal(false); error = signal('');
  f = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\-\s]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    confirm: ['', Validators.required],
  }, { validators: (g: AbstractControl) => (g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true }) });
  bad(n: 'name' | 'email' | 'phone' | 'password' | 'confirm') { const c = this.f.controls[n]; return c.invalid && c.touched; }
  async submit() {
    this.f.markAllAsTouched();
    if (this.f.invalid) return;
    this.busy.set(true); this.error.set('');
    try {
      const { name, email, phone, password } = this.f.getRawValue();
      await this.auth.register({ name, email, phone: phone || undefined, password });
      this.router.navigateByUrl('/user');
    } catch (e) { this.error.set(errMsg(e)); } finally { this.busy.set(false); }
  }
}
