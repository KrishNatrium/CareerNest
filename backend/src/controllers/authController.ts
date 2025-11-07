import { Request, Response } from 'express'
import { AuthService } from '../services/authService'
import { UserModel, UserSkillModel, UserPreferencesModel } from '../models/User'
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  userSkillsSchema,
  userPreferencesSchema
} from '../validation/auth.validation'

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<Response | void> {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Register user
      const result = await AuthService.register(value)

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: error.message
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user'
        }
      })
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<Response | void> {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Login user
      const result = await AuthService.login(value)

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      })
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.message === 'Invalid email or password' || error.message === 'User account is inactive') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Failed to login'
        }
      })
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<Response | void> {
    try {
      // Validate input
      const { error, value } = refreshTokenSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Refresh token
      const result = await AuthService.refreshToken(value.refreshToken)

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: result.tokens
        }
      })
    } catch (error: any) {
      console.error('Token refresh error:', error)
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      })
    }
  }

  /**
   * Logout user
   */
  static async logout(_req: Request, res: Response): Promise<Response | void> {
    try {
      const result = await AuthService.logout()
      
      res.json({
        success: true,
        message: result.message
      })
    } catch (error: any) {
      console.error('Logout error:', error)
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Failed to logout'
        }
      })
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      }

      // Get user with details (skills and preferences)
      const userWithDetails = await UserModel.findByIdWithDetails(req.user.id)
      
      if (!userWithDetails) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      res.json({
        success: true,
        data: {
          user: userWithDetails
        }
      })
    } catch (error: any) {
      console.error('Get profile error:', error)
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        }
      })
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      }

      // Validate input
      const { error, value } = updateProfileSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Update user
      const updatedUser = await UserModel.update(req.user.id, value)
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      })
    } catch (error: any) {
      console.error('Update profile error:', error)
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Failed to update profile'
        }
      })
    }
  }

  /**
   * Change user password
   */
  static async changePassword(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      }

      // Validate input
      const { error, value } = changePasswordSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Change password
      const result = await AuthService.changePassword(
        req.user.id,
        value.currentPassword,
        value.newPassword
      )

      res.json({
        success: true,
        message: result.message
      })
    } catch (error: any) {
      console.error('Change password error:', error)
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: error.message
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Failed to change password'
        }
      })
    }
  }

  /**
   * Update user skills
   */
  static async updateSkills(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      }

      // Validate input
      const { error, value } = userSkillsSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Update skills
      const updatedSkills = await UserSkillModel.bulkUpdate(req.user.id, value.skills)

      res.json({
        success: true,
        message: 'Skills updated successfully',
        data: {
          skills: updatedSkills
        }
      })
    } catch (error: any) {
      console.error('Update skills error:', error)
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SKILLS_UPDATE_FAILED',
          message: 'Failed to update skills'
        }
      })
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      }

      // Validate input
      const { error, value } = userPreferencesSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        })
      }

      // Update preferences
      const updatedPreferences = await UserPreferencesModel.upsert(req.user.id, value)

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          preferences: updatedPreferences
        }
      })
    } catch (error: any) {
      console.error('Update preferences error:', error)
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_FAILED',
          message: 'Failed to update preferences'
        }
      })
    }
  }
}