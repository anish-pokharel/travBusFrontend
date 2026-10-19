import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Layout, LayoutElement, Seat, SeatState } from '../../core/models';

interface Cell { kind: 'seat' | 'el'; seat?: Seat; el?: LayoutElement; cls: string; label: string; sub?: string; clickable: boolean; style: Record<string, string>; title: string; }

const EL_LABEL: Record<string, string> = {
  driver: 'Driver', front_door: 'Door', rear_door: 'Rear door', side_door: 'Side door', emergency_exit: 'Exit', luggage: 'Luggage',
  restricted: 'Restricted', staff: 'Staff', label: '', aisle: '', empty: '',
};

/**
 * Renders ANY saved layout. Nothing about a specific vehicle is hardcoded: the grid, seats, doors
 * and special areas all come from the layout document the admin designed.
 */
@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="text-center">
    <div class="vehicle-shell" [style.max-width.%]="100">
      <div class="vehicle-front"><i class="bi bi-arrow-up"></i> FRONT</div>
      <div class="seat-grid" [style.gridTemplateColumns]="'repeat(' + cols() + ', ' + cell + 'px)'"
           [style.gridTemplateRows]="'repeat(' + rows() + ', ' + cell + 'px)'" [style.gap.px]="gap">
        @for (c of cells(); track $index) {
          <div class="cell" [class]="c.cls" [ngStyle]="c.style" [attr.title]="c.title"
               (click)="c.clickable && c.seat && toggle.emit(c.seat.seatId)">
            <span>{{ c.label }}</span>
            @if (c.sub) { <span class="price">{{ c.sub }}</span> }
          </div>
        }
      </div>
    </div>
    @if (showLegend) {
      <div class="legend small mt-3 d-flex flex-wrap gap-3 justify-content-center">
        <span><i class="dot" style="background:var(--seat-available);border-color:var(--seat-available-border)"></i>Available</span>
        <span><i class="dot" style="background:var(--seat-selected);border-color:#0d47a1"></i>Selected</span>
        <span><i class="dot" style="background:var(--seat-held);border-color:#ef6c00"></i>Reserved (temporary)</span>
        <span><i class="dot" style="background:var(--seat-booked);border-color:#616161"></i>Booked</span>
        <span><i class="dot" style="background:var(--seat-blocked);border-color:#3e2723"></i>Blocked / unavailable</span>
      </div>
    }
  </div>`,
})
export class SeatMapComponent {
  private _layout = signal<Layout | null>(null);
  private _state = signal<Record<string, SeatState>>({});
  private _selected = signal<string[]>([]);
  private _invalid = signal<string[]>([]);
  private _interactive = signal(true);

  @Input({ required: true }) set layout(v: Layout | null) { this._layout.set(v); }
  /** per-trip live state keyed by seatId. When empty (designer preview) every seat is shown available. */
  @Input() set state(v: Record<string, SeatState> | null) { this._state.set(v || {}); }
  @Input() set selected(v: string[] | null) { this._selected.set(v || []); }
  @Input() set invalidIds(v: string[] | null) { this._invalid.set(v || []); }
  @Input() set interactive(v: boolean) { this._interactive.set(v); }
  /** statuses that can be clicked; admins also allow 'blocked' to unblock seats */
  @Input() selectableStatuses: string[] = ['available'];
  @Input() showPrice = true;
  @Input() showLegend = true;
  @Input() cell = 46;
  @Input() gap = 6;
  @Output() toggle = new EventEmitter<string>();

  cols = computed(() => this._layout()?.columns || 1);
  rows = computed(() => this._layout()?.rows || 1);

  cells = computed<Cell[]>(() => {
    const l = this._layout();
    if (!l) return [];
    const state = this._state();
    const sel = new Set(this._selected());
    const bad = new Set(this._invalid());
    const out: Cell[] = [];

    for (const e of l.elements || []) {
      out.push({
        kind: 'el', el: e, clickable: false, label: e.label ?? EL_LABEL[e.type] ?? '',
        cls: `el ${e.type}${bad.has(e.id) ? ' invalid' : ''}`, title: e.type.replace('_', ' '),
        style: { gridRow: `${e.row + 1} / span ${e.rowSpan || 1}`, gridColumn: `${e.col + 1} / span ${e.colSpan || 1}`, transform: e.rotation ? `rotate(${e.rotation}deg)` : '' },
      });
    }
    for (const s of l.seats || []) {
      const st = state[s.seatId];
      let status: string = !s.bookable ? 'blocked' : (st?.status || 'available');
      if (!st && !s.bookable) status = 'blocked';
      const isSel = sel.has(s.seatId);
      const clickable = this._interactive() && !!st && this.selectableStatuses.includes(st.status) && s.bookable && s.active;
      let cls = `seat ${s.kind === 'berth' ? 'berth ' : ''}${isSel ? 'selected' : status}`;
      if (!s.active) cls += ' inactive';
      if (s.category === 'premium' || s.category === 'vip') cls += ' premium';
      if (bad.has(s.seatId)) cls += ' invalid';
      out.push({
        kind: 'seat', seat: s, clickable: this._interactive() ? clickable : false,
        label: s.seatNumber,
        sub: this.showPrice && st ? `${st.price}` : undefined,
        cls, title: `${s.seatNumber} · ${s.category}${st ? ` · Rs. ${st.price} · ${isSel ? 'selected' : status}` : ''}${s.position !== 'none' ? ` · ${s.position}` : ''}`,
        style: { gridRow: `${s.row + 1}`, gridColumn: `${s.col + 1}`, transform: s.rotation ? `rotate(${s.rotation}deg)` : '' },
      });
    }
    return out;
  });
}
