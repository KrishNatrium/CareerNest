import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  IconButton,
  Divider,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material'
import {
  Close,
  LocationOn,
  AttachMoney,
  Schedule,
  Launch,
  Bookmark,
  BookmarkBorder,
  Business,
  AccessTime,
  CalendarToday,
  Share,
  Flag,
  CheckCircle,
  Info,
  Warning
} from '@mui/icons-material'
import { Internship } from '../../types/internship.types'
import { toast } from 'react-toastify'

interface InternshipDetailViewProps {
  internship: Internship | null
  open: boolean
  onClose: () => void
  onSave?: (internshipId: number) => void
  onApply?: (internship: Internship) => void
  isSaved?: boolean
}

export const InternshipDetailView: React.FC<InternshipDetailViewProps> = ({
  internship,
  open,
  onClose,
  onSave,
  onApply,
  isSaved = false
}) => {
  const theme = useTheme()
  const [showFullDescription, setShowFullDescription] = useState(false)

  if (!internship) return null

  const formatStipend = (stipend: number | undefined) => {
    if (!stipend) return 'Unpaid'
    return `₹${stipend.toLocaleString()}/month`
  }

  const formatDuration = (months: number | undefined) => {
    if (!months) return 'Not specified'
    return `${months} month${months > 1 ? 's' : ''}`
  }

  const getWorkTypeColor = (workType: string) => {
    switch (workType) {
      case 'remote': return 'success'
      case 'hybrid': return 'warning'
      case 'office': return 'primary'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCompanyInitials = (companyName: string) => {
    return companyName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isDeadlineSoon = (deadline: string | undefined) => {
    if (!deadline) return false
    const date = new Date(deadline)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays >= 0
  }

  const getDeadlineStatus = (deadline: string | undefined) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { status: 'expired', color: 'error', text: 'Application deadline has passed' }
    if (diffDays === 0) return { status: 'today', color: 'error', text: 'Application deadline is today!' }
    if (diffDays <= 3) return { status: 'urgent', color: 'warning', text: `Only ${diffDays} day${diffDays > 1 ? 's' : ''} left to apply` }
    if (diffDays <= 7) return { status: 'soon', color: 'info', text: `${diffDays} days left to apply` }
    return { status: 'normal', color: 'success', text: `${diffDays} days left to apply` }
  }

  const handleSave = () => {
    if (onSave) {
      onSave(internship.id)
    }
  }

  const handleApply = () => {
    if (onApply) {
      onApply(internship)
    } else if (internship.application_url) {
      window.open(internship.application_url, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: internship.title,
          text: `Check out this internship at ${internship.company_name}`,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const deadlineStatus = getDeadlineStatus(internship.application_deadline)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', flexGrow: 1 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                mr: 2,
                backgroundColor: theme.palette.primary.main,
                fontSize: '1.2rem'
              }}
            >
              {getCompanyInitials(internship.company_name)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                {internship.title}
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                {internship.company_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={internship.work_type}
                  color={getWorkTypeColor(internship.work_type) as any}
                  size="small"
                />
                <Chip
                  label={internship.source_website}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Share">
              <IconButton onClick={handleShare}>
                <Share />
              </IconButton>
            </Tooltip>
            <Tooltip title={isSaved ? 'Remove from saved' : 'Save internship'}>
              <IconButton onClick={handleSave}>
                {isSaved ? <Bookmark color="primary" /> : <BookmarkBorder />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Deadline Alert */}
        {deadlineStatus && deadlineStatus.status !== 'normal' && (
          <Card 
            sx={{ 
              mb: 3, 
              backgroundColor: alpha(theme.palette[deadlineStatus.color as keyof typeof theme.palette].main, 0.1),
              border: `1px solid ${theme.palette[deadlineStatus.color as keyof typeof theme.palette].main}`
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {deadlineStatus.status === 'expired' ? <Flag /> : <Warning />}
                <Typography variant="body2" fontWeight="medium">
                  {deadlineStatus.text}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info color="primary" />
              Basic Information
            </Typography>
            <List dense>
              {internship.location && (
                <ListItem>
                  <ListItemIcon>
                    <LocationOn color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Location"
                    secondary={internship.location}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon>
                  <AttachMoney color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Stipend"
                  secondary={formatStipend(internship.stipend)}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Schedule color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Duration"
                  secondary={formatDuration(internship.duration_months)}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Business color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Work Type"
                  secondary={internship.work_type.charAt(0).toUpperCase() + internship.work_type.slice(1)}
                />
              </ListItem>
            </List>
          </Grid>

          {/* Dates */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday color="primary" />
              Important Dates
            </Typography>
            <List dense>
              {internship.posted_date && (
                <ListItem>
                  <ListItemIcon>
                    <AccessTime color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Posted Date"
                    secondary={formatDate(internship.posted_date)}
                  />
                </ListItem>
              )}
              {internship.application_deadline && (
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Application Deadline"
                    secondary={formatDate(internship.application_deadline)}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon>
                  <AccessTime color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Last Updated"
                  secondary={formatDate(internship.updated_at)}
                />
              </ListItem>
            </List>
          </Grid>

          {/* Description */}
          {internship.description && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Job Description
              </Typography>
              <Typography 
                variant="body1" 
                paragraph
                sx={{
                  whiteSpace: 'pre-wrap',
                  ...(showFullDescription ? {} : {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                  })
                }}
              >
                {internship.description}
              </Typography>
              {internship.description.length > 300 && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </Grid>
          )}

          {/* Required Skills */}
          {internship.required_skills.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Required Skills
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {internship.required_skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* Additional Information */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Source: {internship.source_website}
                </Typography>
              </Grid>
              {internship.external_id && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reference ID: {internship.external_id}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<Launch />}
          onClick={handleApply}
          disabled={!internship.application_url || (deadlineStatus?.status === 'expired')}
          size="large"
        >
          {deadlineStatus?.status === 'expired' ? 'Deadline Passed' : 'Apply Now'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}