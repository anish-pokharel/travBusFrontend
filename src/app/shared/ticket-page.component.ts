import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errMsg, money, notify } from '../core/util';
import { TicketComponent } from './ticket/ticket.component';
import { StatusBadgeComponent } from './status-badge.component';

/** One ticket view for passengers, counter staff and admins. Access is enforced by the API (404 for foreign tickets). */
@Component({
  selector: 'app-ticket-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TicketComponent, StatusBadgeComponent],
  template: `
  @if (loading()) { <div class="text-center py-5"><div class="spinner-border text-primary"></div></div> }
  @else if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
  @else {
  @if (b(); as bk) {
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3 no-print">
      <a class="btn btn-sm btn-outline-secondary" [routerLink]="backLink()"><i class="bi bi-arrow-left"></i> Back</a>
      <app-badge [value]="bk.status" /> <app-badge [value]="bk.paymentStatus" />
      <div class="ms-auto d-flex flex-wrap gap-2">
        @if (bk.status === 'confirmed') {
          <button class="btn btn-sm btn-primary" (click)="print(false, false)"><i class="bi bi-printer"></i> Print A4</button>
          <button class="btn btn-sm btn-outline-primary" (click)="print(true, false)"><i class="bi bi-receipt"></i> Thermal receipt</button>
          @if (isStaff()) { <button class="btn btn-sm btn-outline-secondary" (click)="print(thermal(), true)"><i class="bi bi-files"></i> Duplicate copy</button> }
          @if (canCancel()) { <button class="btn btn-sm btn-outline-danger" (click)="cancel()">Cancel booking</button> }
        }
      </div>
    </div>
    @if (bk.status !== 'confirmed') {
      <div class="alert alert-secondary no-print">This booking is <b>{{ bk.status }}</b>@if (bk.refundAmount) { · refund {{ money(bk.refundAmount) }} }@if (bk.cancelReason) { · {{ bk.cancelReason }} }.</div>
    }
    <div class="print-area"><app-ticket [booking]="bk" [thermal]="thermal()" [duplicate]="dup()" /></div>
  }
  }`,
})
export class TicketPageComponent implements OnInit {
  private api = inject(ApiService); private auth = inject(AuthService); private router = inject(Router);
  @Input() id = '';
  b = signal<any>(null); loading = signal(true); error = signal('');
  thermal = signal(false); dup = signal(false);
  money = money;
  isStaff = () => this.auth.role() === 'admin' || this.auth.role() === 'counter';
  backLink = () => (this.auth.role() === 'admin' ? '/admin/bookings' : this.auth.role() === 'counter' ? '/counter/sales' : '/user/bookings');
  canCancel = () => this.b()?.status === 'confirmed' && new Date(this.b().trip?.departureAt) > new Date();

  ngOnInit() {
    this.api.get<any>(`/bookings/${this.id}`).subscribe({
      next: (r) => {
        this.b.set(r.data); this.loading.set(false);
        if (new URLSearchParams(location.search).get('print') === '1' && r.data.status === 'confirmed') setTimeout(() => this.print(false, false, true), 600);
      },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  print(thermal: boolean, duplicate: boolean, original = false) {
    this.thermal.set(thermal); this.dup.set(duplicate);
    if (this.isStaff()) this.api.post(`/bookings/${this.id}/printed`, { original }).subscribe({ error: () => {} }); // counts + audits duplicate prints
    const style = document.createElement('style');
    style.textContent = thermal ? '@page { size: 80mm auto; margin: 2mm }' : '@page { size: A4; margin: 10mm }';
    document.head.appendChild(style);
    setTimeout(() => { window.print(); style.remove(); }, 150);
  }

  async cancel() {
    const bk = this.b();
    if (!(await notify.confirmDanger('Cancel this booking?', 'The refund (if any) follows the cancellation policy.', 'Yes, cancel'))) return;
    const reason = await notify.prompt('Reason (optional)', 'e.g. change of plans');
    if (reason === null) return;
    this.api.post<any>(`/bookings/${bk._id}/cancel`, { reason }).subscribe({
      next: (r) => {
        this.b.set({ ...bk, ...r.data.booking, trip: bk.trip, counter: bk.counter });
        notify.success('Booking cancelled', r.data.refund ? `Refund ${money(r.data.refund.amount)} (${r.data.refundPercent}%) is pending processing.` : 'No refund applies under the policy.');
      },
      error: (e) => notify.error(e, 'Could not cancel'),
    });
  }
}
