import { Router } from 'express'
import { WebhookController } from '../controllers/webhookController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Webhook endpoints (no authentication required for external services)
router.post('/internshala', WebhookController.handleInternshalaWebhook)
router.post('/linkedin', WebhookController.handleLinkedInWebhook)
router.post('/indeed', WebhookController.handleIndeedWebhook)
router.post('/:source', WebhookController.handleGenericWebhook)

// Management endpoints (require authentication)
router.use(authenticateToken)

// Webhook statistics and management
router.get('/stats', WebhookController.getWebhookStats)
router.post('/test', WebhookController.testWebhook)
router.post('/subscription', WebhookController.manageWebhookSubscription)

export default router