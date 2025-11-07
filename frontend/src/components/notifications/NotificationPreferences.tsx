import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  Button,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import {
  Notifications,
  VolumeUp,
  Computer,
  Work,
  Schedule,
  Update,
  NewReleases
} from '@mui/icons-material'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { NotificationPreferences } from '../../services/websocketService'

const NotificationPreferencesComponent: React.FC = () => {
  const { 
    updateNotificationPreferences, 
    requestNotificationPermission,
    isConnected 
  } = useWebSocket()

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabledTypes: ['new_match', 'deadline_reminder', 'new_internship'],
    enableSound: true,
    enableDesktop: true
  })

  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>('default')
  const [hasChanges, setHasChanges] = useState(false)

  // Check desktop notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setDesktopPermission(Notification.permission)
    }
  }, [])

  const notificationTypes = [
    {
      id: 'new_match',
      label: 'New Internship Matches',
      description: 'When we find internships that match your profile',
      icon: <Work color="primary" />
    },
    {
      id: 'deadline_reminder',
      label: 'Application Deadlines',
      description: 'Reminders for upcoming application deadlines',
      icon: <Schedule color="warning" />
    },
    {
      id: 'status_change',
      label: 'Application Status Updates',
      description: 'When your application status changes',
      icon: <Update color="info" />
    },
    {
      id: 'new_internship',
      label: 'New Internships Available',
      description: 'When new internships are posted',
      icon: <NewReleases color="success" />
    },
    {
      id: 'internship_updated',
      label: 'Internship Updates',
      description: 'When internship details are updated',
      icon: <Update color="info" />
    }
  ]

  const handleTypeToggle = (typeId: string) => {
    setPreferences(prev => {
      const newEnabledTypes = prev.enabledTypes.includes(typeId)
        ? prev.enabledTypes.filter(id => id !== typeId)
        : [...prev.enabledTypes, typeId]
      
      return {
        ...prev,
        enabledTypes: newEnabledTypes
      }
    })
    setHasChanges(true)
  }

  const handleSoundToggle = () => {
    setPreferences(prev => ({
      ...prev,
      enableSound: !prev.enableSound
    }))
    setHasChanges(true)
  }

  const handleDesktopToggle = async () => {
    if (!preferences.enableDesktop && desktopPermission !== 'granted') {
      const permission = await requestNotificationPermission()
      setDesktopPermission(permission)
      
      if (permission !== 'granted') {
        return
      }
    }

    setPreferences(prev => ({
      ...prev,
      enableDesktop: !prev.enableDesktop
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateNotificationPreferences(preferences)
    setHasChanges(false)
  }

  const handleReset = () => {
    setPreferences({
      enabledTypes: ['new_match', 'deadline_reminder', 'new_internship'],
      enableSound: true,
      enableDesktop: true
    })
    setHasChanges(true)
  }

  return (
    <Card>
      <CardHeader
        avatar={<Notifications color="primary" />}
        title="Notification Preferences"
        subheader="Customize how you receive real-time updates"
      />
      <CardContent>
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Not connected to real-time updates. Some features may not work properly.
          </Alert>
        )}

        {/* Desktop Notification Permission */}
        {desktopPermission === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Desktop notifications are blocked. Please enable them in your browser settings.
          </Alert>
        )}

        {/* General Settings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enableSound}
                  onChange={handleSoundToggle}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VolumeUp fontSize="small" />
                  <Typography>Sound Notifications</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.enableDesktop && desktopPermission === 'granted'}
                  onChange={handleDesktopToggle}
                  disabled={desktopPermission === 'denied'}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Computer fontSize="small" />
                  <Typography>Desktop Notifications</Typography>
                  {desktopPermission === 'default' && (
                    <Chip label="Permission needed" size="small" color="warning" />
                  )}
                  {desktopPermission === 'denied' && (
                    <Chip label="Blocked" size="small" color="error" />
                  )}
                </Box>
              }
            />
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notification Types */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notification Types
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which types of notifications you want to receive
          </Typography>
          
          <List>
            {notificationTypes.map((type) => (
              <ListItem key={type.id} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  {type.icon}
                  <ListItemText
                    primary={type.label}
                    secondary={type.description}
                  />
                </Box>
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.enabledTypes.includes(type.id)}
                    onChange={() => handleTypeToggle(type.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset to Default
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || !isConnected}
          >
            Save Preferences
          </Button>
        </Box>

        {hasChanges && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have unsaved changes. Click "Save Preferences" to apply them.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationPreferencesComponent