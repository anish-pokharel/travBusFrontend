import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pager',
  standalone: true,
  template: `
  @if (pages() > 1) {
    <nav class="d-flex justify-content-between align-items-center mt-3 no-print">
      <small class="text-muted">{{ total }} records · page {{ page }} of {{ pages() }}</small>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" [disabled]="page<=1" (click)="go.emit(page-1)">Prev</button>
        <button class="btn btn-outline-secondary" [disabled]="page>=pages()" (click)="go.emit(page+1)">Next</button>
      </div>
    </nav>
  }`,
})
export class PagerComponent {
  @Input() page = 1; @Input() limit = 20; @Input() total = 0;
  @Output() go = new EventEmitter<number>();
  pages = () => Math.max(1, Math.ceil(this.total / this.limit));
}
