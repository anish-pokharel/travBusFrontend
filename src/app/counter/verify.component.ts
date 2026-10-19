import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errMsg, money, notify, npDateTime } from '../core/util';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-counter-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
  <h4 class="mb-3"><i class="bi bi-qr-code-scan"></i> Verify ticket</h4>
  <form class="input-group mb-3" style="max-width:520px" (ngSubmit)="verify()">
    <input class="form-control" name="c" [(ngModel)]="code" placeholder="Scan QR or type PNR" aria-label="Ticket code" autofocus>
    <button class="btn btn-primary" [disabled]="!code.trim()">Verify</button>
  </form>
  @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
  @if (t(); as b) {
    <div class="card p-3" style="max-width:640px">
      <div class="d-flex justify-content-between align-items-center"><div class="fs-4 fw-bold">{{ b.pnr }}</div><app-badge [value]="b.ticketStatus" /></div>
      <div class="mt-1">{{ b.trip?.routeId?.name }} · {{ dt(b.trip?.departureAt) }}</div>
      <div class="small text-muted">{{ b.trip?.vehicleId?.name }} ({{ b.trip?.vehicleId?.registrationNumber }}) · {{ money(b.totalAmount) }} · {{ b.paymentStatus }}</div>
      <table class="table table-sm mt-2"><thead><tr><th>Passenger</th><th>Seat</th><th>Checked in</th></tr></thead>
        <tbody>@for (p of b.passengers; track p.seatId) { <tr><td>{{ p.name }}</td><td><b>{{ p.seatNumber }}</b></td><td>{{ p.checkedIn ? 'Yes' : 'No' }}</td></tr> }</tbody></table>
      @if (b.ticketStatus === 'valid') { <button class="btn btn-success" (click)="checkIn()">Check in passengers</button> }
      @else { <div class="alert alert-warning mb-0 py-2">Do not board: ticket is {{ b.ticketStatus.replace('_',' ') }}.</div> }
    </div>
  }`,
})
export class CounterVerifyComponent {
  private api = inject(ApiService);
  code = ''; t = signal<any>(null); error = signal('');
  money = money; dt = npDateTime;
  verify() {
    this.error.set(''); this.t.set(null);
    this.api.post<any>('/tickets/verify', { code: this.code.trim() }).subscribe({ next: (r) => this.t.set(r.data), error: (e) => this.error.set(errMsg(e)) });
  }
  checkIn() {
    this.api.post('/tickets/check-in', { pnr: this.t().pnr }).subscribe({
      next: () => { notify.success('Checked in'); this.verify(); }, error: (e) => notify.error(e, 'Check-in failed'),
    });
  }
}
