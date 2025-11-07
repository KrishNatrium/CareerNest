import * as cron from 'node-cron'
import { ReminderService } from './ReminderService'

export class SchedulerService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map()

  /**
   * Initialize all scheduled jobs
   */
  static initialize(): void {
    console.log('Initializing scheduler service...')

    // Process reminders every hour
    this.scheduleJob('reminder-processing', '0 * * * *', async () => {
      console.log('Running scheduled reminder processing...')
      await ReminderService.scheduleReminderProcessing()
    })

    // Process deadline reminders twice daily (9 AM and 6 PM)
    this.scheduleJob('deadline-reminders', '0 9,18 * * *', async () => {
      console.log('Running scheduled deadline reminder processing...')
      await ReminderService.processUpcomingDeadlines()
    })

    console.log('Scheduler service initialized with', this.jobs.size, 'jobs')
  }

  /**
   * Schedule a new cron job
   */
  private static scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    try {
      const job = cron.schedule(schedule, async () => {
        try {
          await task()
        } catch (error) {
          console.error(`Error in scheduled job '${name}':`, error)
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      })

      this.jobs.set(name, job)
      console.log(`Scheduled job '${name}' with pattern: ${schedule}`)
    } catch (error) {
      console.error(`Failed to schedule job '${name}':`, error)
    }
  }

  /**
   * Stop a specific job
   */
  static stopJob(name: string): boolean {
    const job = this.jobs.get(name)
    if (job) {
      job.stop()
      this.jobs.delete(name)
      console.log(`Stopped job '${name}'`)
      return true
    }
    return false
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAll(): void {
    console.log('Stopping all scheduled jobs...')
    
    for (const [name, job] of this.jobs) {
      job.stop()
      console.log(`Stopped job '${name}'`)
    }
    
    this.jobs.clear()
    console.log('All scheduled jobs stopped')
  }

  /**
   * Get status of all jobs
   */
  static getJobStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = []
    
    for (const [name, job] of this.jobs) {
      status.push({
        name,
        running: (job as any).running || false
      })
    }
    
    return status
  }

  /**
   * Manually trigger reminder processing (for testing)
   */
  static async triggerReminderProcessing(): Promise<void> {
    console.log('Manually triggering reminder processing...')
    await ReminderService.scheduleReminderProcessing()
  }
}