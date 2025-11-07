import React, { useState } from 'react'
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,

  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete
} from '@mui/material'
import { Save, Person, Settings, Notifications } from '@mui/icons-material'
import NotificationPreferencesComponent from '../components/notifications/NotificationPreferences'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import { SkillsSelector } from '../components/profile/SkillsSelector'
import {
  ProfileUpdateData,
  UserSkillInput,
  UserPreferencesInput
} from '../types/auth.types'
import { toast } from 'react-toastify'

interface FormErrors {
  first_name?: string
  last_name?: string
  phone?: string
  location?: string
}

const WORK_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'office', label: 'Office' },
  { value: 'hybrid', label: 'Hybrid' }
] as const

const COMMON_LOCATIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
  'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana',
  'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad',
  'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur',
  'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad'
]

export const ProfilePage: React.FC = () => {
  const { user, loadUser } = useAuth()
  
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    location: user?.location || ''
  })
  
  const [skills, setSkills] = useState<UserSkillInput[]>(
    user?.skills?.map(skill => ({
      skill_name: skill.skill_name,
      proficiency_level: skill.proficiency_level
    })) || []
  )
  
  const [preferences, setPreferences] = useState<UserPreferencesInput>({
    preferred_locations: user?.preferences?.preferred_locations || [],
    min_stipend: user?.preferences?.min_stipend || 0,
    max_duration_months: user?.preferences?.max_duration_months || undefined,
    work_type: user?.preferences?.work_type || 'any',
    notification_enabled: user?.preferences?.notification_enabled ?? true,
    email_notifications: user?.preferences?.email_notifications ?? true
  })
  
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!profileData.first_name?.trim()) {
      errors.first_name = 'First name is required'
    } else if (profileData.first_name.length > 50) {
      errors.first_name = 'First name must not exceed 50 characters'
    }

    if (!profileData.last_name?.trim()) {
      errors.last_name = 'Last name is required'
    } else if (profileData.last_name.length > 50) {
      errors.last_name = 'Last name must not exceed 50 characters'
    }

    if (profileData.phone && !/^[+]?[1-9]\d{1,14}$/.test(profileData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    if (profileData.location && profileData.location.length > 255) {
      errors.location = 'Location must not exceed 255 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof ProfileUpdateData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setProfileData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear success message
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // Update profile
      await AuthService.updateProfile(profileData)
      
      // Update skills
      await AuthService.updateSkills(skills)
      
      // Update preferences
      await AuthService.updatePreferences(preferences)
      
      // Reload user data
      await loadUser()
      
      setSuccessMessage('Profile updated successfully!')
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {/* Personal Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Person sx={{ mr: 1 }} />
              <Typography variant="h6">Personal Information</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.first_name}
                  onChange={handleInputChange('first_name')}
                  error={!!formErrors.first_name}
                  helperText={formErrors.first_name}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={handleInputChange('last_name')}
                  error={!!formErrors.last_name}
                  helperText={formErrors.last_name}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={user.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={handleInputChange('phone')}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={profileData.location}
                  onChange={handleInputChange('location')}
                  error={!!formErrors.location}
                  helperText={formErrors.location}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <SkillsSelector
              skills={skills}
              onChange={setSkills}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings sx={{ mr: 1 }} />
              <Typography variant="h6">Preferences</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Stipend (₹)"
                  type="number"
                  value={preferences.min_stipend}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    min_stipend: parseInt(e.target.value) || 0
                  }))}
                  inputProps={{ min: 0, max: 1000000 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Maximum Duration (months)"
                  type="number"
                  value={preferences.max_duration_months || ''}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    max_duration_months: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  inputProps={{ min: 1, max: 24 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Work Type</InputLabel>
                  <Select
                    value={preferences.work_type}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      work_type: e.target.value as any
                    }))}
                    label="Work Type"
                  >
                    {WORK_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={COMMON_LOCATIONS}
                  value={preferences.preferred_locations || []}
                  onChange={(_, value) => setPreferences(prev => ({
                    ...prev,
                    preferred_locations: value
                  }))}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Preferred Locations"
                      placeholder="Select preferred locations"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <NotificationPreferencesComponent />

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
            onClick={handleSaveProfile}
            disabled={isLoading}
            sx={{ px: 4 }}
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </Box>
      </Box>
    </Container>
  )
}