export const CACHE_KEYS = {
  INTERNSHIP_DETAILS: 'internship:details:',
  INTERNSHIP_SEARCH: 'internship:search:',
  SEARCH_SUGGESTIONS: 'search:suggestions:',
  POPULAR_SEARCHES: 'search:popular',
  FILTER_OPTIONS: 'internship:filters',
  INTERNSHIP_STATS: 'internship:stats',
  RECENT_INTERNSHIPS: 'internship:recent',
  UPCOMING_DEADLINES: 'internship:deadlines',
  USER_RECOMMENDATIONS: 'user:recommendations:',
  RECOMMENDATION_STATS: 'user:rec_stats:'
}

export const CACHE_TTL = {
  INTERNSHIP_DETAILS: 1800, // 30 minutes
  INTERNSHIP_SEARCH: 300,   // 5 minutes
  SEARCH_SUGGESTIONS: 1800, // 30 minutes
  POPULAR_SEARCHES: 3600,   // 1 hour
  FILTER_OPTIONS: 7200,     // 2 hours
  INTERNSHIP_STATS: 1800,   // 30 minutes
  RECENT_INTERNSHIPS: 600,  // 10 minutes
  UPCOMING_DEADLINES: 3600, // 1 hour
  USER_RECOMMENDATIONS: 3600, // 1 hour
  RECOMMENDATION_STATS: 3600  // 1 hour
}