import React, { useState } from 'react'
import {
  Badge,
  IconButton,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  NotificationsActive,
  Circle,
  Work,
  Schedule,
  Update,
  Clear,
  MarkEmailRead
} from '@mui/icons-material'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { formatDistanceToNow } from '../../utils/formatters'

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications
  } = useWebSocket()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = (notificationId: number) => {
    markNotificationAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead()
  }

  const handleClearAll = () => {
    clearNotifications()
    handleClose()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_match':
        return <Work color="primary" />
      case 'deadline_reminder':
        return <Schedule color="warning" />
      case 'status_change':
        return <Update color="info" />
      case 'new_internship':
        return <Work color="success" />
      case 'internship_updated':
        return <Update color="info" />
      default:
        return <NotificationsIcon color="action" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_match':
        return 'primary'
      case 'deadline_reminder':
        return 'warning'
      case 'status_change':
        return 'info'
      case 'new_internship':
        return 'success'
      case 'internship_updated':
        return 'info'
      default:
        return 'default'
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          size="large"
          color="inherit"
          aria-label="notifications"
        >
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <NotificationsActive /> : <NotificationsIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'visible'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              Notifications
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={handleMarkAllAsRead}>
                    <MarkEmailRead fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip title="Clear all">
                  <IconButton size="small" onClick={handleClearAll}>
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification.id)}
                sx={{
                  borderLeft: notification.is_read ? 'none' : '4px solid',
                  borderLeftColor: notification.is_read ? 'transparent' : 'primary.main',
                  backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getNotificationIcon(notification.notification_type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" component="span">
                        {notification.title}
                      </Typography>
                      {!notification.is_read && (
                        <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={notification.notification_type.replace('_', ' ')}
                          size="small"
                          color={getNotificationColor(notification.notification_type) as any}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                        <Typography variant="caption" color="text.disabled">
                          {formatDistanceToNow(new Date(notification.sent_at))}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                size="small"
                onClick={handleClose}
                sx={{ textTransform: 'none' }}
              >
                View All Notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  )
}

export default NotificationCenter