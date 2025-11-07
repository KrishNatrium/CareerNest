import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  IconButton,
  CircularProgress
} from '@mui/material'
import {
  TrendingUp,
  FilterList,
  Star,
  BarChart,
  Refresh,
  Settings,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material'
import recommendationService, { 
  RecommendationResult, 
  RecommendationStats,
  RecommendationFilters 
} from '../services/recommendationService'
import { RecommendationDashboard } from '../components/recommendations/RecommendationDashboard'
import { toast } from 'react-toastify'

export const RecommendationsPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [stats, setStats] = useState<RecommendationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState<RecommendationFilters>({
    limit: 20,
    min_score: 0.1,
    exclude_applied: true
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadRecommendations()
    loadStats()
  }, [])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await recommendationService.getRecommendations(filters)
      setRecommendations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await recommendationService.getRecommendationStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  const applyFilters = () => {
    loadRecommendations()
    setShowFilters(false)
  }

  const resetFilters = () => {
    setFilters({
      limit: 20,
      min_score: 0.1,
      exclude_applied: true
    })
  }



  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Personalized Recommendations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover internships tailored to your skills and preferences
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Recommendations
                    </Typography>
                    <Typography variant="h4">
                      {stats.total_recommendations}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      High Matches
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.high_score_count}
                    </Typography>
                  </Box>
                  <Star sx={{ fontSize: 32, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average Score
                    </Typography>
                    <Typography variant="h4">
                      {Math.round(stats.average_score * 100)}%
                    </Typography>
                  </Box>
                  <BarChart sx={{ fontSize: 32, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Top Companies
                    </Typography>
                    <Typography variant="h6">
                      {stats.top_companies[0]?.company || 'N/A'}
                    </Typography>
                  </Box>
                  <Settings sx={{ fontSize: 32, color: 'secondary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterList sx={{ mr: 1 }} />
              <Typography variant="h6">Filters</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={loadRecommendations}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              >
                Refresh
              </Button>
            </Box>
          </Box>
          
          <Collapse in={showFilters}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Limit"
                  type="number"
                  value={filters.limit || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    limit: parseInt(e.target.value) || 20 
                  }))}
                  placeholder="20"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Minimum Score</InputLabel>
                  <Select
                    value={filters.min_score?.toString() || '0.1'}
                    label="Minimum Score"
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      min_score: parseFloat(e.target.value) 
                    }))}
                  >
                    <MenuItem value="0">All (0%)</MenuItem>
                    <MenuItem value="0.1">Low (10%+)</MenuItem>
                    <MenuItem value="0.3">Medium (30%+)</MenuItem>
                    <MenuItem value="0.5">Good (50%+)</MenuItem>
                    <MenuItem value="0.7">High (70%+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Applied Filter</InputLabel>
                  <Select
                    value={filters.exclude_applied ? 'exclude' : 'include'}
                    label="Applied Filter"
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      exclude_applied: e.target.value === 'exclude' 
                    }))}
                  >
                    <MenuItem value="exclude">Exclude Applied</MenuItem>
                    <MenuItem value="include">Include Applied</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'flex-end' }}>
                  <Button onClick={applyFilters} variant="contained" sx={{ flex: 1 }}>
                    Apply Filters
                  </Button>
                  <Button onClick={resetFilters} variant="outlined">
                    Reset
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <RecommendationDashboard />

      {/* Top Companies and Locations */}
      {stats && (
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Companies in Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {stats.top_companies.map((company, index) => (
                    <Box key={company.company} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{company.company}</Typography>
                      <Chip label={company.count} size="small" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Locations in Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {stats.top_locations.map((location, index) => (
                    <Box key={location.location} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{location.location}</Typography>
                      <Chip label={location.count} size="small" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  )
}