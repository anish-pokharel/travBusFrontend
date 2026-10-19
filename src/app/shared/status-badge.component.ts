import { Component, Input } from '@angular/core';

const MAP: Record<string, string> = {
  confirmed: 'success', paid: 'success', success: 'success', completed: 'success', active: 'success', valid: 'success', available: 'success', scheduled: 'primary',
  pending: 'warning', held: 'warning', boarding: 'info', departed: 'info', partially_refunded: 'warning', unpaid: 'secondary',
  cancelled: 'danger', failed: 'danger', rejected: 'danger', inactive: 'secondary', refunded: 'dark', expired: 'secondary', invalid: 'danger', checked_in: 'info', booked: 'secondary', blocked: 'dark',
};

@Component({ selector: 'app-badge', standalone: true, template: `<span class="badge text-bg-{{ cls() }} text-capitalize">{{ text().replace('_',' ') }}</span>` })
export class StatusBadgeComponent {
  @Input() value: string | null | undefined = '';
  text = () => this.value || '-';
  cls = () => MAP[this.value || ''] || 'secondary';
}
