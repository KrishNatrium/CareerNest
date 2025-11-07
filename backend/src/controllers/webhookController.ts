import { Request, Response } from 'express'
import { getRealTimeMonitorService } from '../services/RealTimeMonitorService'
import crypto from 'crypto'

export class WebhookController {
  /**
   * Handle Internshala webhook
   */
  static async handleInternshalaWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { body, headers } = req
      
      // Verify webhook signature (if Internshala provides one)
      if (!WebhookController.verifyWebhookSignature('internshala', body, headers)) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        })
        return
      }

      const monitorService = getRealTimeMonitorService()
      
      // Process the webhook payload
      await monitorService.handleWebhook('internshala', {
        source: 'internshala',
        type: body.type || 'new',
        internships: body.internships || [body],
        timestamp: body.timestamp || new Date().toISOString()
      })

      res.json({
        success: true,
        message: 'Internshala webhook processed successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error processing Internshala webhook:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Failed to process Internshala webhook'
        }
      })
    }
  }

  /**
   * Handle LinkedIn webhook
   */
  static async handleLinkedInWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { body, headers } = req
      
      // Verify LinkedIn webhook signature
      if (!WebhookController.verifyWebhookSignature('linkedin', body, headers)) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        })
        return
      }

      const monitorService = getRealTimeMonitorService()
      
      // Process LinkedIn webhook payload
      await monitorService.handleWebhook('linkedin', {
        source: 'linkedin',
        type: body.eventType || 'new',
        internships: body.jobs || [body],
        timestamp: body.timestamp || new Date().toISOString()
      })

      res.json({
        success: true,
        message: 'LinkedIn webhook processed successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error processing LinkedIn webhook:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Failed to process LinkedIn webhook'
        }
      })
    }
  }

  /**
   * Handle Indeed webhook
   */
  static async handleIndeedWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { body, headers } = req
      
      // Verify Indeed webhook signature
      if (!WebhookController.verifyWebhookSignature('indeed', body, headers)) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        })
        return
      }

      const monitorService = getRealTimeMonitorService()
      
      // Process Indeed webhook payload
      await monitorService.handleWebhook('indeed', {
        source: 'indeed',
        type: body.action || 'new',
        internships: body.jobs || [body],
        timestamp: body.timestamp || new Date().toISOString()
      })

      res.json({
        success: true,
        message: 'Indeed webhook processed successfully',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error processing Indeed webhook:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Failed to process Indeed webhook'
        }
      })
    }
  }

  /**
   * Generic webhook handler for other platforms
   */
  static async handleGenericWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { body } = req
      const source = req.params.source || 'unknown'
      
      // Basic validation
      if (!body || typeof body !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid webhook payload'
          }
        })
        return
      }

      const monitorService = getRealTimeMonitorService()
      
      // Process generic webhook payload
      await monitorService.handleWebhook(source, {
        source,
        type: body.type || body.action || 'new',
        internships: body.internships || body.jobs || [body],
        timestamp: body.timestamp || new Date().toISOString()
      })

      res.json({
        success: true,
        message: `${source} webhook processed successfully`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error(`Error processing ${req.params.source} webhook:`, error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: `Failed to process ${req.params.source} webhook`
        }
      })
    }
  }

  /**
   * Get webhook status and statistics
   */
  static async getWebhookStats(_req: Request, res: Response): Promise<void> {
    try {
      const monitorService = getRealTimeMonitorService()
      const jobStatus = monitorService.getJobStatus()

      res.json({
        success: true,
        data: {
          monitoring_jobs: jobStatus,
          webhook_endpoints: [
            {
              source: 'internshala',
              endpoint: '/api/webhooks/internshala',
              method: 'POST',
              status: 'active'
            },
            {
              source: 'linkedin',
              endpoint: '/api/webhooks/linkedin',
              method: 'POST',
              status: 'active'
            },
            {
              source: 'indeed',
              endpoint: '/api/webhooks/indeed',
              method: 'POST',
              status: 'active'
            },
            {
              source: 'generic',
              endpoint: '/api/webhooks/:source',
              method: 'POST',
              status: 'active'
            }
          ],
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error getting webhook stats:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_STATS_ERROR',
          message: 'Failed to retrieve webhook statistics'
        }
      })
    }
  }

  /**
   * Test webhook endpoint
   */
  static async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { source = 'test' } = req.body
      
      const monitorService = getRealTimeMonitorService()
      
      // Send test webhook
      await monitorService.handleWebhook(source, {
        source,
        type: 'new',
        internships: [{
          id: `test_${Date.now()}`,
          title: 'Test Internship',
          company_name: 'Test Company',
          description: 'This is a test internship for webhook validation',
          location: 'Remote',
          stipend: 20000,
          duration_months: 3,
          work_type: 'remote',
          required_skills: ['Testing', 'Webhooks'],
          application_url: 'https://example.com/test',
          posted_date: new Date().toISOString(),
          application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }],
        timestamp: new Date().toISOString()
      })

      res.json({
        success: true,
        message: 'Test webhook processed successfully',
        data: {
          source,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error testing webhook:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_TEST_ERROR',
          message: 'Failed to test webhook'
        }
      })
    }
  }

  /**
   * Verify webhook signature for security
   */
  private static verifyWebhookSignature(source: string, body: any, headers: any): boolean {
    try {
      const signature = headers['x-webhook-signature'] || headers['x-signature']
      
      if (!signature) {
        // For development, allow webhooks without signatures
        if (process.env.NODE_ENV === 'development') {
          return true
        }
        return false
      }

      // Get the secret for this source
      const secret = process.env[`${source.toUpperCase()}_WEBHOOK_SECRET`]
      if (!secret) {
        console.warn(`No webhook secret configured for ${source}`)
        return process.env.NODE_ENV === 'development'
      }

      // Verify HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex')

      const providedSignature = signature.replace('sha256=', '')
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )

    } catch (error) {
      console.error(`Error verifying webhook signature for ${source}:`, error)
      return false
    }
  }

  /**
   * Handle webhook subscription/unsubscription
   */
  static async manageWebhookSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { source, action, callback_url } = req.body
      
      if (!source || !action || !callback_url) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'source, action, and callback_url are required'
          }
        })
        return
      }

      if (!['subscribe', 'unsubscribe'].includes(action)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'action must be either "subscribe" or "unsubscribe"'
          }
        })
        return
      }

      // In a real implementation, this would:
      // 1. Register/unregister webhook with the external service
      // 2. Store subscription details in database
      // 3. Handle authentication with external services

      res.json({
        success: true,
        message: `Webhook ${action} request processed for ${source}`,
        data: {
          source,
          action,
          callback_url,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error managing webhook subscription:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: 'Failed to manage webhook subscription'
        }
      })
    }
  }
}