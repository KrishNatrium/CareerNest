import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,

} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material'
import { UserApplicationWithInternship, ApplicationStatus } from '../../types/internship.types'
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '../../utils/formatters'

interface ApplicationCardProps {
  application: UserApplicationWithInternship
  onUpdate: (id: number, data: any) => void
  onDelete: (id: number) => void
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onUpdate,
  onDelete
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    application_status: application.application_status,
    notes: application.notes || '',
    reminder_date: application.reminder_date ? application.reminder_date.split('T')[0] : ''
  })

  const { internship, is_manual_entry } = application

  // Get display data (either from internship or manual fields)
  const displayData = is_manual_entry ? {
    title: application.manual_position_title || 'Untitled Position',
    company_name: application.manual_company_name || 'Unknown Company',
    location: application.manual_location,
    application_url: application.manual_application_url,
    deadline: application.manual_deadline
  } : {
    title: internship?.title || 'Untitled Position',
    company_name: internship?.company_name || 'Unknown Company',
    location: internship?.location,
    application_url: internship?.application_url,
    stipend: internship?.stipend,
    duration_months: internship?.duration_months,
    deadline: internship?.application_deadline
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
    handleMenuClose()
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const handleEditSave = () => {
    const updateData: any = {
      application_status: editData.application_status,
      notes: editData.notes || null
    }

    if (editData.reminder_date) {
      updateData.reminder_date = new Date(editData.reminder_date).toISOString()
    } else {
      updateData.reminder_date = null
    }

    onUpdate(application.id, updateData)
    setEditDialogOpen(false)
  }

  const handleDeleteConfirm = () => {
    onDelete(application.id)
    setDeleteDialogOpen(false)
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
    <>
      <Card sx={{ mb: 2, position: 'relative' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h6" component="h3">
                  {displayData.title}
                </Typography>
                {is_manual_entry && (
                  <Chip label="Manual" size="small" variant="outlined" color="info" />
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {displayData.company_name}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={getStatusLabel(application.application_status)}
                color={getStatusColor(application.application_status)}
                size="small"
              />
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
            {displayData.location && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {displayData.location}
                </Typography>
              </Box>
            )}
            
            {!is_manual_entry && displayData.stipend && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(displayData.stipend)}
                </Typography>
              </Box>
            )}
            
            {!is_manual_entry && displayData.duration_months && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {displayData.duration_months} months
                </Typography>
              </Box>
            )}

            {displayData.deadline && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Deadline: {formatDate(displayData.deadline)}
                </Typography>
              </Box>
            )}
          </Box>

          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Applied: {formatDate(application.applied_date)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Updated: {formatDate(application.last_updated)}
            </Typography>
            {application.reminder_date && (
              <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                <ScheduleIcon fontSize="small" color="warning" />
                <Typography variant="body2" color="warning.main">
                  Reminder: {formatDate(application.reminder_date)}
                </Typography>
              </Box>
            )}
          </Box>

          {application.notes && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {application.notes}
              </Typography>
            </Box>
          )}
        </CardContent>

        <CardActions>
          {displayData.application_url && (
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(displayData.application_url, '_blank')}
            >
              View Original
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Application</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={editData.application_status}
                label="Status"
                onChange={(e) => setEditData({ ...editData, application_status: e.target.value as ApplicationStatus })}
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
              label="Notes"
              multiline
              rows={3}
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Add notes about this application..."
            />

            <TextField
              fullWidth
              margin="normal"
              label="Reminder Date"
              type="date"
              value={editData.reminder_date}
              onChange={(e) => setEditData({ ...editData, reminder_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Application</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete your application to {displayData.title} at {displayData.company_name}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}