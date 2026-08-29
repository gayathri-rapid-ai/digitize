'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Scope = { bid: string; storeId: string };
const base = ({ bid, storeId }: Scope) => `/api/business/${bid}/stores/${storeId}`;

export function SettingsPanel(scope: Scope) {
  const [currency, setCurrency] = useState('USD'); const [timezone, setTimezone] = useState('UTC'); const [message, setMessage] = useState('');
  const token = typeof window === 'undefined' ? null : localStorage.getItem('digitize_token');
  useEffect(() => { if (token) api<Record<string, unknown>>(`${base(scope)}/store`, token).then((settings) => { setCurrency(String(settings.currency ?? 'USD')); setTimezone(String(settings.timezone ?? 'UTC')); }).catch((error) => setMessage(error.message)); }, [scope.bid, scope.storeId]);
  const save = async (event: FormEvent) => { event.preventDefault(); if (!token) return; try { await api(`${base(scope)}/store`, token, { method: 'PATCH', body: JSON.stringify({ currency, timezone }) }); setMessage('Store settings saved.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save settings'); } };
  return <><div className="page-head"><div><h1>Store settings</h1><p className="muted">Configure the defaults for this store.</p></div></div><section className="panel narrow"><form className="form-grid" onSubmit={save}><label>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} required /></label><label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} required /></label><button>Save settings</button>{message && <p className="notice">{message}</p>}</form></section></>;
}

type Member = { userId: string; tenantId: string; role: string; active: boolean };
export function TeamPanel(scope: Scope) {
  const [members, setMembers] = useState<Member[]>([]); const [userId, setUserId] = useState(''); const [role, setRole] = useState('STAFF'); const [message, setMessage] = useState('');
  const token = typeof window === 'undefined' ? null : localStorage.getItem('digitize_token');
  const endpoint = `${base(scope)}/members`;
  const load = async () => { if (!token) return; try { setMembers(await api<Member[]>(endpoint, token)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Only business owners can manage team access.'); } };
  useEffect(() => { void load(); }, [scope.bid, scope.storeId]);
  const save = async (event: FormEvent) => { event.preventDefault(); if (!token) return; try { const member = await api<Member>(endpoint, token, { method: 'POST', body: JSON.stringify({ userId, role }) }); setMembers((current) => [...current.filter((entry) => entry.userId !== member.userId), member]); setUserId(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update team member'); } };
  const update = async (member: Member, active: boolean) => { if (!token) return; try { const result = await api<Member>(`${endpoint}/${member.userId}`, token, { method: 'PATCH', body: JSON.stringify({ role: member.role, active }) }); setMembers((current) => current.map((entry) => entry.userId === member.userId ? result : entry)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update member'); } };
  return <><div className="page-head"><div><h1>Team</h1><p className="muted">Assign business roles and remove access when needed.</p></div></div><div className="manager-grid"><section className="panel"><h2>Add or update member</h2><form className="form-grid" onSubmit={save}><label>User ID<input value={userId} onChange={(event) => setUserId(event.target.value)} required /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option>STAFF</option><option>ADMIN</option><option>OWNER</option></select></label><button>Save member</button></form>{message && <p className="notice">{message}</p>}</section><section className="panel"><h2>Members</h2>{members.length === 0 ? <p className="muted">No members found.</p> : <div className="record-list">{members.map((member) => <article key={member.userId} className="record"><div><strong>{member.userId.slice(0, 8)}</strong><p className="muted">{member.role} · {member.active ? 'Active' : 'Inactive'}</p></div><button className="secondary" onClick={() => void update(member, !member.active)}>{member.active ? 'Deactivate' : 'Activate'}</button></article>)}</div>}</section></div></>;
}

export function AnalyticsPanel(scope: Scope) {
  const [data, setData] = useState<Record<string, number>>({}); const [message, setMessage] = useState('');
  const token = typeof window === 'undefined' ? null : localStorage.getItem('digitize_token');
  useEffect(() => { if (token) api<Record<string, number>>(`${base(scope)}/analytics`, token).then(setData).catch((error) => setMessage(error.message)); }, [scope.bid, scope.storeId]);
  return <><div className="page-head"><div><h1>Analytics</h1><p className="muted">A live summary based on your store records.</p></div></div>{message ? <p className="notice">{message}</p> : <div className="cards">{['products', 'orders', 'customers'].map((key) => <div className="card" key={key}><span className="muted">{key}</span><div className="metric">{data[key] ?? '—'}</div></div>)}</div>}</>;
}
