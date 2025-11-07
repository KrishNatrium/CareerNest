import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import webSocketService, { WebSocketNotification, NotificationPreferences } from '../services/websocketService'
import { useAuth } from './AuthContext'
import { tokenManager } from '../services/api'
import { toast } from 'react-toastify'

interface WebSocketContextType {
  isConnected: boolean
  connectionStatus: {
    isConnected: boolean
    reconnectAttempts: number
    socketId?: string
  }
  notifications: WebSocketNotification[]
  unreadCount: number
  connect: () => Promise<void>
  disconnect: () => void
  markNotificationAsRead: (id: number) => void
  markAllNotificationsAsRead: () => void
  updateNotificationPreferences: (preferences: NotificationPreferences) => void
  joinInternshipUpdates: (internshipId: number) => void
  leaveInternshipUpdates: (internshipId: number) => void
  requestNotificationPermission: () => Promise<NotificationPermission>
  clearNotifications: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async (): Promise<void> => {
    const token = tokenManager.getAccessToken()
    if (!token) {
      console.warn('Cannot connect to WebSocket: No authentication token')
      return
    }

    try {
      await webSocketService.connect(token)
      setIsConnected(true)
      toast.success('Connected to real-time updates', {
        position: 'bottom-right',
        autoClose: 3000
      })
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      setIsConnected(false)
      toast.error('Failed to connect to real-time updates', {
        position: 'bottom-right',
        autoClose: 5000
      })
    }
  }, [])

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback((): void => {
    webSocketService.disconnect()
    setIsConnected(false)
    setNotifications([])
    setUnreadCount(0)
  }, [])

  /**
   * Mark notification as read
   */
  const markNotificationAsRead = useCallback((id: number): void => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, is_read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    webSocketService.markNotificationAsRead(id)
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsAsRead = useCallback((): void => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_read: true }))
    )
    setUnreadCount(0)
    webSocketService.markAllNotificationsAsRead()
  }, [])

  /**
   * Update notification preferences
   */
  const updateNotificationPreferences = useCallback((preferences: NotificationPreferences): void => {
    webSocketService.updateNotificationPreferences(preferences)
  }, [])

  /**
   * Join internship updates room
   */
  const joinInternshipUpdates = useCallback((internshipId: number): void => {
    webSocketService.joinInternshipUpdates(internshipId)
  }, [])

  /**
   * Leave internship updates room
   */
  const leaveInternshipUpdates = useCallback((internshipId: number): void => {
    webSocketService.leaveInternshipUpdates(internshipId)
  }, [])

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    return await webSocketService.requestNotificationPermission()
  }, [])

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback((): void => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback(() => {
    return webSocketService.getConnectionStatus()
  }, [])

  // Set up event listeners
  useEffect(() => {
    // Connection events
    const handleConnected = () => {
      setIsConnected(true)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
    }

    const handleReconnected = () => {
      setIsConnected(true)
      toast.success('Reconnected to real-time updates', {
        position: 'bottom-right',
        autoClose: 3000
      })
    }

    // Notification events
    const handleNewNotification = (notification: WebSocketNotification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 100)) // Keep last 100 notifications
      if (!notification.is_read) {
        setUnreadCount(prev => prev + 1)
      }
    }

    const handleNewInternship = (data: any) => {
      // Could add to a separate internship updates list if needed
      console.log('New internship received:', data)
    }

    const handleInternshipUpdated = (data: any) => {
      console.log('Internship updated:', data)
      // Could trigger a refresh of internship data
    }

    const handleDeadlineReminder = (data: any) => {
      console.log('Deadline reminder:', data)
    }

    const handleSearchResultsUpdated = (data: any) => {
      console.log('Search results updated:', data)
      // Could trigger a refresh of search results
    }

    // Subscribe to events
    webSocketService.on('connected', handleConnected)
    webSocketService.on('disconnected', handleDisconnected)
    webSocketService.on('reconnected', handleReconnected)
    webSocketService.on('new_notification', handleNewNotification)
    webSocketService.on('new_internship', handleNewInternship)
    webSocketService.on('internship_updated', handleInternshipUpdated)
    webSocketService.on('deadline_reminder', handleDeadlineReminder)
    webSocketService.on('search_results_updated', handleSearchResultsUpdated)

    // Cleanup function
    return () => {
      webSocketService.off('connected', handleConnected)
      webSocketService.off('disconnected', handleDisconnected)
      webSocketService.off('reconnected', handleReconnected)
      webSocketService.off('new_notification', handleNewNotification)
      webSocketService.off('new_internship', handleNewInternship)
      webSocketService.off('internship_updated', handleInternshipUpdated)
      webSocketService.off('deadline_reminder', handleDeadlineReminder)
      webSocketService.off('search_results_updated', handleSearchResultsUpdated)
    }
  }, [])

  // Auto-connect when user is authenticated
  useEffect(() => {
    const token = tokenManager.getAccessToken()
    if (user && token && !isConnected) {
      connect()
    } else if (!user && isConnected) {
      disconnect()
    }
  }, [user, isConnected, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus: getConnectionStatus(),
    notifications,
    unreadCount,
    connect,
    disconnect,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotificationPreferences,
    joinInternshipUpdates,
    leaveInternshipUpdates,
    requestNotificationPermission,
    clearNotifications
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export default WebSocketContext