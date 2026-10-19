import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { downloadBlob, money, notify, npDateTime, todayNp } from '../core/util';

interface Tab { key: string; label: string; path: string; params?: Record<string, any>; }
const TABS: Tab[] = [
  { key: 'sales', label: 'Sales', path: '/reports/sales' },
  { key: 'route', label: 'By route', path: '/reports/breakdown/route' }, { key: 'vehicle', label: 'By vehicle', path: '/reports/breakdown/vehicle' },
  { key: 'counter', label: 'By counter', path: '/reports/breakdown/counter' }, { key: 'staff', label: 'By staff', path: '/reports/breakdown/staff' },
  { key: 'source', label: 'Online vs counter', path: '/reports/breakdown/source' }, { key: 'pay', label: 'Payment methods', path: '/reports/payment-methods' },
  { key: 'cancel', label: 'Cancellations & refunds', path: '/reports/cancellations' }, { key: 'occ', label: 'Occupancy', path: '/reports/occupancy' },
];
const MONEY_COLS = new Set(['revenue', 'amount']);
const DATE_COLS = new Set(['departure']);

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="d-flex justify-content-between mb-3 no-print"><h4 class="mb-0">Reports</h4>
    <div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" (click)="csv()"><i class="bi bi-filetype-csv"></i> Export CSV</button><button class="btn btn-outline-secondary btn-sm" (click)="print()"><i class="bi bi-printer"></i> Print</button></div></div>
  <div class="card p-3 mb-3 no-print"><div class="row g-2 align-items-end">
    <div class="col-6 col-md-3"><label class="form-label small mb-0" for="rf">From</label><input id="rf" type="date" class="form-control form-control-sm" [(ngModel)]="from" (ngModelChange)="load()"></div>
    <div class="col-6 col-md-3"><label class="form-label small mb-0" for="rt">To</label><input id="rt" type="date" class="form-control form-control-sm" [(ngModel)]="to" (ngModelChange)="load()"></div>
    @if (tab().key === 'sales') { <div class="col-6 col-md-3"><label class="form-label small mb-0" for="rg">Group by</label><select id="rg" class="form-select form-select-sm" [(ngModel)]="groupBy" (ngModelChange)="load()"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></div> }
  </div></div>
  <ul class="nav nav-pills mb-3 flex-wrap gap-1 no-print">@for (t of tabs; track t.key) { <li class="nav-item"><button class="nav-link py-1" [class.active]="tab().key===t.key" (click)="select(t)">{{ t.label }}</button></li> }</ul>
  <div class="card p-3 print-area">
    <h5 class="mb-1">{{ tab().label }}</h5><div class="small text-muted mb-2">{{ from }} to {{ to }} · generated {{ now() }}</div>
    @if (loading()) { <div class="spinner-border text-primary"></div> }
    @else if (!rows().length) { <div class="text-muted">No data for this period.</div> }
    @else {
      @if (summary(); as s) { <div class="alert alert-light border py-2 small">{{ s }}</div> }
      <div class="table-responsive"><table class="table table-sm table-striped mb-0">
        <thead><tr>@for (c of cols(); track c) { <th class="text-capitalize">{{ label(c) }}</th> }</tr></thead>
        <tbody>@for (r of rows(); track $index) { <tr>@for (c of cols(); track c) { <td [class.text-end]="isNum(r[c])">{{ fmt(c, r[c]) }}</td> }</tr> }</tbody>
        @if (totals(); as t) { <tfoot><tr class="fw-bold">@for (c of cols(); track c; let i = $index) { <td [class.text-end]="t[c] !== undefined">{{ i === 0 ? 'Total' : (t[c] !== undefined ? fmt(c, t[c]) : '') }}</td> }</tr></tfoot> }
      </table></div>
    }
  </div>`,
})
export class AdminReportsComponent implements OnInit {
  private api = inject(ApiService);
  tabs = TABS; tab = signal<Tab>(TABS[0]); rows = signal<any[]>([]); loading = signal(false); summary = signal('');
  from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10); to = todayNp(); groupBy = 'day';
  now = () => npDateTime(new Date());
  cols = () => (this.rows().length ? Object.keys(this.rows()[0]) : []);
  isNum = (v: any) => typeof v === 'number';
  label = (c: string) => c.replace(/([A-Z])/g, ' $1');
  fmt(c: string, v: any) { if (v === null || v === undefined) return ''; if (MONEY_COLS.has(c)) return money(v); if (DATE_COLS.has(c)) return npDateTime(v); return typeof v === 'number' ? v.toLocaleString() : String(v); }
  totals() {
    const rows = this.rows(); if (rows.length < 2) return null;
    const t: Record<string, number> = {};
    for (const c of this.cols()) if (['bookings', 'tickets', 'revenue', 'count', 'amount', 'totalSeats', 'booked', 'available'].includes(c)) t[c] = rows.reduce((a, r) => a + (Number(r[c]) || 0), 0);
    return Object.keys(t).length ? t : null;
  }
  ngOnInit() { this.load(); }
  select(t: Tab) { this.tab.set(t); this.load(); }
  private params() {
    // include the whole "to" day in Nepal time
    return { from: new Date(`${this.from}T00:00:00+05:45`).toISOString(), to: new Date(`${this.to}T23:59:59.999+05:45`).toISOString(), ...(this.tab().key === 'sales' ? { groupBy: this.groupBy } : {}) };
  }
  load() {
    this.loading.set(true); this.summary.set('');
    this.api.get<any>(this.tab().path, this.params()).subscribe({
      next: (r) => {
        let d = r.data;
        if (this.tab().key === 'cancel') { this.summary.set(`${d.cancellations.bookings} cancelled booking(s) worth ${money(d.cancellations.amount)}`); d = d.refunds; }
        this.rows.set(d); this.loading.set(false);
      },
      error: (e) => { this.loading.set(false); notify.error(e); },
    });
  }
  csv() { this.api.csv(this.tab().path, this.params()).subscribe({ next: (b) => downloadBlob(b, `${this.tab().key}-${this.from}_${this.to}.csv`), error: (e) => notify.error(e, 'Export failed') }); }
  print() { window.print(); }
}
