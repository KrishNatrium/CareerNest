import React, { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  InputAdornment,
  CircularProgress,
  Paper,
  Popper,
  PopperProps
} from '@mui/material'
import { Search, TrendingUp } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { InternshipService } from '../../services/internshipService'
import { SearchSuggestion, PopularSearch } from '../../types/internship.types'
import { debounce } from 'lodash'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  showPopularSearches?: boolean
}

const CustomPopper = (props: PopperProps) => (
  <Popper {...props} style={{ width: '100%' }} placement="bottom-start" />
)

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search internships, companies, locations...",
  showPopularSearches = true
}) => {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get popular searches
  const { data: popularSearches } = useQuery<PopularSearch[]>({
    queryKey: ['popular-searches'],
    queryFn: () => InternshipService.getPopularSearches(5),
    enabled: showPopularSearches,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Debounced function to fetch suggestions
  const debouncedGetSuggestions = debounce(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setIsLoadingSuggestions(false)
      return
    }

    try {
      const results = await InternshipService.getSearchSuggestions(query)
      setSuggestions(results)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, 300)

  useEffect(() => {
    if (inputValue !== value) {
      setInputValue(value)
    }
  }, [value])

  useEffect(() => {
    if (inputValue.length >= 2) {
      setIsLoadingSuggestions(true)
      debouncedGetSuggestions(inputValue)
    } else {
      setSuggestions([])
      setIsLoadingSuggestions(false)
    }

    return () => {
      debouncedGetSuggestions.cancel()
    }
  }, [inputValue])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    onChange(newValue)
    setShowSuggestions(true)
  }

  const handleSuggestionSelect = (suggestion: SearchSuggestion | PopularSearch) => {
    const searchText = 'query' in suggestion ? suggestion.query : suggestion.text
    setInputValue(searchText)
    onChange(searchText)
    setShowSuggestions(false)
    onSearch()
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      setShowSuggestions(false)
      onSearch()
    }
  }

  const handleFocus = () => {
    setShowSuggestions(true)
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'location':
        return '📍'
      case 'company':
        return '🏢'
      case 'skill':
        return '💡'
      case 'keyword':
        return '🔍'
      default:
        return '🔍'
    }
  }

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'location':
        return 'Location'
      case 'company':
        return 'Company'
      case 'skill':
        return 'Skill'
      case 'keyword':
        return 'Keyword'
      default:
        return 'Search'
    }
  }

  const shouldShowDropdown = showSuggestions && (
    suggestions.length > 0 || 
    isLoadingSuggestions || 
    (inputValue.length < 2 && popularSearches && popularSearches.length > 0)
  )

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        ref={inputRef}
        fullWidth
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: isLoadingSuggestions ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          }
        }}
      />

      {shouldShowDropdown && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 400,
            overflow: 'auto',
            mt: 0.5,
            boxShadow: 3,
          }}
        >
          {/* Loading state */}
          {isLoadingSuggestions && (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Searching...
              </Typography>
            </Box>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Box>
              {suggestions.map((suggestion, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <Typography sx={{ fontSize: '1.2em' }}>
                    {getSuggestionIcon(suggestion.type)}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                      {suggestion.text}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={getSuggestionTypeLabel(suggestion.type)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7em' }}
                      />
                      {suggestion.count && (
                        <Typography variant="caption" color="text.secondary">
                          {suggestion.count} results
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Popular searches when no input */}
          {inputValue.length < 2 && popularSearches && popularSearches.length > 0 && (
            <Box>
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUp sx={{ fontSize: 16 }} />
                  Popular Searches
                </Typography>
              </Box>
              {popularSearches.map((search, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => handleSuggestionSelect(search)}
                >
                  <Typography sx={{ fontSize: '1.2em' }}>🔥</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                      {search.query}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {search.count} searches
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* No results */}
          {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length >= 2 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No suggestions found
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}