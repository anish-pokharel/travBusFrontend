import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { money, notify, npDateTime } from '../core/util';
import { PagerComponent } from '../shared/pager.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, PagerComponent, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">Payments & refunds</h4>
  <ul class="nav nav-tabs mb-3"><li class="nav-item"><button class="nav-link" [class.active]="tab()==='pay'" (click)="tab.set('pay')">Payments</button></li>
    <li class="nav-item"><button class="nav-link" [class.active]="tab()==='ref'" (click)="tab.set('ref')">Refunds @if (pending()) { <span class="badge text-bg-warning">{{ pending() }}</span> }</button></li></ul>
  @if (tab()==='pay') {
    <div class="row g-2 mb-3"><div class="col-6 col-md-3"><select class="form-select" [(ngModel)]="status" (ngModelChange)="loadPay(1)" aria-label="Status"><option value="">Any status</option><option value="success">Success</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="partially_refunded">Partially refunded</option><option value="refunded">Refunded</option></select></div>
      <div class="col-6 col-md-3"><select class="form-select" [(ngModel)]="method" (ngModelChange)="loadPay(1)" aria-label="Method"><option value="">Any method</option><option value="cash">Cash</option><option value="esewa">eSewa</option><option value="khalti">Khalti</option><option value="other">Other</option></select></div></div>
    <div class="card table-responsive"><table class="table table-hover mb-0"><thead><tr><th>When</th><th>PNR</th><th>Method</th><th>Amount</th><th>Refunded</th><th>Reference</th><th>Status</th></tr></thead>
      <tbody>@for (p of pays(); track p._id) { <tr><td>{{ dt(p.createdAt) }}</td><td>{{ p.bookingId?.pnr || '-' }}</td><td class="text-capitalize">{{ p.method }}</td><td>{{ money(p.amount) }}</td><td>{{ money(p.refundedAmount) }}</td><td class="small">{{ p.providerRef || p.transactionRef }}</td><td><app-badge [value]="p.status" /></td></tr> }
        @empty { <tr><td colspan="7" class="text-center text-muted py-4">No payments.</td></tr> }</tbody></table></div>
    <app-pager [page]="page()" [limit]="20" [total]="total()" (go)="loadPay($event)" />
  } @else {
    <div class="card table-responsive"><table class="table mb-0"><thead><tr><th>Requested</th><th>PNR</th><th>Booking</th><th>Refund</th><th>%</th><th>Reason</th><th>Status</th><th></th></tr></thead>
      <tbody>@for (r of refunds(); track r._id) { <tr><td>{{ dt(r.createdAt) }}</td><td>{{ r.bookingId?.pnr }}</td><td>{{ money(r.bookingId?.totalAmount) }}</td><td class="fw-semibold">{{ money(r.amount) }}</td><td>{{ r.percent }}%</td><td class="small">{{ r.reason }}</td><td><app-badge [value]="r.status" /></td>
        <td class="text-nowrap">@if (r.status==='pending') { <button class="btn btn-sm btn-success me-1" (click)="process(r, true)">Approve</button><button class="btn btn-sm btn-outline-danger" (click)="process(r, false)">Reject</button> }</td></tr> }
        @empty { <tr><td colspan="8" class="text-center text-muted py-4">No refunds.</td></tr> }</tbody></table></div>
    <div class="form-text mt-2">Approving marks the refund complete in the system. Send the money back through the original gateway (eSewa / Khalti merchant panel) or hand cash at the counter.</div>
  }`,
})
export class AdminPaymentsComponent implements OnInit {
  private api = inject(ApiService);
  tab = signal<'pay' | 'ref'>('pay'); pays = signal<any[]>([]); refunds = signal<any[]>([]); page = signal(1); total = signal(0);
  status = ''; method = ''; money = money; dt = npDateTime;
  pending = () => this.refunds().filter((r) => r.status === 'pending').length;
  ngOnInit() { this.loadPay(1); this.loadRef(); }
  loadPay(p: number) { this.api.get<any[]>('/payments', { page: p, limit: 20, status: this.status, method: this.method }).subscribe((r) => { this.pays.set(r.data); this.page.set(p); this.total.set(r.meta?.total || 0); }); }
  loadRef() { this.api.get<any[]>('/refunds').subscribe((r) => this.refunds.set(r.data)); }
  async process(r: any, approve: boolean) {
    const note = await notify.prompt(approve ? 'Note (e.g. refund reference)' : 'Reason for rejecting', ''); if (note === null) return;
    this.api.post(`/refunds/${r._id}/process`, { approve, note }).subscribe({ next: () => { notify.toast(approve ? 'Refund completed' : 'Refund rejected'); this.loadRef(); this.loadPay(this.page()); }, error: (e) => notify.error(e) });
  }
}
