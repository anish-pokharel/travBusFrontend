import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { money, npDate, npDateTime } from '../core/util';

@Component({
  selector: 'app-counter-closing',
  standalone: true,
  imports: [CommonModule],
  template: `
  @if (d(); as x) {
    <div class="d-flex justify-content-between mb-3 no-print"><h4 class="mb-0">Daily closing report</h4><button class="btn btn-primary" (click)="print()"><i class="bi bi-printer"></i> Print</button></div>
    <div class="card p-4" style="max-width:640px">
      <div class="text-center mb-3"><div class="fw-bold fs-5">{{ x.counter.name }} ({{ x.counter.code }})</div><div>Closing report · {{ day(x.date) }}</div><div class="small text-muted">Staff: {{ x.staff.name }}</div></div>
      <table class="table table-sm">
        <tr><td>Tickets sold</td><td class="text-end">{{ x.ticketsSold }}</td></tr>
        <tr><td>Bookings</td><td class="text-end">{{ x.bookings }}</td></tr>
        <tr><td>Total sales</td><td class="text-end">{{ money(x.sales) }}</td></tr>
        <tr class="fw-bold"><td>Cash collected</td><td class="text-end">{{ money(x.cashCollected) }}</td></tr>
        <tr><td>Cancellations ({{ x.cancellations.bookings }})</td><td class="text-end">{{ money(x.cancellations.amount) }}</td></tr>
        <tr><td>Refunded</td><td class="text-end">{{ money(x.cancellations.refunded) }}</td></tr>
      </table>
      <div class="small text-muted">Generated {{ dt(now) }}</div>
      <div class="d-flex justify-content-between mt-5 small"><span>Staff signature: ____________</span><span>Supervisor: ____________</span></div>
    </div>
  } @else { <div class="spinner-border text-primary"></div> }`,
})
export class CounterClosingComponent implements OnInit {
  private api = inject(ApiService);
  d = signal<any>(null); now = new Date(); money = money; day = npDate; dt = npDateTime;
  ngOnInit() { this.api.get('/counters/me/daily-closing').subscribe((r) => this.d.set(r.data)); }
  print() { window.print(); }
}
