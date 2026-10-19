import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';
import { ApiResponse, Role, User } from './models';

interface AuthPayload { user: User; accessToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Access token lives only in memory (not localStorage) so XSS cannot steal a long-lived credential.
   *  The refresh token is an httpOnly cookie the browser JS cannot read. */
  private token: string | null = null;
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  private refreshing: Promise<boolean> | null = null;

  get accessToken() { return this.token; }

  /** Called once at startup to restore a session from the refresh cookie. */
  async init(): Promise<void> { await this.refresh(); }

  private apply(p: AuthPayload) { this.token = p.accessToken; this.user.set(p.user); }

  async login(email: string, password: string): Promise<User> {
    const r = await firstValueFrom(this.http.post<ApiResponse<AuthPayload>>(`${API_URL}/auth/login`, { email, password }, { withCredentials: true }));
    this.apply(r.data);
    return r.data.user;
  }

  async register(body: { name: string; email: string; phone?: string; password: string }): Promise<User> {
    const r = await firstValueFrom(this.http.post<ApiResponse<AuthPayload>>(`${API_URL}/auth/register`, body, { withCredentials: true }));
    this.apply(r.data);
    return r.data.user;
  }

  /** Single-flight refresh so parallel 401s share one request. */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = firstValueFrom(this.http.post<ApiResponse<AuthPayload>>(`${API_URL}/auth/refresh`, {}, { withCredentials: true }))
        .then((r) => { this.apply(r.data); return true; })
        .catch(() => { this.token = null; this.user.set(null); return false; })
        .finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async logout(): Promise<void> {
    try { await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })); } catch { /* ignore */ }
    this.token = null;
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  setUser(u: User) { this.user.set(u); }

  homeFor(role?: Role | null): string {
    switch (role) {
      case 'admin': return '/admin';
      case 'counter': return '/counter';
      case 'passenger': return '/user';
      default: return '/';
    }
  }
}
