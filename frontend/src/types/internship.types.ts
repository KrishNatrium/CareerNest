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
  posted_date?: string
  application_deadline?: string
  is_active: boolean
  created_at: string
  updated_at: string
  relevance_score?: number
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
  posted_after?: string
  deadline_before?: string
  source_website?: string
  page?: number
  limit?: number
  sort_by?: 'posted_date' | 'deadline' | 'stipend' | 'relevance'
  sort_order?: 'asc' | 'desc'
}

export interface InternshipSearchResult {
  internships: Internship[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface SearchSuggestion {
  text: string
  type: 'keyword' | 'location' | 'company' | 'skill'
  count?: number
}

export interface PopularSearch {
  query: string
  count: number
}

export interface FilterOptions {
  locations: string[]
  companies: string[]
  skills: string[]
  workTypes: string[]
  sources: string[]
}

export interface InternshipStats {
  total_internships: number
  active_internships: number
  by_source: Record<string, number>
  by_work_type: Record<WorkType, number>
  recent_additions: number
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
  applied_date: string
  last_updated: string
  notes?: string
  reminder_date?: string
}

export interface UserApplicationWithInternship extends UserApplication {
  internship: Internship
}

export interface UserApplicationCreateInput {
  internship_id: number
  application_status?: ApplicationStatus
  notes?: string
  reminder_date?: string
}

export interface UserApplicationUpdateInput {
  application_status?: ApplicationStatus
  notes?: string
  reminder_date?: string
}

export interface ApplicationStats {
  total_applications: number
  by_status: Record<ApplicationStatus, number>
  recent_applications: number
  upcoming_deadlines: number
}

export interface ApplicationInsights {
  response_rate: number
  average_response_time: number
  most_successful_status: string
  recommendations: string[]
}

export interface ApplicationsResponse {
  applications: UserApplicationWithInternship[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}