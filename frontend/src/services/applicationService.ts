import api from './api'
import {
  UserApplication,
  UserApplicationWithInternship,
  UserApplicationCreateInput,
  UserApplicationUpdateInput,
  ApplicationStats,
  ApplicationInsights,
  ApplicationsResponse,
  ApplicationStatus
} from '../types/internship.types'

export interface ApplicationFilters {
  status?: ApplicationStatus
  limit?: number
  offset?: number
}

export interface ReminderFilters {
  days?: number
}

export const applicationService = {
  // Create or update an application
  async createApplication(data: UserApplicationCreateInput): Promise<UserApplication> {
    const response = await api.post('/applications', data)
    return response.data.data
  },

  // Get user's applications with optional filtering
  async getUserApplications(filters: ApplicationFilters = {}): Promise<ApplicationsResponse> {
    const params = new URLSearchParams()
    
    if (filters.status) params.append('status', filters.status)
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())

    const response = await api.get(`/applications?${params.toString()}`)
    return response.data.data
  },

  // Update application status and details
  async updateApplication(id: number, data: UserApplicationUpdateInput): Promise<UserApplication> {
    const response = await api.put(`/applications/${id}`, data)
    return response.data.data
  },

  // Delete application
  async deleteApplication(id: number): Promise<void> {
    await api.delete(`/applications/${id}`)
  },

  // Get application statistics
  async getApplicationStats(): Promise<ApplicationStats> {
    const response = await api.get('/applications/stats')
    return response.data.data
  },

  // Get application insights and recommendations
  async getApplicationInsights(): Promise<ApplicationInsights> {
    const response = await api.get('/applications/insights')
    return response.data.data
  },

  // Get applications with upcoming reminders
  async getUpcomingReminders(filters: ReminderFilters = {}): Promise<UserApplicationWithInternship[]> {
    const params = new URLSearchParams()
    
    if (filters.days) params.append('days', filters.days.toString())

    const response = await api.get(`/applications/reminders?${params.toString()}`)
    return response.data.data
  },

  // Check if user has applied to a specific internship
  async checkApplicationStatus(internshipId: number): Promise<{
    has_applied: boolean
    application: UserApplication | null
  }> {
    const response = await api.get(`/applications/check/${internshipId}`)
    return response.data.data
  },

  // Get applications by status
  async getApplicationsByStatus(status: ApplicationStatus, limit = 50, offset = 0): Promise<ApplicationsResponse> {
    return this.getUserApplications({ status, limit, offset })
  }
}