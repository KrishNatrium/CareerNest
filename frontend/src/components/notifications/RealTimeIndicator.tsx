import React, { useState, useEffect } from 'react'
import {
  Box,
  Chip,
  Tooltip,
  Fade,
  Typography,
  keyframes
} from '@mui/material'
import {
  FiberNew,
  Update,
  TrendingUp,
  AccessTime,
  Notifications
} from '@mui/icons-material'

interface RealTimeIndicatorProps {
  type: 'new' | 'updated' | 'trending' | 'deadline' | 'match'
  timestamp?: string
  showAnimation?: boolean
  size?: 'small' | 'medium'
  variant?: 'chip' | 'badge' | 'icon'
}

// Pulse animation for new items
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

// Glow animation for important updates
const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(25, 118, 210, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(25, 118, 210, 0.8);
  }
  100% {
    box-shadow: 0 0 5px rgba(25, 118, 210, 0.5);
  }
`

const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  type,
  timestamp,
  showAnimation = true,
  size = 'small',
  variant = 'chip'
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeAgo, setTimeAgo] = useState('')

  // Calculate time ago
  useEffect(() => {
    if (!timestamp) return

    const updateTimeAgo = () => {
      const now = new Date()
      const updateTime = new Date(timestamp)
      const diffMs = now.getTime() - updateTime.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) {
        setTimeAgo('Just now')
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins}m ago`)
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours}h ago`)
      } else if (diffDays < 7) {
        setTimeAgo(`${diffDays}d ago`)
      } else {
        setIsVisible(false) // Hide after a week
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [timestamp])

  // Auto-hide after some time for certain types
  useEffect(() => {
    if (type === 'new' && showAnimation) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300000) // Hide "new" indicator after 5 minutes

      return () => clearTimeout(timer)
    }
  }, [type, showAnimation])

  const getIndicatorConfig = () => {
    switch (type) {
      case 'new':
        return {
          icon: <FiberNew />,
          label: 'New',
          color: 'success' as const,
          tooltip: `New internship${timeAgo ? ` • ${timeAgo}` : ''}`,
          animation: showAnimation ? pulse : undefined
        }
      case 'updated':
        return {
          icon: <Update />,
          label: 'Updated',
          color: 'info' as const,
          tooltip: `Recently updated${timeAgo ? ` • ${timeAgo}` : ''}`,
          animation: showAnimation ? glow : undefined
        }
      case 'trending':
        return {
          icon: <TrendingUp />,
          label: 'Trending',
          color: 'warning' as const,
          tooltip: 'Trending internship',
          animation: showAnimation ? pulse : undefined
        }
      case 'deadline':
        return {
          icon: <AccessTime />,
          label: 'Deadline Soon',
          color: 'error' as const,
          tooltip: 'Application deadline approaching',
          animation: showAnimation ? pulse : undefined
        }
      case 'match':
        return {
          icon: <Notifications />,
          label: 'Match',
          color: 'primary' as const,
          tooltip: 'Matches your profile',
          animation: showAnimation ? glow : undefined
        }
      default:
        return {
          icon: <Update />,
          label: 'Updated',
          color: 'default' as const,
          tooltip: 'Recently updated',
          animation: undefined
        }
    }
  }

  if (!isVisible) return null

  const config = getIndicatorConfig()

  const chipSx = {
    fontSize: size === 'small' ? '0.7rem' : '0.8rem',
    height: size === 'small' ? 20 : 24,
    ...(config.animation && showAnimation && {
      animation: `${config.animation} 2s ease-in-out infinite`
    })
  }

  const iconSx = {
    fontSize: size === 'small' ? 16 : 20,
    ...(config.animation && showAnimation && {
      animation: `${config.animation} 2s ease-in-out infinite`
    })
  }

  if (variant === 'icon') {
    return (
      <Tooltip title={config.tooltip}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            color: `${config.color}.main`,
            ...iconSx
          }}
        >
          {config.icon}
        </Box>
      </Tooltip>
    )
  }

  if (variant === 'badge') {
    return (
      <Fade in={isVisible}>
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 2,
            backgroundColor: `${config.color}.main`,
            color: 'white',
            borderRadius: '50%',
            width: size === 'small' ? 16 : 20,
            height: size === 'small' ? 16 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...iconSx
          }}
        >
          <Tooltip title={config.tooltip}>
            {React.cloneElement(config.icon, { 
              sx: { fontSize: size === 'small' ? 10 : 12 } 
            })}
          </Tooltip>
        </Box>
      </Fade>
    )
  }

  // Default chip variant
  return (
    <Fade in={isVisible}>
      <Tooltip title={config.tooltip}>
        <Chip
          icon={config.icon}
          label={config.label}
          size={size}
          color={config.color}
          variant="filled"
          sx={chipSx}
        />
      </Tooltip>
    </Fade>
  )
}

export default RealTimeIndicator