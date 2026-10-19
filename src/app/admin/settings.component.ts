import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { notify } from '../core/util';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <h4 class="mb-3">Settings</h4>
  @if (s(); as v) {
    <div class="row g-3"><div class="col-lg-7"><div class="card p-3">
      <h6>Cancellation & refund policy</h6>
      <div class="small text-muted mb-2">Refund % applies when cancelling at least this many hours before departure. The highest matching tier wins.</div>
      @for (t of v.cancellationPolicy; track $index) {
        <div class="row g-2 mb-2 align-items-center"><div class="col-5"><div class="input-group input-group-sm"><span class="input-group-text">≥</span><input type="number" min="0" class="form-control" [(ngModel)]="t.hoursBefore" [attr.aria-label]="'Hours before, tier ' + ($index+1)"><span class="input-group-text">hrs</span></div></div>
          <div class="col-5"><div class="input-group input-group-sm"><input type="number" min="0" max="100" class="form-control" [(ngModel)]="t.refundPercent" [attr.aria-label]="'Refund percent, tier ' + ($index+1)"><span class="input-group-text">% refund</span></div></div>
          <div class="col-2"><button class="btn btn-sm btn-outline-danger" (click)="v.cancellationPolicy.splice($index,1)" [disabled]="v.cancellationPolicy.length<2" aria-label="Remove tier"><i class="bi bi-x"></i></button></div></div>
      }
      <button class="btn btn-sm btn-outline-primary align-self-start" (click)="v.cancellationPolicy.push({hoursBefore:0, refundPercent:0})">Add tier</button>
      <hr><h6>Booking rules</h6>
      <div class="mb-2"><label class="form-label small" for="hm">Seat hold time (minutes)</label><input id="hm" type="number" min="2" max="60" class="form-control form-control-sm" style="max-width:140px" [(ngModel)]="v.holdMinutes"></div>
      <div class="form-check form-switch"><input id="rs" type="checkbox" class="form-check-input" [(ngModel)]="v.releaseSeatsOnCancel"><label class="form-check-label" for="rs">Release seats for resale when a booking is cancelled</label></div>
      <div class="form-check form-switch"><input id="oc" type="checkbox" class="form-check-input" [(ngModel)]="v.allowOnlineCancellation"><label class="form-check-label" for="oc">Let passengers cancel their own bookings online</label></div>
      <button class="btn btn-primary mt-3 align-self-start" (click)="save()" [disabled]="busy()">Save settings</button>
    </div></div></div>
  }`,
})
export class AdminSettingsComponent implements OnInit {
  private api = inject(ApiService);
  s = signal<any>(null); busy = signal(false);
  ngOnInit() { this.api.get('/settings').subscribe((r) => this.s.set(r.data)); }
  save() {
    this.busy.set(true); const v = this.s();
    this.api.put('/settings', { cancellationPolicy: v.cancellationPolicy.map((t: any) => ({ hoursBefore: Number(t.hoursBefore), refundPercent: Number(t.refundPercent) })), holdMinutes: Number(v.holdMinutes), releaseSeatsOnCancel: !!v.releaseSeatsOnCancel, allowOnlineCancellation: !!v.allowOnlineCancellation }).subscribe({
      next: (r) => { this.s.set(r.data); this.busy.set(false); notify.success('Settings saved'); }, error: (e) => { this.busy.set(false); notify.error(e); },
    });
  }
}
