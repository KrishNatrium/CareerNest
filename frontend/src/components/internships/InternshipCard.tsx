import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Avatar,
  useTheme,
  alpha
} from '@mui/material'
import {
  LocationOn,
  AttachMoney,
  Schedule,
  BookmarkBorder,
  Bookmark,
  Launch,
  Business,
  AccessTime,
  TrendingUp
} from '@mui/icons-material'
import { Internship } from '../../types/internship.types'
import { ApplyButton } from '../applications/ApplyButton'
import RealTimeIndicator from '../notifications/RealTimeIndicator'

interface InternshipCardProps {
  internship: Internship
  onSave?: (internshipId: number) => void
  onApply?: (internship: Internship) => void
  onClick?: (internship: Internship) => void
  isSaved?: boolean
  showFullDescription?: boolean
  variant?: 'compact' | 'detailed'
  showRelevanceScore?: boolean
  isNew?: boolean
  isUpdated?: boolean
  lastUpdated?: string
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  onSave,
  onApply,
  onClick,
  isSaved = false,
  showFullDescription = false,
  variant = 'detailed',
  showRelevanceScore = false,
  isNew = false,
  isUpdated = false,
  lastUpdated
}) => {
  const theme = useTheme()

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
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `${diffDays} days left`
    return date.toLocaleDateString()
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
    return diffDays <= 3 && diffDays >= 0
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(internship)
    }
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSave) {
      onSave(internship.id)
    }
  }

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onApply) {
      onApply(internship)
    } else if (internship.application_url) {
      window.open(internship.application_url, '_blank')
    }
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': onClick ? { 
          boxShadow: 6,
          transform: 'translateY(-2px)'
        } : {},
        ...(isDeadlineSoon(internship.application_deadline) && {
          border: `2px solid ${theme.palette.warning.main}`,
          backgroundColor: alpha(theme.palette.warning.main, 0.02)
        })
      }}
      onClick={handleCardClick}
    >
      {/* Real-time Indicators */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
        {isNew && (
          <RealTimeIndicator 
            type="new" 
            timestamp={lastUpdated || internship.created_at}
            variant="chip"
            size="small"
          />
        )}
        {isUpdated && !isNew && (
          <RealTimeIndicator 
            type="updated" 
            timestamp={lastUpdated || internship.updated_at}
            variant="chip"
            size="small"
          />
        )}
        {isDeadlineSoon(internship.application_deadline) && (
          <RealTimeIndicator 
            type="deadline" 
            variant="chip"
            size="small"
          />
        )}
      </Box>

      {/* Relevance Score Badge */}
      {showRelevanceScore && internship.relevance_score && (
        <Box
          sx={{
            position: 'absolute',
            top: isNew || isUpdated || isDeadlineSoon(internship.application_deadline) ? 40 : 8,
            right: 8,
            zIndex: 1,
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            borderRadius: '12px',
            px: 1,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <TrendingUp sx={{ fontSize: 14 }} />
          <Typography variant="caption" fontWeight="bold">
            {Math.round(internship.relevance_score * 100)}%
          </Typography>
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, p: variant === 'compact' ? 2 : 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              width: variant === 'compact' ? 32 : 40,
              height: variant === 'compact' ? 32 : 40,
              mr: 1.5,
              backgroundColor: theme.palette.primary.main,
              fontSize: variant === 'compact' ? '0.8rem' : '1rem'
            }}
          >
            {getCompanyInitials(internship.company_name)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant={variant === 'compact' ? 'subtitle1' : 'h6'} 
              component="h3" 
              gutterBottom
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {internship.title}
            </Typography>
            <Typography 
              variant={variant === 'compact' ? 'body2' : 'subtitle1'} 
              color="primary" 
              gutterBottom
            >
              {internship.company_name}
            </Typography>
          </Box>
          <Tooltip title={isSaved ? 'Remove from saved' : 'Save internship'}>
            <IconButton
              size="small"
              onClick={handleSaveClick}
              sx={{ ml: 1 }}
            >
              {isSaved ? <Bookmark color="primary" /> : <BookmarkBorder />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
          {internship.location && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {internship.location}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachMoney sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatStipend(internship.stipend)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatDuration(internship.duration_months)}
            </Typography>
          </Box>

          {internship.posted_date && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Posted {new Date(internship.posted_date).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Description */}
        {showFullDescription && internship.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            paragraph
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {internship.description}
          </Typography>
        )}

        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={internship.work_type}
            size="small"
            color={getWorkTypeColor(internship.work_type) as any}
          />
          <Chip
            label={internship.source_website}
            size="small"
            variant="outlined"
          />
          {internship.application_deadline && (
            <Chip
              label={formatDate(internship.application_deadline)}
              size="small"
              color={isDeadlineSoon(internship.application_deadline) ? 'warning' : 'default'}
              variant="outlined"
              icon={<Schedule sx={{ fontSize: 14 }} />}
            />
          )}
        </Box>

        {/* Skills */}
        {internship.required_skills.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Required Skills:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {internship.required_skills.slice(0, variant === 'compact' ? 2 : 4).map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {internship.required_skills.length > (variant === 'compact' ? 2 : 4) && (
                <Chip
                  label={`+${internship.required_skills.length - (variant === 'compact' ? 2 : 4)} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCardClick}
            sx={{ flexGrow: 1 }}
          >
            View Details
          </Button>
          <ApplyButton 
            internship={internship} 
            variant="contained" 
            size="small"
          />
        </Box>
      </CardContent>
    </Card>
  )
}