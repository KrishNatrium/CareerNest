import React, { useState } from 'react'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip
} from '@mui/material'
import {
  Add as AddIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { applicationService } from '../../services/applicationService'
import { Internship, ApplicationStatus, UserApplicationCreateInput } from '../../types/internship.types'
import { getStatusLabel, getStatusColor } from '../../utils/formatters'

interface ApplyButtonProps {
  internship: Internship
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
}

export const ApplyButton: React.FC<ApplyButtonProps> = ({ 
  internship, 
  variant = 'contained',
  size = 'medium'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    application_status: 'applied' as ApplicationStatus,
    notes: '',
    reminder_date: ''
  })

  const queryClient = useQueryClient()

  // Check if user has already applied
  const { data: applicationStatus } = useQuery({
    queryKey: ['application-status', internship.id],
    queryFn: () => applicationService.checkApplicationStatus(internship.id)
  })

  // Create application mutation
  const createMutation = useMutation({
    mutationFn: (data: UserApplicationCreateInput) => 
      applicationService.createApplication(data),
    onSuccess: () => {
      toast.success('Application tracked successfully!')
      setDialogOpen(false)
      setFormData({
        application_status: 'applied',
        notes: '',
        reminder_date: ''
      })
      queryClient.invalidateQueries({ queryKey: ['application-status', internship.id] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to track application')
    }
  })

  const handleApply = () => {
    if (applicationStatus?.has_applied) {
      // If already applied, just open the external link
      if (internship.application_url) {
        window.open(internship.application_url, '_blank')
      }
      return
    }
    
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    const applicationData: UserApplicationCreateInput = {
      internship_id: internship.id,
      application_status: formData.application_status,
      notes: formData.notes || undefined,
      reminder_date: formData.reminder_date ? new Date(formData.reminder_date).toISOString() : undefined
    }

    createMutation.mutate(applicationData)
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

  if (applicationStatus?.has_applied && applicationStatus.application) {
    return (
      <Chip
        icon={<CheckIcon />}
        label={getStatusLabel(applicationStatus.application.application_status)}
        color={getStatusColor(applicationStatus.application.application_status)}
        size={size === 'large' ? 'medium' : size}
        onClick={handleApply}
        clickable
      />
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={<AddIcon />}
        onClick={handleApply}
        disabled={createMutation.isPending}
      >
        Track Application
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Track Application</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Track your application to <strong>{internship.title}</strong> at <strong>{internship.company_name}</strong>
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Application Status</InputLabel>
              <Select
                value={formData.application_status}
                label="Application Status"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  application_status: e.target.value as ApplicationStatus 
                })}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Notes (Optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this application..."
            />

            <TextField
              fullWidth
              margin="normal"
              label="Reminder Date (Optional)"
              type="date"
              value={formData.reminder_date}
              onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Set a reminder for follow-up or interview preparation"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {internship.application_url && (
            <Button
              onClick={() => window.open(internship.application_url, '_blank')}
              variant="outlined"
            >
              Apply Now
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Tracking...' : 'Track Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}