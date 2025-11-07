import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Slider,
  Button,
  Collapse,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Badge
} from '@mui/material'
import {
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear,
  LocationOn,
  Business,
  Work,
  AttachMoney,
  Schedule,
  Code,
  CalendarToday
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { InternshipService } from '../../services/internshipService'
import { InternshipSearchFilters, FilterOptions, WorkType } from '../../types/internship.types'
// import { DatePicker } from '@mui/x-date-pickers/DatePicker'
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

interface FilterPanelProps {
  filters: InternshipSearchFilters
  onChange: (filters: InternshipSearchFilters) => void
  onApply: () => void
  onClear: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onApply,
  onClear,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [localFilters, setLocalFilters] = useState<InternshipSearchFilters>(filters)
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    compensation: true,
    workDetails: true,
    skills: false,
    dates: false
  })

  // Get filter options
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['filter-options'],
    queryFn: InternshipService.getFilterOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof InternshipSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onChange(newFilters)
  }

  const handleSectionToggle = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleClearAll = () => {
    const clearedFilters: InternshipSearchFilters = {
      page: 1,
      limit: filters.limit || 20,
      sort_by: filters.sort_by || 'posted_date',
      sort_order: filters.sort_order || 'desc'
    }
    setLocalFilters(clearedFilters)
    onChange(clearedFilters)
    onClear()
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.location) count++
    if (localFilters.company) count++
    if (localFilters.work_type) count++
    if (localFilters.min_stipend || localFilters.max_stipend) count++
    if (localFilters.min_duration || localFilters.max_duration) count++
    if (localFilters.skills && localFilters.skills.length > 0) count++
    if (localFilters.posted_after) count++
    if (localFilters.deadline_before) count++
    if (localFilters.source_website) count++
    return count
  }

  const stipendRange = [
    localFilters.min_stipend || 0,
    localFilters.max_stipend || 100000
  ]

  const durationRange = [
    localFilters.min_duration || 1,
    localFilters.max_duration || 12
  ]

  const handleStipendChange = (event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[]
    handleFilterChange('min_stipend', min > 0 ? min : undefined)
    handleFilterChange('max_stipend', max < 100000 ? max : undefined)
  }

  const handleDurationChange = (event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[]
    handleFilterChange('min_duration', min > 1 ? min : undefined)
    handleFilterChange('max_duration', max < 12 ? max : undefined)
  }

  const SectionHeader: React.FC<{
    title: string
    icon: React.ReactNode
    section: keyof typeof expandedSections
  }> = ({ title, icon, section }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        py: 1,
        '&:hover': { backgroundColor: 'action.hover' }
      }}
      onClick={() => handleSectionToggle(section)}
    >
      {icon}
      <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
        {title}
      </Typography>
      <IconButton size="small">
        {expandedSections[section] ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  )

  if (isCollapsed) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={
            <Badge badgeContent={getActiveFilterCount()} color="primary">
              <FilterList />
            </Badge>
          }
          onClick={onToggleCollapse}
        >
          Filters
        </Button>
        {getActiveFilterCount() > 0 && (
          <Button
            variant="text"
            size="small"
            startIcon={<Clear />}
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </Box>
    )
  }

  return (
    // <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList />
              Filters
              {getActiveFilterCount() > 0 && (
                <Chip
                  label={getActiveFilterCount()}
                  size="small"
                  color="primary"
                />
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<Clear />}
                onClick={handleClearAll}
                disabled={getActiveFilterCount() === 0}
              >
                Clear All
              </Button>
              {onToggleCollapse && (
                <IconButton onClick={onToggleCollapse}>
                  <ExpandLess />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Location & Company */}
          <SectionHeader
            title="Location & Company"
            icon={<LocationOn color="primary" />}
            section="location"
          />
          <Collapse in={expandedSections.location}>
            <Box sx={{ pl: 4, pb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={filterOptions?.locations || []}
                    value={localFilters.location || ''}
                    onChange={(_, value) => handleFilterChange('location', value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Location"
                        placeholder="Enter location"
                        size="small"
                      />
                    )}
                    freeSolo
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={filterOptions?.companies || []}
                    value={localFilters.company || ''}
                    onChange={(_, value) => handleFilterChange('company', value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Company"
                        placeholder="Enter company name"
                        size="small"
                      />
                    )}
                    freeSolo
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          <Divider />

          {/* Compensation */}
          <SectionHeader
            title="Compensation"
            icon={<AttachMoney color="primary" />}
            section="compensation"
          />
          <Collapse in={expandedSections.compensation}>
            <Box sx={{ pl: 4, pb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Monthly Stipend (₹)
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={stipendRange}
                  onChange={handleStipendChange}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100000}
                  step={1000}
                  marks={[
                    { value: 0, label: '₹0' },
                    { value: 25000, label: '₹25K' },
                    { value: 50000, label: '₹50K' },
                    { value: 75000, label: '₹75K' },
                    { value: 100000, label: '₹100K+' }
                  ]}
                  valueLabelFormat={(value) => `₹${value.toLocaleString()}`}
                />
              </Box>
            </Box>
          </Collapse>

          <Divider />

          {/* Work Details */}
          <SectionHeader
            title="Work Details"
            icon={<Work color="primary" />}
            section="workDetails"
          />
          <Collapse in={expandedSections.workDetails}>
            <Box sx={{ pl: 4, pb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Work Type</InputLabel>
                    <Select
                      value={localFilters.work_type || ''}
                      label="Work Type"
                      onChange={(e) => handleFilterChange('work_type', e.target.value as WorkType)}
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="remote">Remote</MenuItem>
                      <MenuItem value="office">Office</MenuItem>
                      <MenuItem value="hybrid">Hybrid</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Source</InputLabel>
                    <Select
                      value={localFilters.source_website || ''}
                      label="Source"
                      onChange={(e) => handleFilterChange('source_website', e.target.value)}
                    >
                      <MenuItem value="">All Sources</MenuItem>
                      {filterOptions?.sources.map((source) => (
                        <MenuItem key={source} value={source}>
                          {source.charAt(0).toUpperCase() + source.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Duration (months)
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={durationRange}
                    onChange={handleDurationChange}
                    valueLabelDisplay="auto"
                    min={1}
                    max={12}
                    step={1}
                    marks={[
                      { value: 1, label: '1m' },
                      { value: 3, label: '3m' },
                      { value: 6, label: '6m' },
                      { value: 12, label: '12m+' }
                    ]}
                    valueLabelFormat={(value) => `${value} month${value > 1 ? 's' : ''}`}
                  />
                </Box>
              </Box>
            </Box>
          </Collapse>

          <Divider />

          {/* Skills */}
          <SectionHeader
            title="Skills"
            icon={<Code color="primary" />}
            section="skills"
          />
          <Collapse in={expandedSections.skills}>
            <Box sx={{ pl: 4, pb: 2 }}>
              <Autocomplete
                multiple
                options={filterOptions?.skills || []}
                value={localFilters.skills || []}
                onChange={(_, value) => handleFilterChange('skills', value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Required Skills"
                    placeholder="Select skills"
                    size="small"
                  />
                )}
                freeSolo
              />
            </Box>
          </Collapse>

          <Divider />

          {/* Dates */}
          <SectionHeader
            title="Dates"
            icon={<CalendarToday color="primary" />}
            section="dates"
          />
          <Collapse in={expandedSections.dates}>
            <Box sx={{ pl: 4, pb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Posted After"
                    type="date"
                    size="small"
                    fullWidth
                    value={localFilters.posted_after || ''}
                    onChange={(e) => handleFilterChange('posted_after', e.target.value || undefined)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Deadline Before"
                    type="date"
                    size="small"
                    fullWidth
                    value={localFilters.deadline_before || ''}
                    onChange={(e) => handleFilterChange('deadline_before', e.target.value || undefined)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Apply Button */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={onApply}
              fullWidth
            >
              Apply Filters
            </Button>
          </Box>
        </CardContent>
      </Card>
    // </LocalizationProvider>
  )
}