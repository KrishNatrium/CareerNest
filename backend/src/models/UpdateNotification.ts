import { pool } from '../config/database'
import {
  UpdateNotification,
  UpdateNotificationCreateInput,
  UpdateNotificationUpdateInput,
  NotificationType
} from '../types/internship.types'

export class UpdateNotificationModel {
  /**
   * Create a new notification
   */
  static async create(notificationData: UpdateNotificationCreateInput): Promise<UpdateNotification> {
    const client = await pool.connect()
    try {
      const query = `
        INSERT INTO update_notifications (
          user_id, internship_id, notification_type, title, message, 
          delivery_method, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const values = [
        notificationData.user_id,
        notificationData.internship_id || null,
        notificationData.notification_type,
        notificationData.title,
        notificationData.message,
        notificationData.delivery_method || 'websocket',
        notificationData.metadata ? JSON.stringify(notificationData.metadata) : null
      ]

      const result = await client.query(query, values)
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Find notification by ID
   */
  static async findById(id: number): Promise<UpdateNotification | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM update_notifications WHERE id = $1'
      const result = await client.query(query, [id])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Get notifications for a user
   */
  static async findByUserId(
    userId: number,
    unreadOnly: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: UpdateNotification[]; total_count: number }> {
    const client = await pool.connect()
    try {
      const conditions = ['user_id = $1']
      const values: any[] = [userId]
      let paramCount = 2

      if (unreadOnly) {
        conditions.push('is_read = false')
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM update_notifications WHERE ${conditions.join(' AND ')}`
      const countResult = await client.query(countQuery, values)
      const totalCount = parseInt(countResult.rows[0].count)

      // Get notifications
      values.push(limit, offset)
      const query = `
        SELECT * FROM update_notifications 
        WHERE ${conditions.join(' AND ')}
        ORDER BY sent_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `

      const result = await client.query(query, values)

      return {
        notifications: result.rows,
        total_count: totalCount
      }
    } finally {
      client.release()
    }
  }

  /**
   * Update notification
   */
  static async update(id: number, notificationData: UpdateNotificationUpdateInput): Promise<UpdateNotification | null> {
    const client = await pool.connect()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(notificationData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`)
          values.push(value)
          paramCount++
        }
      })

      if (fields.length === 0) {
        return await this.findById(id)
      }

      values.push(id)
      const query = `
        UPDATE update_notifications
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await client.query(query, values)
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: number): Promise<UpdateNotification | null> {
    return this.update(id, { is_read: true })
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsReadForUser(userId: number): Promise<number> {
    const client = await pool.connect()
    try {
      const query = `
        UPDATE update_notifications 
        SET is_read = true 
        WHERE user_id = $1 AND is_read = false
      `
      const result = await client.query(query, [userId])
      return result.rowCount || 0
    } finally {
      client.release()
    }
  }

  /**
   * Delete notification
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'DELETE FROM update_notifications WHERE id = $1'
      const result = await client.query(query, [id])
      return (result.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const client = await pool.connect()
    try {
      const query = 'SELECT COUNT(*) as count FROM update_notifications WHERE user_id = $1 AND is_read = false'
      const result = await client.query(query, [userId])
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }

  /**
   * Get notifications by type for a user
   */
  static async findByUserIdAndType(
    userId: number, 
    notificationType: NotificationType,
    limit: number = 20
  ): Promise<UpdateNotification[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM update_notifications 
        WHERE user_id = $1 AND notification_type = $2
        ORDER BY sent_at DESC
        LIMIT $3
      `
      const result = await client.query(query, [userId, notificationType, limit])
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Clean up old read notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const client = await pool.connect()
    try {
      const query = `
        DELETE FROM update_notifications 
        WHERE is_read = true 
        AND sent_at < NOW() - INTERVAL '${daysOld} days'
      `
      const result = await client.query(query)
      return result.rowCount || 0
    } finally {
      client.release()
    }
  }

  /**
   * Bulk create notifications
   */
  static async bulkCreate(notifications: UpdateNotificationCreateInput[]): Promise<UpdateNotification[]> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const results: UpdateNotification[] = []
      
      for (const notification of notifications) {
        const result = await this.create(notification)
        results.push(result)
      }

      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getStatsByUserId(userId: number): Promise<{
    total_notifications: number
    unread_notifications: number
    by_type: Record<NotificationType, number>
    recent_notifications: number
  }> {
    const client = await pool.connect()
    try {
      // Total and unread notifications
      const totalQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_read = false) as unread
        FROM update_notifications 
        WHERE user_id = $1
      `
      const totalResult = await client.query(totalQuery, [userId])
      
      // By type
      const typeQuery = `
        SELECT notification_type, COUNT(*) as count 
        FROM update_notifications 
        WHERE user_id = $1 
        GROUP BY notification_type
      `
      const typeResult = await client.query(typeQuery, [userId])
      
      // Recent notifications (last 7 days)
      const recentQuery = `
        SELECT COUNT(*) as count 
        FROM update_notifications 
        WHERE user_id = $1 
        AND sent_at >= NOW() - INTERVAL '7 days'
      `
      const recentResult = await client.query(recentQuery, [userId])

      const byType: Record<NotificationType, number> = {
        new_match: 0,
        deadline_reminder: 0,
        status_change: 0,
        new_internship: 0,
        internship_updated: 0
      }

      typeResult.rows.forEach(row => {
        byType[row.notification_type as NotificationType] = parseInt(row.count)
      })

      return {
        total_notifications: parseInt(totalResult.rows[0].total),
        unread_notifications: parseInt(totalResult.rows[0].unread),
        by_type: byType,
        recent_notifications: parseInt(recentResult.rows[0].count)
      }
    } finally {
      client.release()
    }
  }

  /**
   * Create notification for new internship match
   */
  static async createNewMatchNotification(
    userId: number,
    internshipId: number,
    internshipTitle: string,
    companyName: string,
    matchScore?: number
  ): Promise<UpdateNotification> {
    return this.create({
      user_id: userId,
      internship_id: internshipId,
      notification_type: 'new_match',
      title: 'New Internship Match Found!',
      message: `We found a new internship that matches your profile: ${internshipTitle} at ${companyName}`,
      metadata: {
        match_score: matchScore,
        internship_title: internshipTitle,
        company_name: companyName
      }
    })
  }

  /**
   * Create notification for deadline reminder
   */
  static async createDeadlineReminderNotification(
    userId: number,
    internshipId: number,
    internshipTitle: string,
    companyName: string,
    deadline: Date
  ): Promise<UpdateNotification> {
    const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    return this.create({
      user_id: userId,
      internship_id: internshipId,
      notification_type: 'deadline_reminder',
      title: 'Application Deadline Approaching',
      message: `The application deadline for ${internshipTitle} at ${companyName} is in ${daysUntilDeadline} day(s)`,
      metadata: {
        deadline: deadline.toISOString(),
        days_until_deadline: daysUntilDeadline,
        internship_title: internshipTitle,
        company_name: companyName
      }
    })
  }
}