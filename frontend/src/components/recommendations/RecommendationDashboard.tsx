import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Divider
} from '@mui/material'
import {
  TrendingUp,
  LocationOn,
  Business,
  Star,
  ThumbUp,
  ThumbDown,
  Launch,
  Refresh
} from '@mui/icons-material'
import recommendationService, { RecommendationResult } from '../../services/recommendationService'
import { toast } from 'react-toastify'

interface RecommendationDashboardProps {
  className?: string
}

export const RecommendationDashboard: React.FC<RecommendationDashboardProps> = ({ className }) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await recommendationService.getRecommendations({
        limit: 10,
        min_score: 0.2,
        exclude_applied: true
      })
      setRecommendations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (internshipId: number, feedback: 'helpful' | 'not_helpful' | 'applied') => {
    try {
      setFeedbackLoading(prev => new Set(prev).add(internshipId))
      await recommendationService.recordFeedback(internshipId, feedback)
      
      toast.success(
        feedback === 'applied' 
          ? 'Application tracked!' 
          : 'Thanks for your feedback!'
      )
      
      // Remove the recommendation from the list if they applied
      if (feedback === 'applied') {
        setRecommendations(prev => prev.filter(rec => rec.internship.id !== internshipId))
      }
    } catch (err) {
      toast.error('Failed to record feedback')
    } finally {
      setFeedbackLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(internshipId)
        return newSet
      })
    }
  }



  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return 'High Match'
    if (score >= 0.4) return 'Good Match'
    return 'Potential Match'
  }

  if (loading) {
    return (
      <Card sx={{ ...className }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
          <Typography sx={{ ml: 2 }}>Loading recommendations...</Typography>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ ...className }}>
        <CardContent sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={loadRecommendations} variant="outlined">
              Try Again
            </Button>
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card sx={{ ...className }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingUp sx={{ mr: 1 }} />
            <Typography variant="h6">Personalized Recommendations</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No recommendations available at the moment.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Complete your profile with skills and preferences to get better recommendations.
            </Typography>
            <Button onClick={loadRecommendations} variant="outlined">
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ ...className }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ mr: 1 }} />
            <Typography variant="h6">Personalized Recommendations</Typography>
          </Box>
          <Button 
            onClick={loadRecommendations} 
            variant="outlined" 
            size="small"
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {recommendations.map((recommendation) => (
            <Card key={recommendation.internship.id} variant="outlined" sx={{ p: 2 }}>
              {/* Score and Match Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Chip
                  icon={<Star />}
                  label={`${getScoreLabel(recommendation.score)} (${Math.round(recommendation.score * 100)}%)`}
                  color={recommendation.score >= 0.7 ? 'success' : recommendation.score >= 0.4 ? 'warning' : 'default'}
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Helpful">
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback(recommendation.internship.id, 'helpful')}
                      disabled={feedbackLoading.has(recommendation.internship.id)}
                    >
                      <ThumbUp fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Not helpful">
                    <IconButton
                      size="small"
                      onClick={() => handleFeedback(recommendation.internship.id, 'not_helpful')}
                      disabled={feedbackLoading.has(recommendation.internship.id)}
                    >
                      <ThumbDown fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Internship Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {recommendation.internship.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Business sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2">
                      {recommendation.internship.company_name}
                    </Typography>
                  </Box>
                  {recommendation.internship.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2">
                        {recommendation.internship.location}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Why Recommended */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Why recommended:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {recommendation.explanation.map((reason, index) => (
                    <Typography 
                      key={index} 
                      variant="body2" 
                      color="text.secondary"
                      component="li"
                      sx={{ mb: 0.5 }}
                    >
                      {reason}
                    </Typography>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => handleFeedback(recommendation.internship.id, 'applied')}
                  disabled={feedbackLoading.has(recommendation.internship.id)}
                  sx={{ flex: 1 }}
                  startIcon={feedbackLoading.has(recommendation.internship.id) ? <CircularProgress size={16} /> : null}
                >
                  Mark as Applied
                </Button>
                {recommendation.internship.application_url && (
                  <Button
                    variant="outlined"
                    onClick={() => window.open(recommendation.internship.application_url, '_blank')}
                    startIcon={<Launch />}
                  >
                    Apply Now
                  </Button>
                )}
              </Box>
            </Card>
          ))}
        </Box>

        {recommendations.length >= 10 && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                // Navigate to full recommendations page
                window.location.href = '/recommendations'
              }}
            >
              View All Recommendations
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}