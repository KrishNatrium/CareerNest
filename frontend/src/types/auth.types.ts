export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface UserSkill {
  id: number
  user_id: number
  skill_name: string
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  created_at: string
}

export interface UserPreferences {
  id: number
  user_id: number
  preferred_locations: string[]
  min_stipend: number
  max_duration_months?: number
  work_type: 'remote' | 'office' | 'hybrid' | 'any'
  notification_enabled: boolean
  email_notifications: boolean
  created_at: string
  updated_at: string
}

export interface UserWithDetails extends User {
  skills: UserSkill[]
  preferences?: UserPreferences
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    tokens: AuthTokens
  }
}

export interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  phone?: string
  location?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UserSkillInput {
  skill_name: string
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface UserPreferencesInput {
  preferred_locations?: string[]
  min_stipend?: number
  max_duration_months?: number
  work_type?: 'remote' | 'office' | 'hybrid' | 'any'
  notification_enabled?: boolean
  email_notifications?: boolean
}