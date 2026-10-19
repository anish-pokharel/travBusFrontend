declare global {
  interface Window { __env?: { apiUrl?: string } }
}

/** Runtime config from /env.js so the same build can be deployed anywhere (no rebuild to change the API URL). */
export const API_URL: string = (window.__env && window.__env.apiUrl) || '/api';
