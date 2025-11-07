import { Router } from 'express'
import { WebSocketController } from '../controllers/websocketController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// All WebSocket routes require authentication
router.use(authenticateToken)

// WebSocket service statistics (admin/debug endpoint)
router.get('/stats', WebSocketController.getStats)

// Notification preferences
router.get('/preferences', WebSocketController.getNotificationPreferences)
router.put('/preferences', WebSocketController.updateNotificationPreferences)

// Notifications
router.get('/notifications', WebSocketController.getNotifications)
router.get('/notifications/unread-count', WebSocketController.getUnreadCount)
router.put('/notifications/:id/read', WebSocketController.markNotificationAsRead)
router.put('/notifications/mark-all-read', WebSocketController.markAllNotificationsAsRead)

// Connection testing
router.post('/test-connection', WebSocketController.testConnection)

export default router