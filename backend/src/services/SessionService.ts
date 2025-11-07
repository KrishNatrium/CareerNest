import { redisClient, isRedisAvailable } from '../config/redis'
import { cacheService } from './CacheService'

export interface SessionData {
  userId: number
  email: string
  loginTime: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export class SessionService {
  private static instance: SessionService
  private sessionPrefix = 'session:'
  private userSessionsPrefix = 'user_sessions:'
  private defaultTTL = 86400 // 24 hours

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  /**
   * Create a new session
   */
  async createSession(
    sessionId: string,
    sessionData: SessionData,
    ttl: number = this.defaultTTL
  ): Promise<boolean> {
    if (!isRedisAvailable()) {
      console.warn('Redis not available, session will not be stored')
      return false
    }

    try {
      const sessionKey = `${this.sessionPrefix}${sessionId}`
      const userSessionsKey = `${this.userSessionsPrefix}${sessionData.userId}`

      // Store session data
      const success = await cacheService.set(sessionKey, sessionData, { ttl })
      
      if (success) {
        // Add session to user's session list
        await redisClient.sAdd(userSessionsKey, sessionId)
        await redisClient.expire(userSessionsKey, ttl)
      }

      return success
    } catch (error) {
      console.error('Session creation error:', error)
      return false
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `${this.sessionPrefix}${sessionId}`
      return await cacheService.get<SessionData>(sessionKey)
    } catch (error) {
      console.error('Session retrieval error:', error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const sessionData = await this.getSession(sessionId)
      if (!sessionData) {
        return false
      }

      sessionData.lastActivity = new Date()
      
      const sessionKey = `${this.sessionPrefix}${sessionId}`
      return await cacheService.set(sessionKey, sessionData, { ttl: this.defaultTTL })
    } catch (error) {
      console.error('Session activity update error:', error)
      return false
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      // Get session data to find user ID
      const sessionData = await this.getSession(sessionId)
      
      const sessionKey = `${this.sessionPrefix}${sessionId}`
      const deleted = await cacheService.delete(sessionKey)

      // Remove from user's session list
      if (sessionData) {
        const userSessionsKey = `${this.userSessionsPrefix}${sessionData.userId}`
        await redisClient.sRem(userSessionsKey, sessionId)
      }

      return deleted
    } catch (error) {
      console.error('Session deletion error:', error)
      return false
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: number): Promise<number> {
    if (!isRedisAvailable()) {
      return 0
    }

    try {
      const userSessionsKey = `${this.userSessionsPrefix}${userId}`
      const sessionIds = await redisClient.sMembers(userSessionsKey)
      
      let deletedCount = 0
      for (const sessionId of sessionIds) {
        const sessionKey = `${this.sessionPrefix}${sessionId}`
        const deleted = await cacheService.delete(sessionKey)
        if (deleted) deletedCount++
      }

      // Clear user sessions set
      await redisClient.del(userSessionsKey)

      return deletedCount
    } catch (error) {
      console.error('User sessions deletion error:', error)
      return 0
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: number): Promise<SessionData[]> {
    if (!isRedisAvailable()) {
      return []
    }

    try {
      const userSessionsKey = `${this.userSessionsPrefix}${userId}`
      const sessionIds = await redisClient.sMembers(userSessionsKey)
      
      const sessions: SessionData[] = []
      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId)
        if (sessionData) {
          sessions.push(sessionData)
        }
      }

      return sessions
    } catch (error) {
      console.error('User sessions retrieval error:', error)
      return []
    }
  }

  /**
   * Check if session exists and is valid
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId)
      return sessionData !== null
    } catch (error) {
      console.error('Session validation error:', error)
      return false
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttl: number = this.defaultTTL): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const sessionKey = `${this.sessionPrefix}${sessionId}`
      const exists = await cacheService.exists(sessionKey)
      
      if (exists) {
        await redisClient.expire(sessionKey, ttl)
        return true
      }

      return false
    } catch (error) {
      console.error('Session extension error:', error)
      return false
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number
    activeSessions: number
    userCount: number
  }> {
    if (!isRedisAvailable()) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        userCount: 0
      }
    }

    try {
      const sessionKeys = await redisClient.keys(`${this.sessionPrefix}*`)
      const userSessionKeys = await redisClient.keys(`${this.userSessionsPrefix}*`)
      
      return {
        totalSessions: sessionKeys.length,
        activeSessions: sessionKeys.length, // All stored sessions are considered active
        userCount: userSessionKeys.length
      }
    } catch (error) {
      console.error('Session stats error:', error)
      return {
        totalSessions: 0,
        activeSessions: 0,
        userCount: 0
      }
    }
  }

  /**
   * Clean up expired sessions (manual cleanup)
   */
  async cleanupExpiredSessions(): Promise<number> {
    if (!isRedisAvailable()) {
      return 0
    }

    try {
      // Redis automatically handles TTL expiration, but we can clean up orphaned user session sets
      const userSessionKeys = await redisClient.keys(`${this.userSessionsPrefix}*`)
      let cleanedCount = 0

      for (const userSessionKey of userSessionKeys) {
        const sessionIds = await redisClient.sMembers(userSessionKey)
        const validSessionIds: string[] = []

        for (const sessionId of sessionIds) {
          const sessionKey = `${this.sessionPrefix}${sessionId}`
          const exists = await redisClient.exists(sessionKey)
          
          if (exists) {
            validSessionIds.push(sessionId)
          } else {
            cleanedCount++
          }
        }

        // Update user sessions set with only valid sessions
        if (validSessionIds.length !== sessionIds.length) {
          await redisClient.del(userSessionKey)
          if (validSessionIds.length > 0) {
            await redisClient.sAdd(userSessionKey, validSessionIds)
          }
        }
      }

      return cleanedCount
    } catch (error) {
      console.error('Session cleanup error:', error)
      return 0
    }
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance()