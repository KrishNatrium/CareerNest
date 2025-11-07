import jwt from 'jsonwebtoken'

export interface JWTPayload {
    userId: number
    email: string
    type: 'access' | 'refresh'
}

export interface TokenPair {
    accessToken: string
    refreshToken: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

/**
 * Generate access token
 */
export function generateAccessToken(userId: number, email: string): string {
    const payload: JWTPayload = {
        userId,
        email,
        type: 'access'
    }

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'internship-aggregator',
        audience: 'internship-aggregator-users'
    } as jwt.SignOptions)
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: number, email: string): string {
    const payload: JWTPayload = {
        userId,
        email,
        type: 'refresh'
    }

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'internship-aggregator',
        audience: 'internship-aggregator-users'
    } as jwt.SignOptions)
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(userId: number, email: string): TokenPair {
    return {
        accessToken: generateAccessToken(userId, email),
        refreshToken: generateRefreshToken(userId, email)
    }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'internship-aggregator',
            audience: 'internship-aggregator-users'
        }) as JWTPayload

        if (decoded.type !== 'access') {
            throw new Error('Invalid token type')
        }

        return decoded
    } catch (error) {
        throw new Error('Invalid access token')
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'internship-aggregator',
            audience: 'internship-aggregator-users'
        }) as JWTPayload

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type')
        }

        return decoded
    } catch (error) {
        throw new Error('Invalid refresh token')
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null

    return parts[1]
}