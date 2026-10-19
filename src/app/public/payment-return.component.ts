import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errMsg } from '../core/util';

/** Landing page for eSewa / Khalti redirects. The result shown here comes from our server-side verification only. */
@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="container py-5" style="max-width:560px">
    <div class="card p-4 text-center">
      @if (state() === 'checking') { <div class="spinner-border text-primary mx-auto mb-3"></div><h5>Verifying your payment…</h5><p class="text-muted small">Please do not close this page.</p> }
      @if (state() === 'ok') {
        <i class="bi bi-check-circle-fill text-success display-4"></i><h4 class="mt-2">Payment successful</h4>
        <p>Your booking is confirmed. PNR: <b class="fs-5">{{ pnr() }}</b></p>
        <a class="btn btn-primary" [routerLink]="['/user/bookings', bookingId()]">View / print ticket</a>
      }
      @if (state() === 'fail') {
        <i class="bi bi-x-circle-fill text-danger display-4"></i><h4 class="mt-2">Payment not completed</h4>
        <p class="text-muted">{{ message() }}</p>
        <a class="btn btn-outline-primary" routerLink="/">Search again</a>
      }
    </div>
  </div>`,
})
export class PaymentReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  state = signal<'checking' | 'ok' | 'fail'>('checking');
  message = signal(''); pnr = signal(''); bookingId = signal('');

  ngOnInit() {
    const data = this.route.snapshot.data;
    const q = this.route.snapshot.queryParamMap;
    if (data['failed']) { this.message.set('The payment was cancelled or failed. You have not been charged. Your seats are released automatically.'); this.state.set('fail'); return; }
    let call;
    if (data['provider'] === 'esewa') {
      const d = q.get('data');
      if (!d) return this.fail('Missing payment data.');
      call = this.api.post<any>('/payments/esewa/verify', { data: d });
    } else {
      const pidx = q.get('pidx');
      if (!pidx) return this.fail('Missing payment reference.');
      call = this.api.post<any>('/payments/khalti/verify', { pidx });
    }
    call.subscribe({
      next: (r) => { this.pnr.set(r.data.pnr); this.bookingId.set(r.data.bookingId); this.state.set('ok'); },
      error: (e) => this.fail(errMsg(e)),
    });
  }
  private fail(m: string) { this.message.set(m); this.state.set('fail'); }
}
