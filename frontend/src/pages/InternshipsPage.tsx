import React, { useState, useMemo } from 'react'
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  IconButton,
  Fade,
  Skeleton
} from '@mui/material'
import {
  ViewModule,
  ViewList,
  TuneOutlined
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { SearchBar } from '../components/search/SearchBar'
import { FilterPanel } from '../components/search/FilterPanel'
import { InternshipCard, InternshipDetailView } from '../components/internships'
import { InternshipService } from '../services/internshipService'
import { 
  Internship, 
  InternshipSearchFilters, 
  InternshipSearchResult 
} from '../types/internship.types'
import { debounce } from 'lodash'

export const InternshipsPage: React.FC = () => {
  const [filters, setFilters] = useState<InternshipSearchFilters>({
    page: 1,
    limit: 20,
    sort_by: 'posted_date',
    sort_order: 'desc'
  })
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchFilters: InternshipSearchFilters) => {
      setFilters(prev => ({ ...prev, ...searchFilters, page: 1 }))
    }, 500),
    []
  )

  const { data, isLoading, error, refetch } = useQuery<InternshipSearchResult>({
    queryKey: ['internships', filters],
    queryFn: () => InternshipService.searchInternships(filters),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const handleSearchChange = (keywords: string) => {
    debouncedSearch({ ...filters, keywords })
  }

  const handleSearch = () => {
    refetch()
  }

  const handleFilterChange = (newFilters: InternshipSearchFilters) => {
    setFilters(newFilters)
  }

  const handleFilterApply = () => {
    refetch()
  }

  const handleFilterClear = () => {
    const clearedFilters: InternshipSearchFilters = {
      page: 1,
      limit: filters.limit,
      sort_by: 'posted_date',
      sort_order: 'desc'
    }
    setFilters(clearedFilters)
  }

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleSortChange = (sort_by: string, sort_order: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort_by: sort_by as any, sort_order, page: 1 }))
  }

  const handleSaveInternship = async (_: number) => {
    try {
      // This would be implemented when we add the bookmark/save functionality
      toast.success('Internship saved successfully!')
    } catch (error) {
      toast.error('Failed to save internship')
    }
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">
            Failed to load internships. Please try again later.
          </Alert>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Find Your Perfect Internship
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover opportunities from top companies with advanced search and filtering
          </Typography>
        </Box>

        {/* Search Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <SearchBar
                  value={filters.keywords || ''}
                  onChange={handleSearchChange}
                  onSearch={handleSearch}
                  placeholder="Search by title, company, skills, or keywords..."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant={showFilters ? 'contained' : 'outlined'}
                    startIcon={<TuneOutlined />}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    Filters
                  </Button>
                  <IconButton
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    color="primary"
                  >
                    {viewMode === 'grid' ? <ViewList /> : <ViewModule />}
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Filters Panel */}
          {showFilters && (
            <Grid item xs={12} lg={3}>
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onApply={handleFilterApply}
                onClear={handleFilterClear}
              />
            </Grid>
          )}

          {/* Results */}
          <Grid item xs={12} lg={showFilters ? 9 : 12}>
            {/* Results Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {data && (
                  <Typography variant="body1" color="text.secondary">
                    {data.pagination.total.toLocaleString()} internships found
                    {filters.keywords && ` for "${filters.keywords}"`}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={`${filters.sort_by}_${filters.sort_order}`}
                    label="Sort by"
                    onChange={(e) => {
                      const [sort_by, sort_order] = e.target.value.split('_')
                      handleSortChange(sort_by, sort_order as 'asc' | 'desc')
                    }}
                  >
                    <MenuItem value="posted_date_desc">Latest First</MenuItem>
                    <MenuItem value="posted_date_asc">Oldest First</MenuItem>
                    <MenuItem value="relevance_desc">Most Relevant</MenuItem>
                    <MenuItem value="stipend_desc">Highest Stipend</MenuItem>
                    <MenuItem value="stipend_asc">Lowest Stipend</MenuItem>
                    <MenuItem value="deadline_asc">Deadline Soon</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Loading State */}
            {isLoading && (
              <Grid container spacing={3}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} lg={viewMode === 'grid' ? 4 : 12} key={index}>
                    <Card>
                      <CardContent>
                        <Skeleton variant="text" width="80%" height={32} />
                        <Skeleton variant="text" width="60%" height={24} />
                        <Skeleton variant="text" width="40%" height={20} />
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Skeleton variant="rectangular" width={60} height={24} />
                          <Skeleton variant="rectangular" width={80} height={24} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Internships Grid/List */}
            {data && (
              <Fade in={!isLoading}>
                <Grid container spacing={3}>
                  {data.internships.map((internship) => (
                    <Grid 
                      item 
                      xs={12} 
                      md={viewMode === 'grid' ? 6 : 12} 
                      lg={viewMode === 'grid' ? 4 : 12} 
                      key={internship.id}
                    >
                      <InternshipCard
                        internship={internship}
                        onClick={setSelectedInternship}
                        onSave={handleSaveInternship}
                        onApply={(internship) => {
                          if (internship.application_url) {
                            window.open(internship.application_url, '_blank')
                          }
                        }}
                        variant={viewMode === 'list' ? 'compact' : 'detailed'}
                        showRelevanceScore={filters.sort_by === 'relevance'}
                        showFullDescription={viewMode === 'list'}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Fade>
            )}

            {/* No Results */}
            {data && data.internships.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" gutterBottom>
                  No internships found
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Try adjusting your search criteria or filters
                </Typography>
                <Button variant="outlined" onClick={handleFilterClear} sx={{ mt: 2 }}>
                  Clear All Filters
                </Button>
              </Box>
            )}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={data.pagination.totalPages}
                  page={data.pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Internship Detail Dialog */}
        <InternshipDetailView
          internship={selectedInternship}
          open={!!selectedInternship}
          onClose={() => setSelectedInternship(null)}
          onSave={handleSaveInternship}
          onApply={(internship) => {
            if (internship.application_url) {
              window.open(internship.application_url, '_blank')
            }
          }}
        />
      </Box>
    </Container>
  )
}