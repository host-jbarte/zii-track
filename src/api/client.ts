async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  entries: {
    list: (p?: Record<string, string>) =>
      req<any[]>('/entries' + (p ? '?' + new URLSearchParams(p) : '')),
    running: () => req<any | null>('/entries/running'),
    start: (data: any) => req<any>('/entries/start', { method: 'POST', body: JSON.stringify(data) }),
    stop: (id: number) => req<any>(`/entries/${id}/stop`, { method: 'POST' }),
    create: (data: any) => req<any>('/entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<any>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<any>(`/entries/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => req<any[]>('/projects'),
    create: (data: any) => req<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<any>(`/projects/${id}`, { method: 'DELETE' }),
  },
  clients: {
    list: () => req<any[]>('/clients'),
    create: (data: any) => req<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<any>(`/clients/${id}`, { method: 'DELETE' }),
  },
  reports: {
    get: (p?: Record<string, string>) =>
      req<any>('/reports' + (p ? '?' + new URLSearchParams(p) : '')),
  },
}
