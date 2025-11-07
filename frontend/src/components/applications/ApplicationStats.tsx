import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { ApplicationStats as ApplicationStatsType, ApplicationInsights } from '../../types/internship.types'
import { getStatusLabel, getStatusColor } from '../../utils/formatters'

interface ApplicationStatsProps {
  stats: ApplicationStatsType
  insights?: ApplicationInsights
}

export const ApplicationStats: React.FC<ApplicationStatsProps> = ({ stats, insights }) => {
  const successfulStatuses = ['interview_scheduled', 'interviewed', 'offered', 'accepted']
  const successfulCount = successfulStatuses.reduce(
    (sum, status) => sum + (stats.by_status[status as keyof typeof stats.by_status] || 0),
    0
  )
  
  const responseRate = stats.total_applications > 0 
    ? ((stats.total_applications - stats.by_status.applied) / stats.total_applications) * 100 
    : 0

  const successRate = stats.total_applications > 0 
    ? (successfulCount / stats.total_applications) * 100 
    : 0

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Application Statistics
        </Typography>

        {/* Overview Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {stats.total_applications}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Applications
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {stats.recent_applications}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This Month
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {stats.upcoming_deadlines}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming Deadlines
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {Math.round(successRate)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Response Rate */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Response Rate
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {Math.round(responseRate)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={responseRate} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Status Breakdown */}
        <Typography variant="subtitle2" gutterBottom>
          Applications by Status
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          {Object.entries(stats.by_status).map(([status, count]) => {
            if (count === 0) return null
            return (
              <Chip
                key={status}
                label={`${getStatusLabel(status as any)} (${count})`}
                color={getStatusColor(status as any)}
                size="small"
                variant="outlined"
              />
            )
          })}
        </Box>

        {/* Insights */}
        {insights && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Insights & Recommendations
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUpIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  Response Rate: {insights.response_rate}%
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography variant="body2">
                  Most Successful Stage: {getStatusLabel(insights.most_successful_status as any)}
                </Typography>
              </Box>
            </Box>

            {insights.recommendations.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Recommendations:
                </Typography>
                {insights.recommendations.map((recommendation, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
                    • {recommendation}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}