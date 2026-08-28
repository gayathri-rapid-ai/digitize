export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export async function api(path: string, token: string) { const res = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); if (!res.ok) throw new Error(await res.text()); return res.json(); }
export function bidFromToken(token: string): string { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).bid; }
