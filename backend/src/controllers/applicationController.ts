import { Request, Response } from 'express'
import { UserApplicationModel } from '../models/UserApplication'
import { ApplicationStatus, UserApplicationCreateInput, UserApplicationUpdateInput } from '../types/internship.types'
import { ReminderService } from '../services/ReminderService'
import { validateApplication } from '../validation/application.validation'

export class ApplicationController {
  /**
   * Create or update an application
   */
  static async createApplication(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      
      // Validate request body
      const { error, value } = validateApplication.create(req.body)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        })
      }

      const applicationData: UserApplicationCreateInput = value

      const application = await UserApplicationModel.create(userId, applicationData)

      return res.status(201).json({
        success: true,
        data: application
      })
    } catch (error) {
      console.error('Error creating application:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create application'
        }
      })
    }
  }

  /**
   * Get user's applications with optional filtering
   */
  static async getUserApplications(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      
      // Validate query parameters
      const { error, value } = validateApplication.query(req.query)
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        })
      }

      const { status, limit = 50, offset = 0 } = value
      const applicationStatus = status as ApplicationStatus | undefined

      const result = await UserApplicationModel.findByUserIdWithInternships(
        userId,
        applicationStatus,
        limit,
        offset
      )

      return res.json({
        success: true,
        data: {
          applications: result.applications,
          pagination: {
            total: result.total_count,
            limit,
            offset,
            has_more: result.total_count > offset + limit
          }
        }
      })
    } catch (error) {
      console.error('Error fetching applications:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch applications'
        }
      })
    }
  }

  /**
   * Update application status and details
   */
  static async updateApplication(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const applicationId = parseInt(req.params.id)
      const updateData: UserApplicationUpdateInput = req.body

      if (isNaN(applicationId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid application ID'
          }
        })
      }

      // Check if application exists and belongs to user
      const existingApplication = await UserApplicationModel.findById(applicationId)
      if (!existingApplication) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        })
      }

      if (existingApplication.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        })
      }

      // Validate application status if provided
      if (updateData.application_status) {
        const validStatuses: ApplicationStatus[] = [
          'applied', 'under_review', 'interview_scheduled', 'interviewed',
          'offered', 'accepted', 'rejected', 'withdrawn'
        ]
        
        if (!validStatuses.includes(updateData.application_status)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid application status'
            }
          })
        }
      }

      const updatedApplication = await UserApplicationModel.update(applicationId, updateData)

      return res.json({
        success: true,
        data: updatedApplication
      })
    } catch (error) {
      console.error('Error updating application:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update application'
        }
      })
    }
  }

  /**
   * Delete application
   */
  static async deleteApplication(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const applicationId = parseInt(req.params.id)

      if (isNaN(applicationId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid application ID'
          }
        })
      }

      // Check if application exists and belongs to user
      const existingApplication = await UserApplicationModel.findById(applicationId)
      if (!existingApplication) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          }
        })
      }

      if (existingApplication.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        })
      }

      const deleted = await UserApplicationModel.delete(applicationId)
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete application'
          }
        })
      }

      return res.json({
        success: true,
        message: 'Application deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting application:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete application'
        }
      })
    }
  }

  /**
   * Get application statistics for the user
   */
  static async getApplicationStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const stats = await UserApplicationModel.getStatsByUserId(userId)

      return res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error('Error fetching application stats:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch application statistics'
        }
      })
    }
  }

  /**
   * Get applications with upcoming reminders
   */
  static async getUpcomingReminders(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const { days = 7 } = req.query
      
      const parsedDays = Math.min(Math.max(parseInt(days as string) || 7, 1), 30)
      
      const applications = await UserApplicationModel.findUpcomingReminders(parsedDays)
      
      // Filter to only include current user's applications
      const userApplications = applications.filter(app => app.user_id === userId)

      return res.json({
        success: true,
        data: userApplications
      })
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch upcoming reminders'
        }
      })
    }
  }

  /**
   * Check if user has applied to a specific internship
   */
  static async checkApplicationStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const internshipId = parseInt(req.params.internshipId)

      if (isNaN(internshipId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid internship ID'
          }
        })
      }

      const application = await UserApplicationModel.findByUserAndInternship(userId, internshipId)

      return res.json({
        success: true,
        data: {
          has_applied: !!application,
          application: application || null
        }
      })
    } catch (error) {
      console.error('Error checking application status:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check application status'
        }
      })
    }
  }

  /**
   * Get application insights and recommendations
   */
  static async getApplicationInsights(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.id
      const insights = await ReminderService.getApplicationInsights(userId)

      return res.json({
        success: true,
        data: insights
      })
    } catch (error) {
      console.error('Error fetching application insights:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch application insights'
        }
      })
    }
  }
}