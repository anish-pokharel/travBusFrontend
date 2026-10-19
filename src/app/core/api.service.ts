import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import { ApiResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private params(p?: Record<string, any>): HttpParams {
    let hp = new HttpParams();
    Object.entries(p || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return;
      if (Array.isArray(v)) v.forEach((x) => (hp = hp.append(k, String(x))));
      else hp = hp.set(k, String(v));
    });
    return hp;
  }

  get<T = any>(path: string, params?: Record<string, any>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${API_URL}${path}`, { params: this.params(params) });
  }
  post<T = any>(path: string, body: any = {}): Observable<ApiResponse<T>> { return this.http.post<ApiResponse<T>>(`${API_URL}${path}`, body); }
  put<T = any>(path: string, body: any = {}): Observable<ApiResponse<T>> { return this.http.put<ApiResponse<T>>(`${API_URL}${path}`, body); }
  patch<T = any>(path: string, body: any = {}): Observable<ApiResponse<T>> { return this.http.patch<ApiResponse<T>>(`${API_URL}${path}`, body); }
  delete<T = any>(path: string): Observable<ApiResponse<T>> { return this.http.delete<ApiResponse<T>>(`${API_URL}${path}`); }

  /** Authenticated CSV download (Bearer token goes through the interceptor). */
  csv(path: string, params?: Record<string, any>): Observable<Blob> {
    return this.http.get(`${API_URL}${path}`, { params: this.params({ ...params, format: 'csv' }), responseType: 'blob' });
  }
}
