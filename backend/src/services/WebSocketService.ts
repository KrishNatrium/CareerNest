import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { UpdateNotification, NotificationType } from '../types/internship.types'
import { UserModel } from '../models/User'

interface AuthenticatedSocket extends Socket {
  userId?: number
  userEmail?: string
}

interface UserConnection {
  userId: number
  socketId: string
  connectedAt: Date
  preferences?: NotificationPreferences
}

interface NotificationPreferences {
  enabledTypes: NotificationType[]
  enableSound: boolean
  enableDesktop: boolean
}

interface WebSocketEvent {
  type: string
  data: any
  timestamp: Date
}

export class WebSocketService {
  private io: SocketIOServer
  private connectedUsers: Map<number, UserConnection[]> = new Map()
  private socketToUser: Map<string, number> = new Map()
  private offlineMessageQueue: Map<number, WebSocketEvent[]> = new Map()

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this))

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`)
      
      this.handleUserConnection(socket)
      this.setupSocketEventHandlers(socket)
    })
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; email: string }
      
      // Verify user exists
      const user = await UserModel.findById(decoded.userId)
      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = decoded.userId
      socket.userEmail = decoded.email
      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Invalid authentication token'))
    }
  }

  private handleUserConnection(socket: AuthenticatedSocket): void {
    if (!socket.userId) return

    const userId = socket.userId
    const connection: UserConnection = {
      userId,
      socketId: socket.id,
      connectedAt: new Date()
    }

    // Add to connected users
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, [])
    }
    this.connectedUsers.get(userId)!.push(connection)
    this.socketToUser.set(socket.id, userId)

    // Join user-specific room
    socket.join(`user:${userId}`)

    // Send queued offline messages
    this.sendQueuedMessages(userId, socket)

    // Emit connection success
    socket.emit('connected', {
      message: 'Successfully connected to real-time updates',
      timestamp: new Date().toISOString()
    })
  }

  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    // Handle notification preferences update
    socket.on('update_notification_preferences', (preferences: NotificationPreferences) => {
      this.updateUserNotificationPreferences(socket.userId!, preferences)
    })

    // Handle mark notification as read
    socket.on('mark_notification_read', (notificationId: number) => {
      this.markNotificationAsRead(socket.userId!, notificationId)
    })

    // Handle mark all notifications as read
    socket.on('mark_all_notifications_read', () => {
      this.markAllNotificationsAsRead(socket.userId!)
    })

    // Handle join specific rooms (e.g., for specific internship updates)
    socket.on('join_internship_updates', (internshipId: number) => {
      socket.join(`internship:${internshipId}`)
    })

    socket.on('leave_internship_updates', (internshipId: number) => {
      socket.leave(`internship:${internshipId}`)
    })

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleUserDisconnection(socket, reason)
    })

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error)
    })
  }

  private handleUserDisconnection(socket: AuthenticatedSocket, reason: string): void {
    if (!socket.userId) return

    const userId = socket.userId
    console.log(`User ${userId} disconnected: ${reason}`)

    // Remove from connected users
    const userConnections = this.connectedUsers.get(userId)
    if (userConnections) {
      const updatedConnections = userConnections.filter(conn => conn.socketId !== socket.id)
      if (updatedConnections.length === 0) {
        this.connectedUsers.delete(userId)
      } else {
        this.connectedUsers.set(userId, updatedConnections)
      }
    }

    this.socketToUser.delete(socket.id)
  }

  private sendQueuedMessages(userId: number, socket: AuthenticatedSocket): void {
    const queuedMessages = this.offlineMessageQueue.get(userId)
    if (queuedMessages && queuedMessages.length > 0) {
      queuedMessages.forEach(message => {
        socket.emit(message.type, message.data)
      })
      this.offlineMessageQueue.delete(userId)
      console.log(`Sent ${queuedMessages.length} queued messages to user ${userId}`)
    }
  }

  private updateUserNotificationPreferences(userId: number, preferences: NotificationPreferences): void {
    const userConnections = this.connectedUsers.get(userId)
    if (userConnections) {
      userConnections.forEach(conn => {
        conn.preferences = preferences
      })
    }
  }

  private async markNotificationAsRead(userId: number, notificationId: number): Promise<void> {
    try {
      // This would typically update the database
      // For now, just emit confirmation
      this.emitToUser(userId, 'notification_marked_read', { notificationId })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  private async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      // This would typically update the database
      // For now, just emit confirmation
      this.emitToUser(userId, 'all_notifications_marked_read', { timestamp: new Date().toISOString() })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Public methods for sending notifications

  /**
   * Send notification to a specific user
   */
  public sendNotificationToUser(userId: number, notification: UpdateNotification): void {
    const event: WebSocketEvent = {
      type: 'new_notification',
      data: notification,
      timestamp: new Date()
    }

    if (this.isUserConnected(userId)) {
      this.emitToUser(userId, event.type, event.data)
    } else {
      this.queueMessageForUser(userId, event)
    }
  }

  /**
   * Send notification to multiple users
   */
  public sendNotificationToUsers(userIds: number[], notification: UpdateNotification): void {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, notification)
    })
  }

  /**
   * Broadcast new internship to all connected users
   */
  public broadcastNewInternship(internship: any): void {
    this.io.emit('new_internship_available', {
      internship,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Send internship update to users tracking specific internship
   */
  public sendInternshipUpdate(internshipId: number, updateData: any): void {
    this.io.to(`internship:${internshipId}`).emit('internship_updated', {
      internshipId,
      updateData,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Send application deadline reminder
   */
  public sendDeadlineReminder(userId: number, reminderData: any): void {
    const event: WebSocketEvent = {
      type: 'deadline_reminder',
      data: reminderData,
      timestamp: new Date()
    }

    if (this.isUserConnected(userId)) {
      this.emitToUser(userId, event.type, event.data)
    } else {
      this.queueMessageForUser(userId, event)
    }
  }

  /**
   * Send real-time search update
   */
  public sendSearchUpdate(userId: number, searchResults: any): void {
    this.emitToUser(userId, 'search_results_updated', {
      results: searchResults,
      timestamp: new Date().toISOString()
    })
  }

  // Utility methods

  private emitToUser(userId: number, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  private queueMessageForUser(userId: number, event: WebSocketEvent): void {
    if (!this.offlineMessageQueue.has(userId)) {
      this.offlineMessageQueue.set(userId, [])
    }
    
    const queue = this.offlineMessageQueue.get(userId)!
    queue.push(event)
    
    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift() // Remove oldest message
    }
  }

  public isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.length > 0
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  public getConnectionsForUser(userId: number): number {
    return this.connectedUsers.get(userId)?.length || 0
  }

  public getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys())
  }

  /**
   * Clean up old queued messages
   */
  public cleanupOldQueuedMessages(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    
    this.offlineMessageQueue.forEach((messages, userId) => {
      const filteredMessages = messages.filter(msg => msg.timestamp > cutoffTime)
      if (filteredMessages.length === 0) {
        this.offlineMessageQueue.delete(userId)
      } else {
        this.offlineMessageQueue.set(userId, filteredMessages)
      }
    })
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    connectedUsers: number
    totalConnections: number
    queuedMessages: number
    averageConnectionsPerUser: number
  } {
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((sum, connections) => sum + connections.length, 0)
    
    const queuedMessages = Array.from(this.offlineMessageQueue.values())
      .reduce((sum, messages) => sum + messages.length, 0)

    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections,
      queuedMessages,
      averageConnectionsPerUser: this.connectedUsers.size > 0 ? totalConnections / this.connectedUsers.size : 0
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket service...')
    
    // Notify all connected users
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down. Please reconnect in a moment.',
      timestamp: new Date().toISOString()
    })

    // Close all connections
    this.io.close()
    
    // Clear internal state
    this.connectedUsers.clear()
    this.socketToUser.clear()
    this.offlineMessageQueue.clear()
    
    console.log('WebSocket service shut down successfully')
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null

export const initializeWebSocketService = (httpServer: HTTPServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer)
  }
  return webSocketService
}

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized. Call initializeWebSocketService first.')
  }
  return webSocketService
}