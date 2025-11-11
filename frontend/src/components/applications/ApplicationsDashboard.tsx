import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Pagination,
  Chip
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { ApplicationCard } from './ApplicationCard'
import { ApplicationStats } from './ApplicationStats'
import { AddApplicationForm, ManualApplicationData } from './AddApplicationForm'
import { applicationService } from '../../services/applicationService'
import {
  ApplicationStatus
} from '../../types/internship.types'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  )
}

export const ApplicationsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const pageSize = 10

  const queryClient = useQueryClient()

  // Fetch applications
  const {
    data: applicationsData,
    isLoading: applicationsLoading,
    error: applicationsError,
    refetch: refetchApplications
  } = useQuery({
    queryKey: ['applications', statusFilter, currentPage],
    queryFn: () => applicationService.getUserApplications({
      status: statusFilter || undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    })
  })

  // Fetch statistics
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['application-stats'],
    queryFn: applicationService.getApplicationStats
  })

  // Fetch insights
  const {
    data: insights,
    isLoading: insightsLoading
  } = useQuery({
    queryKey: ['application-insights'],
    queryFn: applicationService.getApplicationInsights
  })

  // Fetch upcoming reminders
  const {
    data: reminders,
    isLoading: remindersLoading
  } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: () => applicationService.getUpcomingReminders({ days: 7 })
  })

  // Update application mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      applicationService.updateApplication(id, data),
    onSuccess: () => {
      toast.success('Application updated successfully')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      queryClient.invalidateQueries({ queryKey: ['application-insights'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update application')
    }
  })

  // Delete application mutation
  const deleteMutation = useMutation({
    mutationFn: applicationService.deleteApplication,
    onSuccess: () => {
      toast.success('Application deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      queryClient.invalidateQueries({ queryKey: ['application-insights'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete application')
    }
  })

  // Create manual application mutation
  const createMutation = useMutation({
    mutationFn: applicationService.createApplication,
    onSuccess: () => {
      toast.success('Application added successfully')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      queryClient.invalidateQueries({ queryKey: ['application-insights'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add application')
    }
  })

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (status: ApplicationStatus | '') => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleUpdateApplication = (id: number, data: any) => {
    updateMutation.mutate({ id, data })
  }

  const handleDeleteApplication = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleRefresh = () => {
    refetchApplications()
    queryClient.invalidateQueries({ queryKey: ['application-stats'] })
    queryClient.invalidateQueries({ queryKey: ['application-insights'] })
    queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] })
  }

  const handleAddApplication = (data: ManualApplicationData) => {
    createMutation.mutate(data)
  }

  const filteredApplications = applicationsData?.applications.filter(app => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      app.internship.title.toLowerCase().includes(query) ||
      app.internship.company_name.toLowerCase().includes(query) ||
      app.internship.location?.toLowerCase().includes(query)
    )
  }) || []

  const statusOptions: { value: ApplicationStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Application Tracker
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddFormOpen(true)}
            color="primary"
          >
            Add Application
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={applicationsLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Add Application Form Dialog */}
      <AddApplicationForm
        open={addFormOpen}
        onClose={() => setAddFormOpen(false)}
        onSubmit={handleAddApplication}
      />

      {/* Statistics */}
      {stats && (
        <Box mb={3}>
          <ApplicationStats 
            stats={stats} 
            insights={insights}
          />
        </Box>
      )}

      {/* Upcoming Reminders */}
      {reminders && reminders.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Upcoming Reminders ({reminders.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {reminders.slice(0, 3).map((reminder) => (
              <Chip
                key={reminder.id}
                label={`${reminder.internship.company_name} - ${reminder.internship.title}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            ))}
            {reminders.length > 3 && (
              <Chip
                label={`+${reminders.length - 3} more`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="All Applications" />
          <Tab label="Active" />
          <Tab label="Completed" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value as ApplicationStatus | '')}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* All Applications */}
        {applicationsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : applicationsError ? (
          <Alert severity="error">
            Failed to load applications. Please try again.
          </Alert>
        ) : filteredApplications.length === 0 ? (
          <Alert severity="info">
            No applications found. Start applying to internships to track them here.
          </Alert>
        ) : (
          <>
            {filteredApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onUpdate={handleUpdateApplication}
                onDelete={handleDeleteApplication}
              />
            ))}
            
            {applicationsData && applicationsData.pagination.total > pageSize && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={Math.ceil(applicationsData.pagination.total / pageSize)}
                  page={currentPage}
                  onChange={(_event, page) => setCurrentPage(page)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Active Applications */}
        <Typography variant="body1" color="text.secondary">
          Active applications (Applied, Under Review, Interview Scheduled, Interviewed, Offered)
        </Typography>
        {/* Filter for active statuses would be implemented here */}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Completed Applications */}
        <Typography variant="body1" color="text.secondary">
          Completed applications (Accepted, Rejected, Withdrawn)
        </Typography>
        {/* Filter for completed statuses would be implemented here */}
      </TabPanel>
    </Box>
  )
}