import { UserModel } from '../models/User'
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt'
import { UserCreateInput, UserPublic } from '../types/user.types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user: UserPublic
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface RefreshTokenResponse {
  success: boolean
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: UserCreateInput): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Create user
      const user = await UserModel.create(userData)

      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email)

      return {
        success: true,
        user,
        tokens
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials

      // Verify user credentials
      const user = await UserModel.verifyPassword(email, password)
      if (!user) {
        throw new Error('Invalid email or password')
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('User account is inactive')
      }

      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email)

      return {
        success: true,
        user,
        tokens
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken)

      // Get user to ensure they still exist and are active
      const user = await UserModel.findById(decoded.userId)
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive')
      }

      // Generate new token pair
      const tokens = generateTokenPair(user.id, user.email)

      return {
        success: true,
        tokens
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Validate user session (used by middleware)
   */
  static async validateSession(userId: number): Promise<UserPublic | null> {
    try {
      const user = await UserModel.findById(userId)
      return user && user.is_active ? user : null
    } catch (error) {
      return null
    }
  }

  /**
   * Logout user (in a stateless JWT system, this is mainly for client-side cleanup)
   * In the future, we could implement token blacklisting with Redis
   */
  static async logout(): Promise<{ success: boolean; message: string }> {
    // In a stateless JWT system, logout is handled client-side by removing tokens
    // Here we could implement token blacklisting if needed
    return {
      success: true,
      message: 'Logged out successfully'
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password hash
      const user = await UserModel.findByEmail('')
      if (!user) {
        throw new Error('User not found')
      }

      // First get user by ID to get email, then verify password
      const userPublic = await UserModel.findById(userId)
      if (!userPublic) {
        throw new Error('User not found')
      }

      // Verify current password
      const isValidPassword = await UserModel.verifyPassword(userPublic.email, currentPassword)
      if (!isValidPassword) {
        throw new Error('Current password is incorrect')
      }

      // Hash new password and update
      const bcrypt = require('bcryptjs')
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Update password in database
      const { pool } = require('../config/database')
      const client = await pool.connect()
      try {
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newPasswordHash, userId]
        )
      } finally {
        client.release()
      }

      return {
        success: true,
        message: 'Password changed successfully'
      }
    } catch (error) {
      throw error
    }
  }
}