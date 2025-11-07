import { Request, Response } from 'express'
import { getWebSocketService } from '../services/WebSocketService'
import { UpdateNotificationModel } from '../models/UpdateNotification'

export class WebSocketController {
  /**
   * Get WebSocket service statistics
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const webSocketService = getWebSocketService()
      const stats = webSocketService.getStats()
      
      res.json({
        success: true,
        data: {
          websocket_stats: stats,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error getting WebSocket stats:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBSOCKET_STATS_ERROR',
          message: 'Failed to retrieve WebSocket statistics'
        }
      })
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      // For now, return default preferences
      // In a real implementation, this would be stored in the database
      const defaultPreferences = {
        enabledTypes: ['new_match', 'deadline_reminder', 'new_internship'],
        enableSound: true,
        enableDesktop: true
      }

      res.json({
        success: true,
        data: {
          preferences: defaultPreferences
        }
      })
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_ERROR',
          message: 'Failed to retrieve notification preferences'
        }
      })
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const { enabledTypes, enableSound, enableDesktop } = req.body

      // Validate input
      if (!Array.isArray(enabledTypes)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'enabledTypes must be an array'
          }
        })
        return
      }

      const preferences = {
        enabledTypes,
        enableSound: Boolean(enableSound),
        enableDesktop: Boolean(enableDesktop)
      }

      // In a real implementation, save to database
      // For now, just return success
      
      res.json({
        success: true,
        data: {
          preferences,
          message: 'Notification preferences updated successfully'
        }
      })
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_ERROR',
          message: 'Failed to update notification preferences'
        }
      })
    }
  }

  /**
   * Get user's notifications
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const { unread_only = false, limit = 50, offset = 0 } = req.query

      const result = await UpdateNotificationModel.findByUserId(
        userId,
        unread_only === 'true',
        parseInt(limit as string),
        parseInt(offset as string)
      )

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          total_count: result.total_count,
          has_more: result.notifications.length === parseInt(limit as string)
        }
      })
    } catch (error) {
      console.error('Error getting notifications:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATIONS_ERROR',
          message: 'Failed to retrieve notifications'
        }
      })
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const { id } = req.params
      const notificationId = parseInt(id)

      if (isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid notification ID'
          }
        })
        return
      }

      // Verify notification belongs to user
      const notification = await UpdateNotificationModel.findById(notificationId)
      if (!notification || notification.user_id !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found'
          }
        })
        return
      }

      const updatedNotification = await UpdateNotificationModel.markAsRead(notificationId)

      res.json({
        success: true,
        data: {
          notification: updatedNotification,
          message: 'Notification marked as read'
        }
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_READ_ERROR',
          message: 'Failed to mark notification as read'
        }
      })
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const updatedCount = await UpdateNotificationModel.markAllAsReadForUser(userId)

      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
          message: `Marked ${updatedCount} notifications as read`
        }
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_ALL_READ_ERROR',
          message: 'Failed to mark all notifications as read'
        }
      })
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const unreadCount = await UpdateNotificationModel.getUnreadCount(userId)

      res.json({
        success: true,
        data: {
          unread_count: unreadCount
        }
      })
    } catch (error) {
      console.error('Error getting unread count:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'UNREAD_COUNT_ERROR',
          message: 'Failed to get unread notification count'
        }
      })
    }
  }

  /**
   * Test WebSocket connection by sending a test notification
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        })
        return
      }

      const webSocketService = getWebSocketService()
      
      // Check if user is connected
      const isConnected = webSocketService.isUserConnected(userId)
      
      if (isConnected) {
        // Send test notification
        const testNotification = await UpdateNotificationModel.create({
          user_id: userId,
          notification_type: 'new_match',
          title: 'Test Notification',
          message: 'This is a test notification to verify your WebSocket connection is working.',
          delivery_method: 'websocket'
        })

        webSocketService.sendNotificationToUser(userId, testNotification)

        res.json({
          success: true,
          data: {
            message: 'Test notification sent successfully',
            is_connected: true,
            connections: webSocketService.getConnectionsForUser(userId)
          }
        })
      } else {
        res.json({
          success: true,
          data: {
            message: 'User is not currently connected to WebSocket',
            is_connected: false,
            connections: 0
          }
        })
      }
    } catch (error) {
      console.error('Error testing WebSocket connection:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_CONNECTION_ERROR',
          message: 'Failed to test WebSocket connection'
        }
      })
    }
  }
}