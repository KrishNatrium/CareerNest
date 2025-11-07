export interface User {
  id: number
  email: string
  password_hash: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
  is_active: boolean
  email_verified: boolean
  created_at: Date
  updated_at: Date
}

export interface UserCreateInput {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
}

export interface UserUpdateInput {
  first_name?: string
  last_name?: string
  phone?: string
  location?: string
  is_active?: boolean
  email_verified?: boolean
}

export interface UserPublic {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  location?: string
  is_active: boolean
  email_verified: boolean
  created_at: Date
  updated_at: Date
}

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface UserSkill {
  id: number
  user_id: number
  skill_name: string
  proficiency_level: ProficiencyLevel
  created_at: Date
}

export interface UserSkillCreateInput {
  skill_name: string
  proficiency_level: ProficiencyLevel
}

export interface UserSkillUpdateInput {
  proficiency_level?: ProficiencyLevel
}

export type WorkType = 'remote' | 'office' | 'hybrid' | 'any'

export interface UserPreferences {
  id: number
  user_id: number
  preferred_locations: string[]
  min_stipend: number
  max_duration_months?: number
  work_type: WorkType
  notification_enabled: boolean
  email_notifications: boolean
  created_at: Date
  updated_at: Date
}

export interface UserPreferencesCreateInput {
  preferred_locations?: string[]
  min_stipend?: number
  max_duration_months?: number
  work_type?: WorkType
  notification_enabled?: boolean
  email_notifications?: boolean
}

export interface UserPreferencesUpdateInput {
  preferred_locations?: string[]
  min_stipend?: number
  max_duration_months?: number
  work_type?: WorkType
  notification_enabled?: boolean
  email_notifications?: boolean
}

export interface UserWithDetails extends UserPublic {
  skills: UserSkill[]
  preferences?: UserPreferences
}