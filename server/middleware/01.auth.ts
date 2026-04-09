// server/middleware/01.auth.ts
// Validates JWT token on all /api/* routes except public ones.
import { verifyToken, extractBearer } from '~/server/utils/auth'

const PUBLIC_ROUTES = [
  '/api/hostname',
  '/api/auth/login',
]

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Only guard /api/* routes
  if (!path.startsWith('/api/')) return

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) return

  const authHeader = getRequestHeader(event, 'authorization')
  const token      = extractBearer(authHeader)

  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized – token missing' })
  }

  try {
    const payload = verifyToken(token)
    // Attach payload to event context for downstream handlers
    event.context.user = payload
  } catch {
    throw createError({ statusCode: 401, message: 'Unauthorized – invalid or expired token' })
  }
})
