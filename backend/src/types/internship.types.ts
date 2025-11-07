export type WorkType = 'remote' | 'office' | 'hybrid'

export interface Internship {
  id: number
  title: string
  company_name: string
  description?: string
  location?: string
  stipend?: number
  duration_months?: number
  work_type: WorkType
  required_skills: string[]
  application_url?: string
  source_website: string
  external_id?: string
  posted_date?: Date
  application_deadline?: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface InternshipCreateInput {
  title: string
  company_name: string
  description?: string
  location?: string
  stipend?: number
  duration_months?: number
  work_type?: WorkType
  required_skills?: string[]
  application_url?: string
  source_website: string
  external_id?: string
  posted_date?: Date
  application_deadline?: Date
}

export interface InternshipUpdateInput {
  title?: string
  company_name?: string
  description?: string
  location?: string
  stipend?: number
  duration_months?: number
  work_type?: WorkType
  required_skills?: string[]
  application_url?: string
  posted_date?: Date
  application_deadline?: Date
  is_active?: boolean
}

export interface InternshipSearchFilters {
  keywords?: string
  location?: string
  company?: string
  min_stipend?: number
  max_stipend?: number
  min_duration?: number
  max_duration?: number
  work_type?: WorkType
  skills?: string[]
  posted_after?: Date
  deadline_before?: Date
  source_website?: string
  limit?: number
  offset?: number
  sort_by?: 'posted_date' | 'deadline' | 'stipend' | 'relevance'
  sort_order?: 'asc' | 'desc'
}

export interface InternshipSearchResult {
  internships: Internship[]
  total_count: number
  has_more: boolean
}

export type ApplicationStatus = 
  | 'applied' 
  | 'under_review' 
  | 'interview_scheduled' 
  | 'interviewed' 
  | 'offered' 
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn'

export interface UserApplication {
  id: number
  user_id: number
  internship_id: number
  application_status: ApplicationStatus
  applied_date: Date
  last_updated: Date
  notes?: string
  reminder_date?: Date
}

export interface UserApplicationCreateInput {
  internship_id: number
  application_status?: ApplicationStatus
  notes?: string
  reminder_date?: Date
}

export interface UserApplicationUpdateInput {
  application_status?: ApplicationStatus
  notes?: string
  reminder_date?: Date
}

export interface UserApplicationWithInternship extends UserApplication {
  internship: Internship
}

export type JobType = 'full_scrape' | 'incremental' | 'webhook' | 'monitoring'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface ScrapingJob {
  id: number
  source_name: string
  job_type: JobType
  status: JobStatus
  started_at?: Date
  completed_at?: Date
  records_processed: number
  records_added: number
  records_updated: number
  records_failed: number
  error_message?: string
  next_run_at?: Date
  created_at: Date
}

export interface ScrapingJobCreateInput {
  source_name: string
  job_type: JobType
  next_run_at?: Date
}

export interface ScrapingJobUpdateInput {
  status?: JobStatus
  started_at?: Date
  completed_at?: Date
  records_processed?: number
  records_added?: number
  records_updated?: number
  records_failed?: number
  error_message?: string
  next_run_at?: Date
}

export type NotificationType = 
  | 'new_match' 
  | 'deadline_reminder' 
  | 'status_change' 
  | 'new_internship' 
  | 'internship_updated'

export type DeliveryMethod = 'websocket' | 'email' | 'push'

export interface UpdateNotification {
  id: number
  user_id: number
  internship_id?: number
  notification_type: NotificationType
  title: string
  message: string
  is_read: boolean
  sent_at: Date
  delivery_method: DeliveryMethod
  metadata?: Record<string, any>
}

export interface UpdateNotificationCreateInput {
  user_id: number
  internship_id?: number
  notification_type: NotificationType
  title: string
  message: string
  delivery_method?: DeliveryMethod
  metadata?: Record<string, any>
}

export interface UpdateNotificationUpdateInput {
  is_read?: boolean
}

export interface ApplicationStats {
  total_applications: number
  by_status: Record<ApplicationStatus, number>
  recent_applications: number
  upcoming_deadlines: number
}

export interface InternshipStats {
  total_internships: number
  active_internships: number
  by_source: Record<string, number>
  by_work_type: Record<WorkType, number>
  recent_additions: number
}