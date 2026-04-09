import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export interface JwtPayload {
  sub: number       // user id
  username: string
  role: string
  iat?: number
  exp?: number
}

function jwtSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s || s === 'change_me_generate_random_64_byte_hex') {
    console.warn('[auth] JWT_SECRET is not set – using insecure fallback')
    return 'remview_dev_secret_change_in_production'
  }
  return s
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret()) as JwtPayload
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export function checkPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

/** Extract Bearer token from Authorization header */
export function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null
  return parts[1]
}
