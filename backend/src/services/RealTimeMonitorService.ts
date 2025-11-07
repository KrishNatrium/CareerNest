import cron from 'node-cron'
import { getWebSocketService } from './WebSocketService'
import { UpdateNotificationModel } from '../models/UpdateNotification'

import { Internship } from '../types/internship.types'

interface MonitoringJob {
  id: string
  source: string
  type: 'polling' | 'webhook' | 'rss'
  interval: string
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
  task?: cron.ScheduledTask
}

interface ChangeDetectionResult {
  hasChanges: boolean
  newInternships: Internship[]
  updatedInternships: Internship[]
  removedInternships: Internship[]
}

interface WebhookPayload {
  source: string
  type: 'new' | 'updated' | 'removed'
  internships: any[]
  timestamp: string
}

export class RealTimeMonitorService {
  private monitoringJobs: Map<string, MonitoringJob> = new Map()
  private isInitialized = false
  private changeDetectionCache: Map<string, any> = new Map()

  /**
   * Initialize the real-time monitoring service
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('Real-time monitoring service already initialized')
      return
    }

    console.log('🔍 Initializing real-time monitoring service...')

    // Set up monitoring jobs for different sources
    this.setupInternshalaMonitoring()
    this.setupLinkedInMonitoring()
    this.setupGenericPollingMonitoring()

    // Set up cleanup tasks
    this.setupCleanupTasks()

    this.isInitialized = true
    console.log('✅ Real-time monitoring service initialized')
  }

  /**
   * Set up Internshala monitoring with intelligent polling
   */
  private setupInternshalaMonitoring(): void {
    const jobId = 'internshala-monitor'
    
    // High-frequency polling for Internshala (every 3 minutes)
    const task = cron.schedule('*/3 * * * *', async () => {
      await this.monitorInternshala()
    }, {
      scheduled: false,
      name: jobId
    })

    const job: MonitoringJob = {
      id: jobId,
      source: 'internshala',
      type: 'polling',
      interval: '*/3 * * * *',
      isActive: false,
      task
    }

    this.monitoringJobs.set(jobId, job)
    console.log('📋 Internshala monitoring job configured (3-minute intervals)')
  }

  /**
   * Set up LinkedIn monitoring with API webhooks and polling fallback
   */
  private setupLinkedInMonitoring(): void {
    const jobId = 'linkedin-monitor'
    
    // Medium-frequency polling for LinkedIn (every 5 minutes)
    const task = cron.schedule('*/5 * * * *', async () => {
      await this.monitorLinkedIn()
    }, {
      scheduled: false,
      name: jobId
    })

    const job: MonitoringJob = {
      id: jobId,
      source: 'linkedin',
      type: 'polling',
      interval: '*/5 * * * *',
      isActive: false,
      task
    }

    this.monitoringJobs.set(jobId, job)
    console.log('💼 LinkedIn monitoring job configured (5-minute intervals)')
  }

  /**
   * Set up generic polling for other sources
   */
  private setupGenericPollingMonitoring(): void {
    const jobId = 'generic-monitor'
    
    // Lower-frequency polling for other sources (every 10 minutes)
    const task = cron.schedule('*/10 * * * *', async () => {
      await this.monitorGenericSources()
    }, {
      scheduled: false,
      name: jobId
    })

    const job: MonitoringJob = {
      id: jobId,
      source: 'generic',
      type: 'polling',
      interval: '*/10 * * * *',
      isActive: false,
      task
    }

    this.monitoringJobs.set(jobId, job)
    console.log('🌐 Generic source monitoring job configured (10-minute intervals)')
  }

  /**
   * Set up cleanup tasks
   */
  private setupCleanupTasks(): void {
    // Clean up old notifications daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldData()
    }, {
      name: 'cleanup-task'
    })

    // Clean up WebSocket queued messages every hour
    cron.schedule('0 * * * *', () => {
      try {
        const webSocketService = getWebSocketService()
        webSocketService.cleanupOldQueuedMessages(24)
      } catch (error) {
        console.error('Error cleaning up WebSocket messages:', error)
      }
    }, {
      name: 'websocket-cleanup'
    })
  }

  /**
   * Start all monitoring jobs
   */
  public startMonitoring(): void {
    console.log('🚀 Starting real-time monitoring jobs...')
    
    this.monitoringJobs.forEach((job, jobId) => {
      if (job.task && !job.isActive) {
        job.task.start()
        job.isActive = true
        job.nextRun = new Date(Date.now() + this.getIntervalMs(job.interval))
        console.log(`✅ Started monitoring job: ${jobId}`)
      }
    })
  }

  /**
   * Stop all monitoring jobs
   */
  public stopMonitoring(): void {
    console.log('🛑 Stopping real-time monitoring jobs...')
    
    this.monitoringJobs.forEach((job, jobId) => {
      if (job.task && job.isActive) {
        job.task.stop()
        job.isActive = false
        console.log(`⏹️ Stopped monitoring job: ${jobId}`)
      }
    })
  }

  /**
   * Monitor Internshala for new internships
   */
  private async monitorInternshala(): Promise<void> {
    try {
      console.log('🔍 Monitoring Internshala for updates...')
      
      const job = this.monitoringJobs.get('internshala-monitor')
      if (job) {
        job.lastRun = new Date()
        job.nextRun = new Date(Date.now() + this.getIntervalMs(job.interval))
      }

      // In a real implementation, this would scrape Internshala
      // For now, simulate finding new internships
      const changes = await this.simulateChangeDetection('internshala')
      
      if (changes.hasChanges) {
        await this.processDetectedChanges('internshala', changes)
      }

    } catch (error) {
      console.error('Error monitoring Internshala:', error)
    }
  }

  /**
   * Monitor LinkedIn for new internships
   */
  private async monitorLinkedIn(): Promise<void> {
    try {
      console.log('🔍 Monitoring LinkedIn for updates...')
      
      const job = this.monitoringJobs.get('linkedin-monitor')
      if (job) {
        job.lastRun = new Date()
        job.nextRun = new Date(Date.now() + this.getIntervalMs(job.interval))
      }

      // In a real implementation, this would use LinkedIn API or scraping
      // For now, simulate finding new internships
      const changes = await this.simulateChangeDetection('linkedin')
      
      if (changes.hasChanges) {
        await this.processDetectedChanges('linkedin', changes)
      }

    } catch (error) {
      console.error('Error monitoring LinkedIn:', error)
    }
  }

  /**
   * Monitor generic sources for new internships
   */
  private async monitorGenericSources(): Promise<void> {
    try {
      console.log('🔍 Monitoring generic sources for updates...')
      
      const job = this.monitoringJobs.get('generic-monitor')
      if (job) {
        job.lastRun = new Date()
        job.nextRun = new Date(Date.now() + this.getIntervalMs(job.interval))
      }

      // Monitor multiple generic sources
      const sources = ['indeed', 'glassdoor', 'naukri']
      
      for (const source of sources) {
        const changes = await this.simulateChangeDetection(source)
        if (changes.hasChanges) {
          await this.processDetectedChanges(source, changes)
        }
      }

    } catch (error) {
      console.error('Error monitoring generic sources:', error)
    }
  }

  /**
   * Simulate change detection (replace with actual scraping logic)
   */
  private async simulateChangeDetection(source: string): Promise<ChangeDetectionResult> {
    // This is a simulation - in real implementation, this would:
    // 1. Fetch current data from the source
    // 2. Compare with cached/stored data
    // 3. Detect new, updated, or removed internships
    
    const shouldHaveChanges = Math.random() < 0.1 // 10% chance of changes
    
    if (!shouldHaveChanges) {
      return {
        hasChanges: false,
        newInternships: [],
        updatedInternships: [],
        removedInternships: []
      }
    }

    // Simulate finding new internships
    const newInternships: Internship[] = []
    const numNewInternships = Math.floor(Math.random() * 3) + 1 // 1-3 new internships

    for (let i = 0; i < numNewInternships; i++) {
      const mockInternship: Internship = {
        id: Date.now() + i, // Temporary ID
        title: `${source} Internship ${i + 1}`,
        company_name: `Company ${i + 1}`,
        description: `New internship opportunity from ${source}`,
        location: 'Remote',
        stipend: 15000 + (i * 5000),
        duration_months: 3,
        work_type: 'remote',
        required_skills: ['JavaScript', 'React', 'Node.js'],
        application_url: `https://${source}.com/internship/${Date.now() + i}`,
        source_website: source,
        external_id: `${source}_${Date.now() + i}`,
        posted_date: new Date(),
        application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
      newInternships.push(mockInternship)
    }

    return {
      hasChanges: true,
      newInternships,
      updatedInternships: [],
      removedInternships: []
    }
  }

  /**
   * Process detected changes and notify users
   */
  private async processDetectedChanges(source: string, changes: ChangeDetectionResult): Promise<void> {
    try {
      console.log(`📊 Processing ${changes.newInternships.length} new internships from ${source}`)

      const webSocketService = getWebSocketService()

      // Process new internships
      for (const internship of changes.newInternships) {
        // Store the internship (in real implementation)
        // const savedInternship = await InternshipModel.create(internship)

        // Broadcast to all connected users
        webSocketService.broadcastNewInternship(internship)

        // Find users who might be interested in this internship
        const interestedUsers = await this.findInterestedUsers(internship)

        // Send personalized notifications
        for (const userId of interestedUsers) {
          const notification = await UpdateNotificationModel.createNewMatchNotification(
            userId,
            internship.id,
            internship.title,
            internship.company_name
          )

          webSocketService.sendNotificationToUser(userId, notification)
        }
      }

      // Process updated internships
      for (const internship of changes.updatedInternships) {
        webSocketService.sendInternshipUpdate(internship.id, {
          type: 'updated',
          internship,
          source
        })
      }

      // Process removed internships
      for (const internship of changes.removedInternships) {
        webSocketService.sendInternshipUpdate(internship.id, {
          type: 'removed',
          internship,
          source
        })
      }

    } catch (error) {
      console.error(`Error processing changes from ${source}:`, error)
    }
  }

  /**
   * Find users who might be interested in a new internship
   */
  private async findInterestedUsers(_internship: Internship): Promise<number[]> {
    try {
      // In a real implementation, this would use the recommendation engine
      // to find users whose skills and preferences match the internship
      
      // For now, return a few random user IDs (simulation)
      // This is a placeholder - in real implementation, query users based on skills/preferences
      const interestedUsers: number[] = []

      // Simulate finding interested users (replace with actual logic)
      for (let i = 1; i <= 5; i++) {
        interestedUsers.push(i) // Assuming user IDs 1-5 exist
      }

      return interestedUsers.slice(0, 10) // Limit to 10 users to avoid spam
    } catch (error) {
      console.error('Error finding interested users:', error)
      return []
    }
  }

  /**
   * Handle webhook notifications from external sources
   */
  public async handleWebhook(source: string, payload: WebhookPayload): Promise<void> {
    try {
      console.log(`📨 Received webhook from ${source}:`, payload.type)

      const webSocketService = getWebSocketService()

      switch (payload.type) {
        case 'new':
          for (const internshipData of payload.internships) {
            // Process new internship
            const internship = await this.normalizeInternshipData(source, internshipData)
            
            // Store and broadcast
            webSocketService.broadcastNewInternship(internship)
            
            // Find and notify interested users
            const interestedUsers = await this.findInterestedUsers(internship)
            for (const userId of interestedUsers) {
              const notification = await UpdateNotificationModel.createNewMatchNotification(
                userId,
                internship.id,
                internship.title,
                internship.company_name
              )
              webSocketService.sendNotificationToUser(userId, notification)
            }
          }
          break

        case 'updated':
          for (const internshipData of payload.internships) {
            const internship = await this.normalizeInternshipData(source, internshipData)
            webSocketService.sendInternshipUpdate(internship.id, {
              type: 'updated',
              internship,
              source
            })
          }
          break

        case 'removed':
          for (const internshipData of payload.internships) {
            const internship = await this.normalizeInternshipData(source, internshipData)
            webSocketService.sendInternshipUpdate(internship.id, {
              type: 'removed',
              internship,
              source
            })
          }
          break
      }

    } catch (error) {
      console.error(`Error handling webhook from ${source}:`, error)
    }
  }

  /**
   * Normalize internship data from different sources
   */
  private async normalizeInternshipData(source: string, rawData: any): Promise<Internship> {
    // This would contain source-specific normalization logic
    // For now, return a basic normalized structure
    
    return {
      id: rawData.id || Date.now(),
      title: rawData.title || rawData.job_title || 'Untitled Internship',
      company_name: rawData.company_name || rawData.company || 'Unknown Company',
      description: rawData.description || rawData.job_description || '',
      location: rawData.location || rawData.city || 'Not specified',
      stipend: rawData.stipend || rawData.salary || 0,
      duration_months: rawData.duration_months || rawData.duration || 3,
      work_type: rawData.work_type || rawData.type || 'office',
      required_skills: rawData.required_skills || rawData.skills || [],
      application_url: rawData.application_url || rawData.apply_url || '',
      source_website: source,
      external_id: rawData.external_id || rawData.id?.toString() || '',
      posted_date: rawData.posted_date ? new Date(rawData.posted_date) : new Date(),
      application_deadline: rawData.deadline ? new Date(rawData.deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: rawData.is_active !== false,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  /**
   * Clean up old data
   */
  private async cleanupOldData(): Promise<void> {
    try {
      console.log('🧹 Running cleanup tasks...')

      // Clean up old notifications (older than 30 days)
      const deletedNotifications = await UpdateNotificationModel.cleanupOldNotifications(30)
      console.log(`🗑️ Cleaned up ${deletedNotifications} old notifications`)

      // Clear old cache entries
      this.changeDetectionCache.clear()
      console.log('🗑️ Cleared change detection cache')

    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Get monitoring job status
   */
  public getJobStatus(): Array<{
    id: string
    source: string
    type: 'polling' | 'webhook' | 'rss'
    interval: string
    isActive: boolean
    lastRun?: string | undefined
    nextRun?: string | undefined
  }> {
    return Array.from(this.monitoringJobs.values()).map(job => ({
      id: job.id,
      source: job.source,
      type: job.type,
      interval: job.interval,
      isActive: job.isActive,
      lastRun: job.lastRun?.toISOString(),
      nextRun: job.nextRun?.toISOString()
    }))
  }

  /**
   * Convert cron interval to milliseconds
   */
  private getIntervalMs(cronExpression: string): number {
    // Simple conversion for common patterns
    if (cronExpression.includes('*/3')) return 3 * 60 * 1000 // 3 minutes
    if (cronExpression.includes('*/5')) return 5 * 60 * 1000 // 5 minutes
    if (cronExpression.includes('*/10')) return 10 * 60 * 1000 // 10 minutes
    return 5 * 60 * 1000 // Default 5 minutes
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    console.log('🛑 Shutting down real-time monitoring service...')
    this.stopMonitoring()
    this.changeDetectionCache.clear()
    console.log('✅ Real-time monitoring service shut down')
  }
}

// Singleton instance
let realTimeMonitorService: RealTimeMonitorService | null = null

export const getRealTimeMonitorService = (): RealTimeMonitorService => {
  if (!realTimeMonitorService) {
    realTimeMonitorService = new RealTimeMonitorService()
  }
  return realTimeMonitorService
}

export const initializeRealTimeMonitorService = (): RealTimeMonitorService => {
  const service = getRealTimeMonitorService()
  service.initialize()
  return service
}