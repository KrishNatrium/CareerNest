import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt'
import { UserModel } from '../models/User'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        first_name: string
        last_name: string
        phone?: string
        location?: string
        is_active: boolean
        email_verified: boolean
        created_at: Date
        updated_at: Date
      }
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      })
    }

    // Verify token
    const decoded = verifyAccessToken(token)
    
    // Get user from database
    const user = await UserModel.findById(decoded.userId)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      })
    }

    // Check if user is active and email is verified
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      })
    }

    // Attach user to request
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token'
      }
    })
  }
}

/**
 * Optional authentication middleware - attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    
    if (!token) {
      return next()
    }

    // Verify token
    const decoded = verifyAccessToken(token)
    
    // Get user from database
    const user = await UserModel.findById(decoded.userId)
    
    if (user && user.is_active) {
      req.user = user
    }
    
    next()
  } catch (error) {
    // If token is invalid, just continue without user
    next()
  }
}

/**
 * Middleware to check if user email is verified
 */
export function requireEmailVerification(req: Request, res: Response, next: NextFunction): Response | void {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      }
    })
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required'
      }
    })
  }

  next()
}

/**
 * Middleware to check if user is admin (placeholder for future admin functionality)
 */
export function requireAdmin(req: Request, res: Response, _next: NextFunction): Response {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      }
    })
  }

  // For now, we don't have admin roles implemented
  // This is a placeholder for future admin functionality
  return res.status(403).json({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Admin access required'
    }
  })
}