import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errMsg, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

/** Public ticket verification (QR target). Returns masked data only, and requires the signed code. */
@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
  <div class="container py-4" style="max-width:640px">
    <h4><i class="bi bi-qr-code-scan"></i> Verify a ticket</h4>
    <form class="input-group mb-3" (ngSubmit)="submit()">
      <input class="form-control" name="code" [(ngModel)]="input" placeholder="Paste the code from the QR link (PNR.signature)" aria-label="Ticket code" required>
      <button class="btn btn-primary" [disabled]="!input">Verify</button>
    </form>
    @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
    @if (res(); as r) {
      <div class="card p-3">
        <div class="d-flex justify-content-between align-items-center"><div class="fs-5 fw-bold">PNR {{ r.pnr }}</div><app-badge [value]="r.status" /></div>
        <hr class="my-2">
        <div>{{ r.route }}</div>
        <div class="text-muted small">{{ dt(r.departureAt) }} · {{ r.vehicle }} ({{ r.registrationNumber }})</div>
        <ul class="mt-2 mb-0">@for (p of r.passengers; track $index) { <li>{{ p.name }} — seat <b>{{ p.seat }}</b> @if (p.checkedIn) { <span class="badge text-bg-info">checked in</span> }</li> }</ul>
      </div>
    }
  </div>`,
})
export class VerifyComponent implements OnChanges {
  private api = inject(ApiService);
  private router = inject(Router);
  @Input() code = '';
  input = ''; res = signal<any>(null); error = signal('');
  dt = npDateTime;
  ngOnChanges() { if (this.code) { this.input = this.code; this.check(this.code); } }
  submit() { const c = this.input.trim(); if (c) this.router.navigate(['/verify', c]); }
  private check(c: string) {
    this.error.set(''); this.res.set(null);
    this.api.get(`/tickets/verify/${encodeURIComponent(c)}`).subscribe({ next: (r) => this.res.set(r.data), error: (e) => this.error.set(errMsg(e)) });
  }
}
