import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  InputAdornment
} from '@mui/material'
import { ApplicationStatus } from '../../types/internship.types'

interface AddApplicationFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ManualApplicationData) => void
}

export interface ManualApplicationData {
  is_manual_entry: true
  manual_company_name: string
  manual_position_title: string
  manual_location?: string
  manual_application_url?: string
  manual_deadline?: Date
  application_status: ApplicationStatus
  notes?: string
  reminder_date?: Date
}

export const AddApplicationForm: React.FC<AddApplicationFormProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<ManualApplicationData>({
    is_manual_entry: true,
    manual_company_name: '',
    manual_position_title: '',
    manual_location: '',
    manual_application_url: '',
    manual_deadline: undefined,
    application_status: 'applied',
    notes: '',
    reminder_date: undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof ManualApplicationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.manual_company_name.trim()) {
      newErrors.manual_company_name = 'Company name is required'
    }

    if (!formData.manual_position_title.trim()) {
      newErrors.manual_position_title = 'Position title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      is_manual_entry: true,
      manual_company_name: '',
      manual_position_title: '',
      manual_location: '',
      manual_application_url: '',
      manual_deadline: undefined,
      application_status: 'applied',
      notes: '',
      reminder_date: undefined
    })
    setErrors({})
    onClose()
  }

  const statusOptions: { value: ApplicationStatus; label: string }[] = [
    { value: 'applied', label: 'Applied' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'interviewed', label: 'Interviewed' },
    { value: 'offered', label: 'Offered' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' }
  ]

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Add Application</Typography>
        <Typography variant="body2" color="text.secondary">
          Track applications from any source
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
              {/* Company Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Company Name"
                  value={formData.manual_company_name}
                  onChange={(e) => handleChange('manual_company_name', e.target.value)}
                  error={!!errors.manual_company_name}
                  helperText={errors.manual_company_name}
                  placeholder="e.g., Google, Microsoft"
                />
              </Grid>

              {/* Position Title */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Position Title"
                  value={formData.manual_position_title}
                  onChange={(e) => handleChange('manual_position_title', e.target.value)}
                  error={!!errors.manual_position_title}
                  helperText={errors.manual_position_title}
                  placeholder="e.g., Software Engineering Intern"
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.manual_location}
                  onChange={(e) => handleChange('manual_location', e.target.value)}
                  placeholder="e.g., Remote, Bangalore"
                />
              </Grid>

              {/* Application Status */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Application Status</InputLabel>
                  <Select
                    value={formData.application_status}
                    label="Application Status"
                    onChange={(e) => handleChange('application_status', e.target.value as ApplicationStatus)}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Application URL */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Application URL"
                  value={formData.manual_application_url}
                  onChange={(e) => handleChange('manual_application_url', e.target.value)}
                  placeholder="https://..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">🔗</InputAdornment>
                    )
                  }}
                />
              </Grid>

              {/* Application Deadline */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Application Deadline"
                  value={formData.manual_deadline ? new Date(formData.manual_deadline).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('manual_deadline', e.target.value ? new Date(e.target.value) : undefined)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Reminder Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Set Reminder"
                  value={formData.reminder_date ? new Date(formData.reminder_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('reminder_date', e.target.value ? new Date(e.target.value) : undefined)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add any notes about this application..."
                />
              </Grid>
            </Grid>
          </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Application
        </Button>
      </DialogActions>
    </Dialog>
  )
}
