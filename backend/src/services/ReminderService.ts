import { UserApplicationModel } from '../models/UserApplication'
import { UpdateNotificationModel } from '../models/UpdateNotification'
import { UserApplicationWithInternship } from '../types/internship.types'

export class ReminderService {
  /**
   * Process upcoming application deadlines and send reminders
   */
  static async processUpcomingDeadlines(): Promise<void> {
    try {
      console.log('Processing upcoming application deadlines...')
      
      // Get applications with deadlines in the next 7 days
      const upcomingApplications = await UserApplicationModel.findUpcomingReminders(7)
      
      for (const application of upcomingApplications) {
        await this.sendDeadlineReminder(application)
      }
      
      console.log(`Processed ${upcomingApplications.length} upcoming deadline reminders`)
    } catch (error) {
      console.error('Error processing upcoming deadlines:', error)
    }
  }

  /**
   * Send deadline reminder notification for an application
   */
  private static async sendDeadlineReminder(application: UserApplicationWithInternship): Promise<void> {
    try {
      const { internship } = application
      
      if (!internship.application_deadline) {
        return
      }

      const daysUntilDeadline = Math.ceil(
        (new Date(internship.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      let title: string
      let message: string

      if (daysUntilDeadline <= 1) {
        title = 'Application Deadline Today!'
        message = `The application deadline for ${internship.title} at ${internship.company_name} is today.`
      } else if (daysUntilDeadline <= 3) {
        title = 'Application Deadline Soon'
        message = `The application deadline for ${internship.title} at ${internship.company_name} is in ${daysUntilDeadline} days.`
      } else {
        title = 'Upcoming Application Deadline'
        message = `The application deadline for ${internship.title} at ${internship.company_name} is in ${daysUntilDeadline} days.`
      }

      // Create notification
      await UpdateNotificationModel.create({
        user_id: application.user_id,
        internship_id: application.internship_id,
        notification_type: 'deadline_reminder',
        title,
        message,
        delivery_method: 'websocket',
        metadata: {
          application_id: application.id,
          days_until_deadline: daysUntilDeadline,
          deadline_date: internship.application_deadline
        }
      })

      console.log(`Sent deadline reminder for application ${application.id}`)
    } catch (error) {
      console.error(`Error sending deadline reminder for application ${application.id}:`, error)
    }
  }

  /**
   * Process custom user reminders
   */
  static async processCustomReminders(): Promise<void> {
    try {
      console.log('Processing custom user reminders...')
      
      // Get applications with custom reminder dates in the next day
      const applications = await UserApplicationModel.findUpcomingReminders(1)
      
      for (const application of applications) {
        if (application.reminder_date) {
          await this.sendCustomReminder(application)
        }
      }
      
      console.log(`Processed ${applications.length} custom reminders`)
    } catch (error) {
      console.error('Error processing custom reminders:', error)
    }
  }

  /**
   * Send custom reminder notification
   */
  private static async sendCustomReminder(application: UserApplicationWithInternship): Promise<void> {
    try {
      const { internship } = application
      
      const title = 'Application Reminder'
      const message = application.notes 
        ? `Reminder for ${internship.title} at ${internship.company_name}: ${application.notes}`
        : `Reminder for your application to ${internship.title} at ${internship.company_name}`

      // Create notification
      await UpdateNotificationModel.create({
        user_id: application.user_id,
        internship_id: application.internship_id,
        notification_type: 'deadline_reminder',
        title,
        message,
        delivery_method: 'websocket',
        metadata: {
          application_id: application.id,
          reminder_type: 'custom',
          reminder_date: application.reminder_date
        }
      })

      console.log(`Sent custom reminder for application ${application.id}`)
    } catch (error) {
      console.error(`Error sending custom reminder for application ${application.id}:`, error)
    }
  }

  /**
   * Get application progress insights for a user
   */
  static async getApplicationInsights(userId: number): Promise<{
    response_rate: number
    average_response_time: number
    most_successful_status: string
    recommendations: string[]
  }> {
    try {
      const stats = await UserApplicationModel.getStatsByUserId(userId)
      
      // Calculate response rate (non-applied statuses / total)
      const nonAppliedCount = stats.total_applications - stats.by_status.applied
      const responseRate = stats.total_applications > 0 
        ? (nonAppliedCount / stats.total_applications) * 100 
        : 0

      // Find most successful status (excluding applied and rejected)
      const successfulStatuses = ['under_review', 'interview_scheduled', 'interviewed', 'offered', 'accepted']
      let mostSuccessfulStatus = 'applied'
      let maxCount = 0

      successfulStatuses.forEach(status => {
        const count = stats.by_status[status as keyof typeof stats.by_status]
        if (count > maxCount) {
          maxCount = count
          mostSuccessfulStatus = status
        }
      })

      // Generate recommendations
      const recommendations: string[] = []
      
      if (responseRate < 20) {
        recommendations.push('Consider tailoring your applications more specifically to each role')
        recommendations.push('Review and improve your resume and cover letter')
      }
      
      if (stats.by_status.rejected > stats.total_applications * 0.5) {
        recommendations.push('Focus on applying to roles that better match your skills')
        recommendations.push('Consider gaining additional skills in high-demand areas')
      }
      
      if (stats.recent_applications < 5) {
        recommendations.push('Increase your application frequency to improve your chances')
      }

      if (stats.upcoming_deadlines > 5) {
        recommendations.push('Set up better deadline tracking to avoid missing opportunities')
      }

      return {
        response_rate: Math.round(responseRate * 100) / 100,
        average_response_time: 0, // Would need additional data tracking
        most_successful_status: mostSuccessfulStatus,
        recommendations
      }
    } catch (error) {
      console.error('Error generating application insights:', error)
      return {
        response_rate: 0,
        average_response_time: 0,
        most_successful_status: 'applied',
        recommendations: ['Unable to generate insights at this time']
      }
    }
  }

  /**
   * Schedule reminder processing (to be called by cron job)
   */
  static async scheduleReminderProcessing(): Promise<void> {
    try {
      // Process both deadline and custom reminders
      await Promise.all([
        this.processUpcomingDeadlines(),
        this.processCustomReminders()
      ])
    } catch (error) {
      console.error('Error in scheduled reminder processing:', error)
    }
  }
}