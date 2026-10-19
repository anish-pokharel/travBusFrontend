import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { money, npDate, npTime, duration } from '../../core/util';

/** Printable ticket: A4 layout or compact 80mm thermal receipt. */
@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule],
  template: `
  @if (booking) {
  <div class="ticket" [class.thermal]="thermal">
    @if (duplicate) { <div class="dup-mark">DUPLICATE COPY</div> }
    <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
      <div>
        <div class="fw-bold" [class.fs-4]="!thermal">Yatra Ticket</div>
        <div class="small text-muted">{{ booking.trip?.vehicleId?.operator }}</div>
      </div>
      <div class="text-end">
        <div class="small text-muted">PNR</div>
        <div class="fw-bold" [class.fs-4]="!thermal" style="letter-spacing:.1em">{{ booking.pnr }}</div>
      </div>
    </div>

    <div class="row g-2" [class.row-cols-2]="!thermal">
      <div class="col"><div class="small text-muted">Route</div><div class="fw-semibold">{{ booking.trip?.routeId?.departureCity }} → {{ booking.trip?.routeId?.destinationCity }}</div></div>
      <div class="col"><div class="small text-muted">Vehicle</div><div class="fw-semibold">{{ booking.trip?.vehicleId?.name }} ({{ booking.trip?.vehicleId?.registrationNumber }})</div></div>
      <div class="col"><div class="small text-muted">Travel date</div><div class="fw-semibold">{{ date(booking.trip?.departureAt) }}</div></div>
      <div class="col"><div class="small text-muted">Departure</div><div class="fw-semibold">{{ time(booking.trip?.departureAt) }}
        @if (booking.trip?.routeId?.durationMin) { <span class="text-muted small">· {{ dur(booking.trip.routeId.durationMin) }}</span> }</div></div>
      <div class="col"><div class="small text-muted">Status</div>
        <span class="badge" [ngClass]="booking.status === 'confirmed' ? 'bg-success' : 'bg-danger'">{{ booking.status | uppercase }}</span>
        <span class="badge bg-secondary ms-1">{{ booking.paymentStatus | uppercase }}</span></div>
      <div class="col"><div class="small text-muted">Booked via</div><div class="fw-semibold">{{ booking.source === 'counter' ? 'Counter: ' + (booking.counter?.name || '') : 'Online' }}
        {{ booking.paymentMethod ? '· ' + (booking.paymentMethod | uppercase) : '' }}</div></div>
    </div>

    <table class="table table-sm mt-3 mb-2" [class.small]="thermal">
      <thead><tr><th>Passenger</th><th>Seat</th><th class="text-end">Fare</th><th>Ticket no.</th></tr></thead>
      <tbody>
        @for (p of booking.passengers; track p.seatId) {
          <tr><td>{{ p.name }}<div class="text-muted small">{{ p.phone }}</div></td><td class="fw-bold">{{ p.seatNumber }}</td>
            <td class="text-end">{{ money(p.price) }}</td><td class="small">{{ p.ticketNo }}</td></tr>
        }
      </tbody>
      <tfoot><tr><th colspan="2">Total</th><th class="text-end">{{ money(booking.totalAmount) }}</th><th></th></tr></tfoot>
    </table>

    <div class="d-flex justify-content-between align-items-center">
      <div class="small text-muted">Booked: {{ date(booking.confirmedAt || booking.createdAt) }} {{ time(booking.confirmedAt || booking.createdAt) }}<br>
        Please arrive 20 minutes before departure. Carry a valid ID.<br>Scan QR to verify this ticket.</div>
      @if (qr()) { <img [src]="qr()" [width]="thermal ? 110 : 130" [height]="thermal ? 110 : 130" alt="Ticket QR code"> }
    </div>
  </div>
  }`,
})
export class TicketComponent implements OnInit {
  private api = inject(ApiService);
  @Input() booking: any;
  @Input() thermal = false;
  @Input() duplicate = false;
  qr = signal<string>('');
  money = money; date = npDate; time = npTime; dur = duration;

  ngOnInit() {
    if (this.booking?.pnr) this.api.get<{ dataUrl: string }>(`/tickets/${this.booking.pnr}/qr`).subscribe({ next: (r) => this.qr.set(r.data.dataUrl) });
  }
}
