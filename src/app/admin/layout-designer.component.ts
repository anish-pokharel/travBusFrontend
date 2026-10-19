import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { ElementType, Layout, LayoutElement, Seat, VEHICLE_TYPE_LABELS } from '../core/models';
import { errMsg, notify } from '../core/util';
import { SeatMapComponent } from '../shared/seat-map/seat-map.component';

type Tool = 'select' | 'erase' | 'seat' | 'berth' | ElementType;
interface Doc { name: string; vehicleType: string; rows: number; columns: number; seats: Seat[]; elements: LayoutElement[]; }
interface Hit { kind: 'seat' | 'el'; id: string; }

const PALETTE: { tool: Tool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select / move', icon: 'bi-cursor' }, { tool: 'erase', label: 'Erase', icon: 'bi-eraser' },
  { tool: 'seat', label: 'Passenger seat', icon: 'bi-person-square' }, { tool: 'berth', label: 'Sleeper berth', icon: 'bi-hospital' },
  { tool: 'driver', label: 'Driver seat', icon: 'bi-steering-wheel' }, { tool: 'staff', label: 'Helper / staff', icon: 'bi-person-badge' },
  { tool: 'aisle', label: 'Aisle', icon: 'bi-arrows-expand-vertical' }, { tool: 'empty', label: 'Empty space', icon: 'bi-square' },
  { tool: 'front_door', label: 'Front door', icon: 'bi-door-open' }, { tool: 'rear_door', label: 'Rear door', icon: 'bi-door-closed' },
  { tool: 'side_door', label: 'Side door', icon: 'bi-door-open-fill' }, { tool: 'emergency_exit', label: 'Emergency exit', icon: 'bi-exclamation-triangle' },
  { tool: 'luggage', label: 'Luggage area', icon: 'bi-bag' }, { tool: 'restricted', label: 'Restricted area', icon: 'bi-slash-circle' },
  { tool: 'label', label: 'Custom label', icon: 'bi-tag' },
];
const EL_TEXT: Record<string, string> = { driver: 'Driver', front_door: 'Door', rear_door: 'Rear door', side_door: 'Side door', emergency_exit: 'Exit', luggage: 'Luggage', restricted: 'No-go', staff: 'Staff', label: 'Label', aisle: '', empty: '' };
const CATEGORIES = ['regular', 'premium', 'vip', 'window', 'aisle', 'upper_sleeper', 'lower_sleeper', 'custom'];
const empty = (): Doc => ({ name: '', vehicleType: 'bus', rows: 8, columns: 5, seats: [], elements: [] });

@Component({
  selector: 'app-layout-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SeatMapComponent],
  template: `
  <div class="d-flex flex-wrap align-items-center gap-2 mb-2 no-print">
    <a routerLink="/admin/layouts" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-left"></i></a>
    <h4 class="mb-0 me-auto">Seat layout designer</h4>
    <div class="btn-group btn-group-sm">
      <button class="btn btn-outline-secondary" (click)="undo()" [disabled]="!canUndo()" title="Undo"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
      <button class="btn btn-outline-secondary" (click)="redo()" [disabled]="!canRedo()" title="Redo"><i class="bi bi-arrow-clockwise"></i> Redo</button>
      <button class="btn btn-outline-secondary" (click)="duplicateSel()" [disabled]="!sel()" title="Duplicate selected"><i class="bi bi-copy"></i> Duplicate</button>
      <button class="btn btn-outline-secondary" (click)="reset()"><i class="bi bi-x-octagon"></i> Reset</button>
      <button class="btn" [ngClass]="preview() ? 'btn-info' : 'btn-outline-info'" (click)="preview.set(!preview())"><i class="bi bi-eye"></i> Preview</button>
    </div>
    <button class="btn btn-sm btn-success" (click)="save()" [disabled]="busy()"><i class="bi bi-save"></i> Save</button>
  </div>

  @if (usedBy() > 0) { <div class="alert alert-warning py-2 small">This layout is used by {{ usedBy() }} trip(s). Saving will create a <b>new version</b>; existing trips and bookings keep the old seat map.</div> }

  <div class="card p-2 mb-2"><div class="row g-2 align-items-end">
    <div class="col-12 col-md-4"><label class="form-label small mb-0" for="ln">Layout name</label><input id="ln" class="form-control form-control-sm" [ngModel]="doc().name" (ngModelChange)="setName($event)" maxlength="80"></div>
    <div class="col-6 col-md-3"><label class="form-label small mb-0" for="lt">Vehicle type</label><select id="lt" class="form-select form-select-sm" [ngModel]="doc().vehicleType" (ngModelChange)="setType($event)">@for (t of types; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }</select></div>
    <div class="col-6 col-md-3"><label class="form-label small mb-0" for="tp">Load template</label><select id="tp" class="form-select form-select-sm" (change)="loadTemplate($any($event.target).value); $any($event.target).value=''"><option value="">Choose…</option>@for (t of templates(); track t.key) { <option [value]="t.key">{{ t.label }}</option> }</select></div>
    <div class="col-12 col-md-2"><label class="form-label small mb-0" for="nm">Renumber seats</label><select id="nm" class="form-select form-select-sm" (change)="renumber($any($event.target).value); $any($event.target).value=''"><option value="">Choose…</option><option value="numeric">1, 2, 3 …</option><option value="rowletter">A1, A2 … by row</option><option value="colletter">By column (A1, B1 …)</option></select></div>
  </div></div>

  <div class="row g-2">
    <aside class="col-lg-2 no-print"><div class="card p-2">
      <div class="small fw-semibold mb-1">Elements</div>
      <div class="d-flex flex-lg-column flex-wrap gap-1">
        @for (p of palette; track p.tool) {
          <button class="btn btn-sm text-start" [ngClass]="tool() === p.tool ? 'btn-primary' : 'btn-outline-secondary'" (click)="tool.set(p.tool)"><i class="bi me-1" [ngClass]="p.icon"></i>{{ p.label }}</button>
        }
      </div>
      <div class="small text-muted mt-2">Pick an element, then click a grid cell. Drag items to move them.</div>
    </div></aside>

    <main class="col-lg-7"><div class="card p-2">
      <div class="d-flex flex-wrap gap-2 align-items-center mb-2 no-print">
        <span class="small">Rows</span><div class="btn-group btn-group-sm"><button class="btn btn-outline-secondary" (click)="resize(-1,0)" aria-label="Remove row">−</button><span class="btn btn-light disabled">{{ doc().rows }}</span><button class="btn btn-outline-secondary" (click)="resize(1,0)" aria-label="Add row">+</button></div>
        <span class="small ms-2">Columns</span><div class="btn-group btn-group-sm"><button class="btn btn-outline-secondary" (click)="resize(0,-1)" aria-label="Remove column">−</button><span class="btn btn-light disabled">{{ doc().columns }}</span><button class="btn btn-outline-secondary" (click)="resize(0,1)" aria-label="Add column">+</button></div>
        <button class="btn btn-sm btn-outline-secondary ms-2" (click)="insertRow()" title="Insert a row after the selected item (or at the end)">Insert row</button>
      </div>
      @if (preview()) {
        <div class="text-center overflow-auto"><div class="small text-muted mb-1">Passenger view (all seats shown as available)</div><app-seat-map [layout]="asLayout()" [interactive]="false" [showPrice]="false" /></div>
      } @else {
        <div class="overflow-auto text-center">
          <div class="vehicle-shell">
            <div class="vehicle-front"><i class="bi bi-arrow-up"></i> FRONT</div>
            <div class="seat-grid" [style.gridTemplateColumns]="'repeat(' + doc().columns + ', ' + CELL + 'px)'" [style.gridTemplateRows]="'repeat(' + doc().rows + ', ' + CELL + 'px)'" [style.gap.px]="GAP">
              @for (c of bgCells(); track c.key) {
                <div class="designer-cell" [class.drop]="hover() === c.key" [style.gridRow]="c.r + 1" [style.gridColumn]="c.c + 1"
                     (click)="cellClick(c.r, c.c)" (dragover)="onOver($event, c.key)" (dragleave)="hover.set('')" (drop)="onDrop($event, c.r, c.c)" [attr.aria-label]="'Cell row ' + (c.r+1) + ' column ' + (c.c+1)"></div>
              }
              @for (e of doc().elements; track e.id) {
                <div class="cell el" [ngClass]="e.type" [class.invalid]="bad().has(e.id)" [class.dsel]="isSel('el', e.id)"
                     [style.gridRow]="(e.row+1) + ' / span ' + (e.rowSpan||1)" [style.gridColumn]="(e.col+1) + ' / span ' + (e.colSpan||1)" [style.transform]="e.rotation ? 'rotate(' + e.rotation + 'deg)' : ''"
                     draggable="true" (dragstart)="onDrag($event, 'el', e.id)" (click)="itemClick($event, 'el', e.id, e.row, e.col)" (dragover)="onOver($event, e.row + ',' + e.col)" (drop)="onDrop($event, e.row, e.col)">
                  {{ e.label ?? EL[e.type] }}</div>
              }
              @for (s of doc().seats; track s.seatId) {
                <div class="cell seat" [class.berth]="s.kind==='berth'" [class.blocked]="!s.bookable" [class.inactive]="!s.active" [class.invalid]="bad().has(s.seatId)" [class.premium]="s.category==='premium'||s.category==='vip'" [class.dsel]="isSel('seat', s.seatId)"
                     [style.gridRow]="s.row+1" [style.gridColumn]="s.col+1" [style.transform]="s.rotation ? 'rotate(' + s.rotation + 'deg)' : ''" [attr.title]="s.seatNumber + ' · ' + s.category"
                     draggable="true" (dragstart)="onDrag($event, 'seat', s.seatId)" (click)="itemClick($event, 'seat', s.seatId, s.row, s.col)" (dragover)="onOver($event, s.row + ',' + s.col)" (drop)="onDrop($event, s.row, s.col)">
                  {{ s.seatNumber }}</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
    <div class="card p-2 mt-2"><div class="d-flex flex-wrap gap-3 small">
      <span>Rows <b>{{ doc().rows }}</b></span><span>Columns <b>{{ doc().columns }}</b></span><span>Total seats <b>{{ doc().seats.length }}</b></span>
      <span>Bookable seats <b>{{ bookable() }}</b></span><span>Passenger capacity <b>{{ bookable() }}</b> <span class="text-muted">(driver/staff excluded)</span></span></div></div>
    </main>

    <aside class="col-lg-3 no-print">
      <div class="card p-2 mb-2"><div class="fw-semibold small mb-1">Properties</div>
        @if (selSeat(); as s) {
          <div class="row g-2">
            <div class="col-6"><label class="form-label small mb-0" for="sn">Seat number</label><input id="sn" class="form-control form-control-sm" [ngModel]="s.seatNumber" (ngModelChange)="upSeat({seatNumber: $event}, 'sn')" maxlength="10"></div>
            <div class="col-6"><label class="form-label small mb-0">Seat ID</label><input class="form-control form-control-sm" [value]="s.seatId" disabled></div>
            <div class="col-6"><label class="form-label small mb-0" for="sk">Kind</label><select id="sk" class="form-select form-select-sm" [ngModel]="s.kind" (ngModelChange)="upSeat({kind: $event})"><option value="seat">Seat</option><option value="berth">Berth</option></select></div>
            <div class="col-6"><label class="form-label small mb-0" for="sp">Position</label><select id="sp" class="form-select form-select-sm" [ngModel]="s.position" (ngModelChange)="upSeat({position: $event})"><option value="none">—</option><option value="window">Window</option><option value="aisle">Aisle</option><option value="middle">Middle</option></select></div>
            <div class="col-6"><label class="form-label small mb-0" for="sc">Category</label><select id="sc" class="form-select form-select-sm" [ngModel]="s.category" (ngModelChange)="upSeat({category: $event})">@for (c of cats; track c) { <option [value]="c">{{ c.replace('_',' ') }}</option> }</select></div>
            <div class="col-6"><label class="form-label small mb-0" for="spc">Pricing group</label><input id="spc" class="form-control form-control-sm" list="pc" [ngModel]="s.pricingCategory" (ngModelChange)="upSeat({pricingCategory: $event}, 'pc')" maxlength="30"><datalist id="pc">@for (c of cats; track c) { <option [value]="c"></option> }</datalist></div>
            <div class="col-6"><label class="form-label small mb-0" for="sr">Rotation</label><select id="sr" class="form-select form-select-sm" [ngModel]="s.rotation||0" (ngModelChange)="upSeat({rotation: +$event})"><option [ngValue]="0">0°</option><option [ngValue]="90">90°</option><option [ngValue]="180">180°</option><option [ngValue]="270">270°</option></select></div>
            <div class="col-6"><label class="form-label small mb-0" for="srs">Restriction</label><input id="srs" class="form-control form-control-sm" [ngModel]="s.restrictions||''" (ngModelChange)="upSeat({restrictions: $event}, 'rs')" maxlength="200" placeholder="e.g. women only"></div>
            <div class="col-12 d-flex flex-wrap gap-3">
              <div class="form-check"><input id="sb" type="checkbox" class="form-check-input" [ngModel]="s.bookable" (ngModelChange)="upSeat({bookable: $event})"><label class="form-check-label small" for="sb">Bookable</label></div>
              <div class="form-check"><input id="sa" type="checkbox" class="form-check-input" [ngModel]="s.active" (ngModelChange)="upSeat({active: $event})"><label class="form-check-label small" for="sa">Active</label></div>
              <div class="form-check"><input id="sx" type="checkbox" class="form-check-input" [ngModel]="s.accessible" (ngModelChange)="upSeat({accessible: $event})"><label class="form-check-label small" for="sx">Accessible</label></div></div>
          </div>
        } @else { @if (selEl(); as e) {
          <div class="row g-2">
            <div class="col-12"><span class="badge text-bg-secondary">{{ e.type.replace('_',' ') }}</span></div>
            <div class="col-12"><label class="form-label small mb-0" for="el">Label</label><input id="el" class="form-control form-control-sm" [ngModel]="e.label ?? ''" (ngModelChange)="upEl({label: $event}, 'el')" maxlength="40"></div>
            <div class="col-4"><label class="form-label small mb-0" for="rs">Row span</label><input id="rs" type="number" min="1" max="12" class="form-control form-control-sm" [ngModel]="e.rowSpan" (ngModelChange)="span('rowSpan', +$event)"></div>
            <div class="col-4"><label class="form-label small mb-0" for="cs">Col span</label><input id="cs" type="number" min="1" max="12" class="form-control form-control-sm" [ngModel]="e.colSpan" (ngModelChange)="span('colSpan', +$event)"></div>
            <div class="col-4"><label class="form-label small mb-0" for="er">Rotate</label><select id="er" class="form-select form-select-sm" [ngModel]="e.rotation||0" (ngModelChange)="upEl({rotation: +$event})"><option [ngValue]="0">0°</option><option [ngValue]="90">90°</option><option [ngValue]="180">180°</option><option [ngValue]="270">270°</option></select></div>
          </div>
        } @else { <div class="text-muted small">Select a seat or element on the canvas.</div> } }
        @if (sel()) {
          <div class="d-flex align-items-center gap-1 mt-2">
            <div class="btn-group btn-group-sm" role="group" aria-label="Move">
              <button class="btn btn-outline-secondary" (click)="move(-1,0)" aria-label="Move up"><i class="bi bi-arrow-up"></i></button><button class="btn btn-outline-secondary" (click)="move(1,0)" aria-label="Move down"><i class="bi bi-arrow-down"></i></button>
              <button class="btn btn-outline-secondary" (click)="move(0,-1)" aria-label="Move left"><i class="bi bi-arrow-left"></i></button><button class="btn btn-outline-secondary" (click)="move(0,1)" aria-label="Move right"><i class="bi bi-arrow-right"></i></button></div>
            <button class="btn btn-sm btn-outline-danger ms-auto" (click)="removeSel()"><i class="bi bi-trash"></i> Remove</button></div>
        }
      </div>
      <div class="card p-2"><div class="fw-semibold small mb-1">Validation</div>
        @if (!errors().length) { <div class="text-success small"><i class="bi bi-check-circle"></i> No problems found.</div> }
        @for (er of errors(); track $index) { <div class="small text-danger mb-1 pointer" (click)="focusIds(er.ids)"><i class="bi bi-exclamation-circle"></i> {{ er.message }}</div> }
      </div>
    </aside>
  </div>`,
})
export class LayoutDesignerComponent implements OnInit, OnDestroy {
  private api = inject(ApiService); private router = inject(Router);
  @Input() id = ''; @Input() template = '';

  CELL = 46; GAP = 6; EL = EL_TEXT; palette = PALETTE; cats = CATEGORIES;
  types = Object.entries(VEHICLE_TYPE_LABELS);
  templates = signal<{ key: string; label: string }[]>([]);
  doc = signal<Doc>(empty());
  tool = signal<Tool>('select'); sel = signal<Hit | null>(null); hover = signal('');
  errors = signal<{ message: string; ids: string[] }[]>([]); bad = computed(() => new Set(this.errors().flatMap((e) => e.ids || [])));
  preview = signal(false); busy = signal(false); usedBy = signal(0);
  private past: string[] = []; private future: string[] = [];
  canUndo = signal(false); canRedo = signal(false);
  private original = ''; private lastKey = ''; private lastAt = 0;
  private validate$ = new Subject<Doc>(); private sub?: Subscription;
  private dragging: Hit | null = null;

  bgCells = computed(() => { const d = this.doc(); const out: { r: number; c: number; key: string }[] = []; for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.columns; c++) out.push({ r, c, key: `${r},${c}` }); return out; });
  bookable = computed(() => this.doc().seats.filter((s) => s.bookable && s.active).length);
  selSeat = computed(() => { const s = this.sel(); return s?.kind === 'seat' ? this.doc().seats.find((x) => x.seatId === s.id) ?? null : null; });
  selEl = computed(() => { const s = this.sel(); return s?.kind === 'el' ? this.doc().elements.find((x) => x.id === s.id) ?? null : null; });
  asLayout = computed<Layout>(() => ({ ...this.doc(), seats: this.doc().seats, elements: this.doc().elements }));
  isSel = (k: string, id: string) => this.sel()?.kind === k && this.sel()?.id === id;

  ngOnInit() {
    this.api.get<any[]>('/vehicle-layouts/templates').subscribe((r) => this.templates.set(r.data));
    this.sub = this.validate$.pipe(debounceTime(350), switchMap((d) => this.api.post<any>('/vehicle-layouts/validate', d))).subscribe({
      next: (r) => this.errors.set(r.data.errors || []), error: () => {},
    });
    if (this.id) {
      this.api.get<any>(`/vehicle-layouts/${this.id}`).subscribe({
        next: (r) => { this.usedBy.set(r.data.usedByTrips || 0); this.setDoc(this.fromServer(r.data), true); }, error: (e) => notify.error(e, 'Layout not found'),
      });
    } else if (this.template) this.loadTemplate(this.template, true);
    else this.setDoc(empty(), true);
    window.addEventListener('keydown', this.keys);
  }
  ngOnDestroy() { this.sub?.unsubscribe(); window.removeEventListener('keydown', this.keys); }
  private keys = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
    else if (this.sel() && e.key === 'Delete') this.removeSel();
    else if (this.sel() && e.key.startsWith('Arrow')) { e.preventDefault(); this.move(e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0, e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0); }
  };

  private fromServer(l: any): Doc {
    const strip = (o: any) => JSON.parse(JSON.stringify(o, (k, v) => (k === '_id' || k === '__v' ? undefined : v)));
    return { name: l.name, vehicleType: l.vehicleType, rows: l.rows, columns: l.columns, seats: strip(l.seats), elements: strip(l.elements) };
  }
  private setDoc(d: Doc, asOriginal = false) {
    this.doc.set(d); this.sel.set(null);
    if (asOriginal) { this.original = JSON.stringify(d); this.past = []; this.future = []; this.canUndo.set(false); this.canRedo.set(false); }
    this.validate$.next(d);
  }

  loadTemplate(key: string, initial = false) {
    if (!key) return;
    this.api.get<any>(`/vehicle-layouts/templates/${key}`).subscribe({
      next: (r) => {
        const d = this.fromServer(r.data);
        if (initial) { this.setDoc({ ...d, name: this.templates().find((t) => t.key === key)?.label || d.name }, true); return; }
        this.snapshot(); this.setDoc({ ...d, name: this.doc().name || d.name });
      }, error: (e) => notify.error(e, 'Could not load template'),
    });
  }

  setName(v: string) { this.commit((d) => { d.name = v; }, 'name'); }
  setType(v: string) { this.commit((d) => { d.vehicleType = v; }); }

  // ---------- history ----------
  private snapshot(key = '') {
    const now = Date.now();
    if (key && key === this.lastKey && now - this.lastAt < 1200) { this.lastAt = now; return; } // coalesce typing
    this.lastKey = key; this.lastAt = now;
    this.past.push(JSON.stringify(this.doc())); if (this.past.length > 100) this.past.shift();
    this.future = []; this.canUndo.set(true); this.canRedo.set(false);
  }
  commit(fn: (d: Doc) => void, key = '') {
    this.snapshot(key);
    const d: Doc = JSON.parse(JSON.stringify(this.doc()));
    fn(d); this.doc.set(d); this.validate$.next(d);
  }
  undo() { const p = this.past.pop(); if (!p) return; this.future.push(JSON.stringify(this.doc())); this.setDoc(JSON.parse(p)); this.canUndo.set(this.past.length > 0); this.canRedo.set(true); this.lastKey = ''; }
  redo() { const n = this.future.pop(); if (!n) return; this.past.push(JSON.stringify(this.doc())); this.setDoc(JSON.parse(n)); this.canRedo.set(this.future.length > 0); this.canUndo.set(true); this.lastKey = ''; }
  async reset() {
    if (!(await notify.confirmDanger('Discard all unsaved changes?', '', 'Reset'))) return;
    this.snapshot(); this.setDoc(this.original ? JSON.parse(this.original) : empty());
  }

  // ---------- occupancy ----------
  private hitAt(d: Doc, r: number, c: number, ignore?: Hit): Hit | null {
    const s = d.seats.find((x) => x.row === r && x.col === c && !(ignore?.kind === 'seat' && ignore.id === x.seatId));
    if (s) return { kind: 'seat', id: s.seatId };
    const e = d.elements.find((x) => r >= x.row && r < x.row + (x.rowSpan || 1) && c >= x.col && c < x.col + (x.colSpan || 1) && !(ignore?.kind === 'el' && ignore.id === x.id));
    return e ? { kind: 'el', id: e.id } : null;
  }
  private uid() { return Math.random().toString(36).slice(2, 7); }
  private nextNumber(d: Doc) { const used = new Set(d.seats.map((s) => s.seatNumber)); let n = d.seats.length + 1; while (used.has(String(n))) n++; return String(n); }

  // ---------- canvas interaction ----------
  cellClick(r: number, c: number) {
    const t = this.tool();
    if (t === 'select' || t === 'erase') { this.sel.set(null); return; }
    this.place(t, r, c);
  }
  itemClick(ev: Event, kind: 'seat' | 'el', id: string, r: number, c: number) {
    ev.stopPropagation();
    if (this.tool() === 'erase') { this.remove({ kind, id }); return; }
    this.sel.set({ kind, id });
  }
  private place(t: Tool, r: number, c: number) {
    if (this.hitAt(this.doc(), r, c)) return;
    if (t === 'driver' && this.doc().elements.some((e) => e.type === 'driver')) { notify.toast('Only one driver position is allowed', 'info'); return; }
    let hit: Hit;
    if (t === 'seat' || t === 'berth') {
      const seatId = `S-${this.uid()}`; hit = { kind: 'seat', id: seatId };
      this.commit((d) => d.seats.push({ seatId, seatNumber: this.nextNumber(d), row: r, col: c, kind: t === 'berth' ? 'berth' : 'seat', category: t === 'berth' ? 'lower_sleeper' : 'regular',
        pricingCategory: t === 'berth' ? 'lower_sleeper' : 'regular', active: true, bookable: true, position: 'none', accessible: false, rotation: 0 }));
    } else {
      const id = `E-${t}-${this.uid()}`; hit = { kind: 'el', id };
      this.commit((d) => d.elements.push({ id, type: t as ElementType, row: r, col: c, rowSpan: 1, colSpan: 1, rotation: 0, label: EL_TEXT[t as string] }));
    }
    this.sel.set(hit);
  }
  remove(h: Hit) {
    this.commit((d) => { if (h.kind === 'seat') d.seats = d.seats.filter((s) => s.seatId !== h.id); else d.elements = d.elements.filter((e) => e.id !== h.id); });
    if (this.isSel(h.kind, h.id)) this.sel.set(null);
  }
  removeSel() { const s = this.sel(); if (s) this.remove(s); }

  // drag and drop
  onDrag(ev: DragEvent, kind: 'seat' | 'el', id: string) { this.dragging = { kind, id }; ev.dataTransfer?.setData('text/plain', id); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'; this.sel.set({ kind, id }); }
  onOver(ev: DragEvent, key: string) { if (this.dragging) { ev.preventDefault(); this.hover.set(key); } }
  onDrop(ev: DragEvent, r: number, c: number) {
    ev.preventDefault(); ev.stopPropagation(); this.hover.set('');
    const h = this.dragging; this.dragging = null;
    if (!h) return;
    this.moveTo(h, r, c);
  }
  private moveTo(h: Hit, r: number, c: number): boolean {
    const d = this.doc();
    const el = h.kind === 'el' ? d.elements.find((e) => e.id === h.id) : null;
    const rs = el?.rowSpan || 1, cs = el?.colSpan || 1;
    if (r < 0 || c < 0 || r + rs > d.rows || c + cs > d.columns) return false;
    // all target cells must be free (ignoring the item itself); two seats dropping onto each other swap
    for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) {
      const other = this.hitAt(d, i, j, h);
      if (other) {
        if (h.kind === 'seat' && other.kind === 'seat') {
          const a = d.seats.find((s) => s.seatId === h.id)!; const pa = { row: a.row, col: a.col };
          this.commit((x) => { const A = x.seats.find((s) => s.seatId === h.id)!; const B = x.seats.find((s) => s.seatId === other.id)!; B.row = pa.row; B.col = pa.col; A.row = r; A.col = c; });
          return true;
        }
        return false;
      }
    }
    this.commit((x) => { if (h.kind === 'seat') { const s = x.seats.find((q) => q.seatId === h.id)!; s.row = r; s.col = c; } else { const e = x.elements.find((q) => q.id === h.id)!; e.row = r; e.col = c; } });
    return true;
  }
  move(dr: number, dc: number) {
    const s = this.sel(); if (!s) return;
    const it = s.kind === 'seat' ? this.doc().seats.find((x) => x.seatId === s.id) : this.doc().elements.find((x) => x.id === s.id);
    if (it) this.moveTo(s, it.row + dr, it.col + dc);
  }

  // ---------- property edits ----------
  upSeat(p: Partial<Seat>, key = '') { const s = this.sel(); if (s) this.commit((d) => Object.assign(d.seats.find((x) => x.seatId === s.id)!, p), key); }
  upEl(p: Partial<LayoutElement>, key = '') { const s = this.sel(); if (s) this.commit((d) => Object.assign(d.elements.find((x) => x.id === s.id)!, p), key); }
  span(k: 'rowSpan' | 'colSpan', v: number) {
    const e = this.selEl(); if (!e || !Number.isInteger(v) || v < 1) return;
    const d = this.doc();
    const rs = k === 'rowSpan' ? v : e.rowSpan, cs = k === 'colSpan' ? v : e.colSpan;
    if (e.row + rs > d.rows || e.col + cs > d.columns) { notify.toast('Element would leave the grid', 'info'); return; }
    for (let i = e.row; i < e.row + rs; i++) for (let j = e.col; j < e.col + cs; j++) if (this.hitAt(d, i, j, { kind: 'el', id: e.id })) { notify.toast('That space is occupied', 'info'); return; }
    this.upEl({ [k]: v } as any);
  }
  duplicateSel() {
    const s = this.sel(); if (!s) return;
    const d = this.doc();
    const src = s.kind === 'seat' ? d.seats.find((x) => x.seatId === s.id)! : d.elements.find((x) => x.id === s.id)!;
    if (s.kind === 'el' && (src as LayoutElement).type === 'driver') { notify.toast('Only one driver position is allowed', 'info'); return; }
    const rs = s.kind === 'el' ? (src as LayoutElement).rowSpan : 1, cs = s.kind === 'el' ? (src as LayoutElement).colSpan : 1;
    for (let r = 0; r + rs <= d.rows; r++) for (let c = 0; c + cs <= d.columns; c++) {
      let free = true;
      for (let i = r; i < r + rs && free; i++) for (let j = c; j < c + cs; j++) if (this.hitAt(d, i, j)) { free = false; break; }
      if (!free) continue;
      const id = this.uid();
      this.commit((x) => {
        if (s.kind === 'seat') x.seats.push({ ...(src as Seat), seatId: `S-${id}`, seatNumber: this.nextNumber(x), row: r, col: c });
        else x.elements.push({ ...(src as LayoutElement), id: `E-${(src as LayoutElement).type}-${id}`, row: r, col: c });
      });
      this.sel.set({ kind: s.kind, id: s.kind === 'seat' ? `S-${id}` : `E-${(src as LayoutElement).type}-${id}` });
      return;
    }
    notify.toast('No free space in the grid. Add a row or column first.', 'info');
  }

  // ---------- grid ----------
  async resize(dr: number, dc: number) {
    const d = this.doc(); const rows = d.rows + dr, cols = d.columns + dc;
    if (rows < 1 || rows > 60 || cols < 1 || cols > 12) return;
    const outside = d.seats.filter((s) => s.row >= rows || s.col >= cols).length + d.elements.filter((e) => e.row + e.rowSpan > rows || e.col + e.colSpan > cols).length;
    if (outside && !(await notify.confirmDanger(`Remove ${outside} item(s) outside the smaller grid?`, '', 'Remove'))) return;
    this.commit((x) => {
      x.rows = rows; x.columns = cols;
      x.seats = x.seats.filter((s) => s.row < rows && s.col < cols);
      x.elements = x.elements.filter((e) => e.row + e.rowSpan <= rows && e.col + e.colSpan <= cols);
    });
  }
  insertRow() {
    const s = this.sel(); const d = this.doc();
    const it = s ? (s.kind === 'seat' ? d.seats.find((x) => x.seatId === s.id) : d.elements.find((x) => x.id === s.id)) : null;
    const at = it ? it.row + 1 : d.rows;
    if (d.rows >= 60) return;
    this.commit((x) => { x.rows++; x.seats.forEach((q) => { if (q.row >= at) q.row++; }); x.elements.forEach((q) => { if (q.row >= at) q.row++; else if (q.row + q.rowSpan > at) q.rowSpan++; }); });
  }

  renumber(mode: string) {
    if (!mode) return;
    this.commit((d) => {
      const seats = [...d.seats].sort((a, b) => a.row - b.row || a.col - b.col);
      if (mode === 'numeric') seats.forEach((s, i) => (s.seatNumber = String(i + 1)));
      else if (mode === 'rowletter') {
        const rows = [...new Set(seats.map((s) => s.row))];
        seats.forEach((s) => { const ri = rows.indexOf(s.row); s.seatNumber = `${String.fromCharCode(65 + (ri % 26))}${seats.filter((q) => q.row === s.row && q.col <= s.col).length}`; });
      } else {
        const cols = [...new Set(seats.map((s) => s.col))].sort((a, b) => a - b);
        seats.forEach((s) => { s.seatNumber = `${String.fromCharCode(65 + (cols.indexOf(s.col) % 26))}${[...new Set(seats.filter((q) => q.col === s.col && q.row <= s.row).map((q) => q.row))].length}`; });
      }
    });
  }
  focusIds(ids: string[]) {
    const id = ids?.[0]; if (!id) return;
    const d = this.doc();
    if (d.seats.some((s) => s.seatId === id)) this.sel.set({ kind: 'seat', id });
    else if (d.elements.some((e) => e.id === id)) this.sel.set({ kind: 'el', id });
  }

  // ---------- save ----------
  save() {
    const d = this.doc();
    if (!d.name.trim()) { notify.toast('Give the layout a name', 'error'); return; }
    this.busy.set(true);
    const body = { ...d, name: d.name.trim() };
    const req = this.id ? this.api.put<any>(`/vehicle-layouts/${this.id}`, body) : this.api.post<any>('/vehicle-layouts', body);
    req.subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.original = JSON.stringify(d);
        notify.success('Layout saved', r['message'] || `${r.data.bookableSeats} bookable seats`);
        if (!this.id || r['versioned']) this.router.navigate(['/admin/layouts', r.data._id], { replaceUrl: true });
      },
      error: (e) => {
        this.busy.set(false);
        const det = e?.error?.details; if (Array.isArray(det)) this.errors.set(det.map((x: any) => ({ message: x.message, ids: x.ids || [] })));
        notify.error(e, 'Layout not saved');
      },
    });
  }
}
