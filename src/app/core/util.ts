import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';

export function errMsg(e: unknown): string {
  const err = e as HttpErrorResponse;
  const body: any = err?.error;
  if (body?.details && Array.isArray(body.details) && body.details.length) {
    const first = body.details.slice(0, 4).map((d: any) => d.message || d.field).join('\n');
    return `${body.message || 'Error'}\n${first}`;
  }
  return body?.message || (err?.status === 0 ? 'Cannot reach the server. Check your connection.' : 'Something went wrong');
}

export const notify = {
  success: (title: string, text?: string) => Swal.fire({ icon: 'success', title, text, timer: 2200, showConfirmButton: false }),
  error: (e: unknown, title = 'Error') => Swal.fire({ icon: 'error', title, text: typeof e === 'string' ? e : errMsg(e), customClass: { htmlContainer: 'text-pre-line' } }),
  info: (title: string, text?: string) => Swal.fire({ icon: 'info', title, text }),
  toast: (title: string, icon: 'success' | 'error' | 'info' = 'success') =>
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2500 }),
  async confirm(title: string, text = '', confirmText = 'Yes'): Promise<boolean> {
    const r = await Swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText: confirmText, confirmButtonColor: '#0b5ed7' });
    return r.isConfirmed;
  },
  async confirmDanger(title: string, text = '', confirmText = 'Yes, do it'): Promise<boolean> {
    const r = await Swal.fire({ icon: 'warning', title, text, showCancelButton: true, confirmButtonText: confirmText, confirmButtonColor: '#d33' });
    return r.isConfirmed;
  },
  async prompt(title: string, placeholder = ''): Promise<string | null> {
    const r = await Swal.fire({ title, input: 'text', inputPlaceholder: placeholder, showCancelButton: true });
    return r.isConfirmed ? (r.value || '') : null;
  },
};

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Nepal-time helpers (Asia/Kathmandu) so dates match what passengers expect. */
export const npDate = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: '2-digit', month: 'short', year: 'numeric' });
export const npTime = (d: string | Date) => new Date(d).toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' });
export const npDateTime = (d: string | Date) => `${npDate(d)} ${npTime(d)}`;
export const money = (n: number | undefined | null) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const duration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
/** value for <input type="date"> in Nepal time */
export const todayNp = () => new Date(Date.now() + (5 * 60 + 45) * 60000).toISOString().slice(0, 10);
