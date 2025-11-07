import React, { useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Skeleton
} from '@mui/material'
import {
  BookmarkBorder,
  Delete,
  Launch,
  FilterList,
  Sort,
  Clear
} from '@mui/icons-material'
import { InternshipCard } from './InternshipCard'
import { InternshipDetailView } from './InternshipDetailView'
import { Internship } from '../../types/internship.types'

interface SavedInternship {
  id: number
  internship: Internship
  saved_at: string
  notes?: string
  tags?: string[]
}

interface SavedInternshipsProps {
  savedInternships?: SavedInternship[]
  isLoading?: boolean
  onRemove?: (internshipId: number) => void
  onApply?: (internship: Internship) => void
}

export const SavedInternships: React.FC<SavedInternshipsProps> = ({
  savedInternships = [],
  isLoading = false,
  onRemove,
  onApply
}) => {
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null)
  const [sortBy, setSortBy] = useState<'saved_at' | 'deadline' | 'stipend'>('saved_at')
  const [filterBy, setFilterBy] = useState<'all' | 'deadline_soon' | 'high_stipend'>('all')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleRemove = (internshipId: number) => {
    setConfirmDelete(internshipId)
  }

  const confirmRemove = () => {
    if (confirmDelete && onRemove) {
      onRemove(confirmDelete)
      setConfirmDelete(null)
    }
  }

  const getSortedAndFilteredInternships = () => {
    let filtered = [...savedInternships]

    // Apply filters
    switch (filterBy) {
      case 'deadline_soon':
        filtered = filtered.filter(item => {
          if (!item.internship.application_deadline) return false
          const deadline = new Date(item.internship.application_deadline)
          const now = new Date()
          const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays <= 7 && diffDays >= 0
        })
        break
      case 'high_stipend':
        filtered = filtered.filter(item => (item.internship.stipend || 0) >= 20000)
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'saved_at':
          return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
        case 'deadline':
          const aDeadline = a.internship.application_deadline ? new Date(a.internship.application_deadline).getTime() : Infinity
          const bDeadline = b.internship.application_deadline ? new Date(b.internship.application_deadline).getTime() : Infinity
          return aDeadline - bDeadline
        case 'stipend':
          return (b.internship.stipend || 0) - (a.internship.stipend || 0)
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredInternships = getSortedAndFilteredInternships()

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Saved Internships
        </Typography>
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
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
      </Box>
    )
  }

  if (savedInternships.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <BookmarkBorder sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          No Saved Internships
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Start saving internships you're interested in to keep track of them here.
        </Typography>
        <Button variant="outlined" href="/internships">
          Browse Internships
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Saved Internships ({savedInternships.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Sort />}
            onClick={() => {
              const options = ['saved_at', 'deadline', 'stipend'] as const
              const currentIndex = options.indexOf(sortBy)
              const nextIndex = (currentIndex + 1) % options.length
              setSortBy(options[nextIndex])
            }}
          >
            Sort: {sortBy === 'saved_at' ? 'Recently Saved' : sortBy === 'deadline' ? 'Deadline' : 'Stipend'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterList />}
            onClick={() => {
              const options = ['all', 'deadline_soon', 'high_stipend'] as const
              const currentIndex = options.indexOf(filterBy)
              const nextIndex = (currentIndex + 1) % options.length
              setFilterBy(options[nextIndex])
            }}
          >
            Filter: {filterBy === 'all' ? 'All' : filterBy === 'deadline_soon' ? 'Deadline Soon' : 'High Stipend'}
          </Button>
          {filterBy !== 'all' && (
            <Button
              variant="text"
              size="small"
              startIcon={<Clear />}
              onClick={() => setFilterBy('all')}
            >
              Clear Filter
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Alert */}
      {filterBy === 'deadline_soon' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Showing internships with application deadlines within 7 days
        </Alert>
      )}
      {filterBy === 'high_stipend' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Showing internships with stipend ≥ ₹20,000/month
        </Alert>
      )}

      {/* Results */}
      {filteredInternships.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            No internships match your current filter
          </Typography>
          <Button variant="outlined" onClick={() => setFilterBy('all')}>
            Clear Filter
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredInternships.map((savedItem) => (
            <Grid item xs={12} md={6} lg={4} key={savedItem.id}>
              <Box sx={{ position: 'relative' }}>
                <InternshipCard
                  internship={savedItem.internship}
                  onClick={setSelectedInternship}
                  onApply={onApply}
                  isSaved={true}
                  variant="detailed"
                />
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText'
                    }
                  }}
                  size="small"
                  onClick={() => handleRemove(savedItem.internship.id)}
                >
                  <Delete />
                </IconButton>
                {savedItem.tags && savedItem.tags.length > 0 && (
                  <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
                    {savedItem.tags.slice(0, 2).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        color="secondary"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail View */}
      <InternshipDetailView
        internship={selectedInternship}
        open={!!selectedInternship}
        onClose={() => setSelectedInternship(null)}
        onApply={onApply}
        isSaved={true}
        onSave={(id) => handleRemove(id)}
      />

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Saved Internship</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this internship from your saved list?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={confirmRemove} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}