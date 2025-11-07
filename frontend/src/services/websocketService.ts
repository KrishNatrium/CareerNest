import { io, Socket } from 'socket.io-client'
import { toast } from 'react-toastify'

export interface NotificationPreferences {
  enabledTypes: string[]
  enableSound: boolean
  enableDesktop: boolean
}

export interface WebSocketNotification {
  id: number
  user_id: number
  internship_id?: number
  notification_type: string
  title: string
  message: string
  is_read: boolean
  sent_at: string
  delivery_method: string
  metadata?: Record<string, any>
}

export interface WebSocketEvent {
  type: string
  data: any
  timestamp: string
}

type EventCallback = (data: any) => void

class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventCallbacks: Map<string, EventCallback[]> = new Map()
  private notificationSound: HTMLAudioElement | null = null

  constructor() {
    // Initialize notification sound
    this.initializeNotificationSound()
  }

  /**
   * Initialize notification sound
   */
  private initializeNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      this.notificationSound = new Audio()
      this.notificationSound.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
    } catch (error) {
      console.warn('Could not initialize notification sound:', error)
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        
        this.socket = io(serverUrl, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay
        })

        this.setupEventHandlers()

        this.socket.on('connected', (data) => {
          console.log('✅ Connected to WebSocket server:', data)
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve()
        })

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error)
          this.isConnected = false
          reject(error)
        })

      } catch (error) {
        console.error('❌ Failed to initialize WebSocket connection:', error)
        reject(error)
      }
    })
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.triggerCallbacks('connected', { timestamp: new Date().toISOString() })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason)
      this.isConnected = false
      this.triggerCallbacks('disconnected', { reason, timestamp: new Date().toISOString() })
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 WebSocket reconnected after ${attemptNumber} attempts`)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.triggerCallbacks('reconnected', { attempts: attemptNumber })
    })

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++
      console.error(`❌ WebSocket reconnection failed (attempt ${this.reconnectAttempts}):`, error)
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Connection lost. Please refresh the page.')
      }
    })

    // Notification events
    this.socket.on('new_notification', (notification: WebSocketNotification) => {
      console.log('📨 New notification received:', notification)
      this.handleNewNotification(notification)
      this.triggerCallbacks('new_notification', notification)
    })

    this.socket.on('new_internship_available', (data) => {
      console.log('🆕 New internship available:', data)
      this.handleNewInternship(data)
      this.triggerCallbacks('new_internship', data)
    })

    this.socket.on('internship_updated', (data) => {
      console.log('📝 Internship updated:', data)
      this.triggerCallbacks('internship_updated', data)
    })

    this.socket.on('deadline_reminder', (data) => {
      console.log('⏰ Deadline reminder:', data)
      this.handleDeadlineReminder(data)
      this.triggerCallbacks('deadline_reminder', data)
    })

    this.socket.on('search_results_updated', (data) => {
      console.log('🔍 Search results updated:', data)
      this.triggerCallbacks('search_results_updated', data)
    })

    // Server events
    this.socket.on('server_shutdown', (data) => {
      console.log('🛑 Server shutting down:', data)
      toast.info(data.message)
      this.triggerCallbacks('server_shutdown', data)
    })

    // Pong response for connection health
    this.socket.on('pong', (data) => {
      this.triggerCallbacks('pong', data)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error)
      this.triggerCallbacks('error', error)
    })
  }

  /**
   * Handle new notification
   */
  private handleNewNotification(notification: WebSocketNotification): void {
    // Show toast notification
    const toastOptions = {
      position: 'top-right' as const,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    }

    switch (notification.notification_type) {
      case 'new_match':
        toast.success(notification.message, toastOptions)
        break
      case 'deadline_reminder':
        toast.warning(notification.message, toastOptions)
        break
      case 'status_change':
        toast.info(notification.message, toastOptions)
        break
      default:
        toast.info(notification.message, toastOptions)
    }

    // Play notification sound
    this.playNotificationSound()

    // Show desktop notification if permission granted
    this.showDesktopNotification(notification)
  }

  /**
   * Handle new internship
   */
  private handleNewInternship(data: any): void {
    const { internship } = data
    
    toast.success(
      `New internship: ${internship.title} at ${internship.company_name}`,
      {
        position: 'top-right',
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      }
    )

    this.playNotificationSound()
  }

  /**
   * Handle deadline reminder
   */
  private handleDeadlineReminder(data: any): void {
    toast.warning(
      `Deadline approaching: ${data.internship_title} at ${data.company_name}`,
      {
        position: 'top-right',
        autoClose: 10000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      }
    )

    this.playNotificationSound()
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(): void {
    try {
      if (this.notificationSound) {
        this.notificationSound.currentTime = 0
        this.notificationSound.play().catch(error => {
          console.warn('Could not play notification sound:', error)
        })
      }
    } catch (error) {
      console.warn('Error playing notification sound:', error)
    }
  }

  /**
   * Show desktop notification
   */
  private showDesktopNotification(notification: WebSocketNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: `notification-${notification.id}`,
          requireInteraction: false
        })
      } catch (error) {
        console.warn('Could not show desktop notification:', error)
      }
    }
  }

  /**
   * Request desktop notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission
    }
    return 'denied'
  }

  /**
   * Subscribe to events
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, [])
    }
    this.eventCallbacks.get(event)!.push(callback)
  }

  /**
   * Unsubscribe from events
   */
  public off(event: string, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Trigger callbacks for an event
   */
  private triggerCallbacks(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in ${event} callback:`, error)
        }
      })
    }
  }

  /**
   * Emit event to server
   */
  public emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Cannot emit event: WebSocket not connected')
    }
  }

  /**
   * Update notification preferences
   */
  public updateNotificationPreferences(preferences: NotificationPreferences): void {
    this.emit('update_notification_preferences', preferences)
  }

  /**
   * Mark notification as read
   */
  public markNotificationAsRead(notificationId: number): void {
    this.emit('mark_notification_read', notificationId)
  }

  /**
   * Mark all notifications as read
   */
  public markAllNotificationsAsRead(): void {
    this.emit('mark_all_notifications_read')
  }

  /**
   * Join internship updates room
   */
  public joinInternshipUpdates(internshipId: number): void {
    this.emit('join_internship_updates', internshipId)
  }

  /**
   * Leave internship updates room
   */
  public leaveInternshipUpdates(internshipId: number): void {
    this.emit('leave_internship_updates', internshipId)
  }

  /**
   * Send ping to test connection
   */
  public ping(): void {
    this.emit('ping')
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('🔌 WebSocket disconnected')
    }
  }

  /**
   * Check if connected
   */
  public getConnectionStatus(): {
    isConnected: boolean
    reconnectAttempts: number
    socketId?: string
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    }
  }

  /**
   * Get socket instance (for advanced usage)
   */
  public getSocket(): Socket | null {
    return this.socket
  }
}

// Singleton instance
const webSocketService = new WebSocketService()

export default webSocketService