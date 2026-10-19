import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/** Lightweight modal (no Bootstrap JS dependency, works with OnPush/zoneless). */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
  @if (open) {
    <div class="modal-backdrop fade show" (click)="closed.emit()"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" (click)="closed.emit()">
      <div class="modal-dialog modal-dialog-scrollable" [class.modal-lg]="size==='lg'" [class.modal-xl]="size==='xl'" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">{{ title }}</h5><button type="button" class="btn-close" aria-label="Close" (click)="closed.emit()"></button></div>
          <div class="modal-body"><ng-content /></div>
          <div class="modal-footer"><ng-content select="[footer]" /></div>
        </div>
      </div>
    </div>
  }`,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() size: '' | 'lg' | 'xl' = '';
  @Output() closed = new EventEmitter<void>();
  @HostListener('document:keydown.escape') esc() { if (this.open) this.closed.emit(); }
}
