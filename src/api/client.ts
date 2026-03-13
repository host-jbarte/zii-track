function getToken() {
  return localStorage.getItem('tempo_token')
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('tempo_token')
    localStorage.removeItem('tempo_user')
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  auth: {
    register: (data: any) => req<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) => req<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => req<any>('/auth/me'),
    updateProfile: (data: any) => req<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data: any) => req<any>('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
  analytics: {
    daily: (params?: Record<string, string>) =>
      req<any[]>('/analytics/daily' + (params ? '?' + new URLSearchParams(params) : '')),
  },
  users: {
    list: () => req<any[]>('/users'),
    updateRole: (id: number, role: string) => req<any>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    delete: (id: number) => req<any>(`/users/${id}`, { method: 'DELETE' }),
  },
  entries: {
    list: (p?: Record<string, string>) =>
      req<any[]>('/entries' + (p ? '?' + new URLSearchParams(p) : '')),
    running: () => req<any | null>('/entries/running'),
    start: (data: any) => req<any>('/entries/start', { method: 'POST', body: JSON.stringify(data) }),
    startBreak: () => req<any>('/entries/break', { method: 'POST' }),
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
