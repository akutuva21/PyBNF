export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
