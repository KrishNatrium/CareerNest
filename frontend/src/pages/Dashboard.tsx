import React from 'react'
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip
} from '@mui/material'
import { Person, ExitToApp } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4
          }}
        >
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ExitToApp />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* User Profile Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mb: 2,
                      bgcolor: 'primary.main'
                    }}
                  >
                    <Person sx={{ fontSize: 40 }} />
                  </Avatar>
                  
                  <Typography variant="h6" gutterBottom>
                    {user.first_name} {user.last_name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {user.email}
                  </Typography>
                  
                  {user.location && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📍 {user.location}
                    </Typography>
                  )}
                  
                  {user.phone && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📞 {user.phone}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={user.email_verified ? 'Email Verified' : 'Email Not Verified'}
                      color={user.email_verified ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Skills Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Skills
                </Typography>
                {user.skills && user.skills.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.skills.map((skill) => (
                      <Chip
                        key={skill.id}
                        label={`${skill.skill_name} (${skill.proficiency_level})`}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No skills added yet. Add your skills to get better internship recommendations.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Preferences Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preferences
                </Typography>
                {user.preferences ? (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Work Type:</strong> {user.preferences.work_type}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Min Stipend:</strong> ₹{user.preferences.min_stipend}
                    </Typography>
                    {user.preferences.max_duration_months && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Max Duration:</strong> {user.preferences.max_duration_months} months
                      </Typography>
                    )}
                    {user.preferences.preferred_locations.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Preferred Locations:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.preferences.preferred_locations.map((location, index) => (
                            <Chip
                              key={index}
                              label={location}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No preferences set yet. Set your preferences to get personalized internship recommendations.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Welcome Message */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Welcome to Internship Aggregator!
                </Typography>
                <Typography variant="body1" paragraph>
                  Your account has been successfully created. Here's what you can do next:
                </Typography>
                <ul>
                  <li>Add your skills to get better internship recommendations</li>
                  <li>Set your preferences for location, stipend, and work type</li>
                  <li>Browse and search for internship opportunities</li>
                  <li>Track your applications and their status</li>
                  <li>Get real-time notifications for new matching internships</li>
                </ul>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  More features will be available soon as we continue building the platform.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}