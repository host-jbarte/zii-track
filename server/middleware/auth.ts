import type { MiddlewareHandler } from 'hono'
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'tempo-ticker-secret-key-change-in-prod')

export const JWT_EXPIRY = '7d'

export async function signToken(payload: { id: number; email: string; role: string; name: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(JWT_EXPIRY)
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET)
  return payload as { id: number; email: string; role: string; name: string }
}

type AuthUser = { id: number; email: string; role: string; name: string }
type Env = { Variables: { user: AuthUser } }

export const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const user = await verifyToken(auth.slice(7))
    c.set('user', user)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}

export const requireManager: MiddlewareHandler<Env> = async (c, next) => {
  const user = c.get('user') as AuthUser | undefined
  if (!user || user.role !== 'manager') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
