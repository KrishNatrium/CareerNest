import api, { tokenManager } from './api'
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UserWithDetails,
  ProfileUpdateData,
  ChangePasswordData,
  UserSkillInput,
  UserPreferencesInput
} from '../types/auth.types'

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data)
    
    if (response.data.success) {
      const { accessToken, refreshToken } = response.data.data.tokens
      tokenManager.setTokens(accessToken, refreshToken)
    }
    
    return response.data
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials)
    
    if (response.data.success) {
      const { accessToken, refreshToken } = response.data.data.tokens
      tokenManager.setTokens(accessToken, refreshToken)
    }
    
    return response.data
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout fails on server, clear local tokens
      console.error('Logout error:', error)
    } finally {
      tokenManager.clearTokens()
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<UserWithDetails> {
    const response = await api.get('/auth/profile')
    return response.data.data.user
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await api.put('/auth/profile', data)
    return response.data.data.user
  }

  /**
   * Change password
   */
  static async changePassword(data: ChangePasswordData): Promise<void> {
    await api.put('/auth/change-password', data)
  }

  /**
   * Update user skills
   */
  static async updateSkills(skills: UserSkillInput[]): Promise<void> {
    await api.put('/auth/skills', { skills })
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: UserPreferencesInput): Promise<void> {
    await api.put('/auth/preferences', preferences)
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<void> {
    const refreshToken = tokenManager.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post('/auth/refresh-token', { refreshToken })
    const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens
    tokenManager.setTokens(accessToken, newRefreshToken)
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!tokenManager.getAccessToken()
  }
}