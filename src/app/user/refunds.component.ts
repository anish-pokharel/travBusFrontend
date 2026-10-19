import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { money, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-user-refunds',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
  <h4 class="mb-3">Cancellations & refunds</h4>
  @if (!items().length) { <div class="card p-5 text-center text-muted">No refunds yet.</div> }
  @else {
  <div class="card table-responsive"><table class="table mb-0">
    <thead><tr><th>PNR</th><th>Requested</th><th>Refund</th><th>%</th><th>Status</th><th>Note</th></tr></thead>
    <tbody>@for (r of items(); track r._id) { <tr><td>{{ r.bookingId?.pnr }}</td><td>{{ dt(r.createdAt) }}</td><td>{{ money(r.amount) }}</td><td>{{ r.percent }}%</td><td><app-badge [value]="r.status" /></td><td class="small">{{ r.note || r.reason }}</td></tr> }</tbody>
  </table></div> }`,
})
export class UserRefundsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]); money = money; dt = npDateTime;
  ngOnInit() { this.api.get<any[]>('/refunds').subscribe((r) => this.items.set(r.data)); }
}
