import React from 'react'
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Typography
} from '@mui/material'
import {
  Wifi,
  WifiOff,
  Refresh,
  SignalWifi4Bar,
  SignalWifiConnectedNoInternet4
} from '@mui/icons-material'
import { useWebSocket } from '../../contexts/WebSocketContext'

interface ConnectionStatusProps {
  showLabel?: boolean
  size?: 'small' | 'medium'
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showLabel = false, 
  size = 'small' 
}) => {
  const { isConnected, connectionStatus, connect } = useWebSocket()

  const handleReconnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Failed to reconnect:', error)
    }
  }

  const getStatusIcon = () => {
    if (isConnected) {
      return <SignalWifi4Bar fontSize={size} color="success" />
    } else if (connectionStatus.reconnectAttempts > 0) {
      return <SignalWifiConnectedNoInternet4 fontSize={size} color="warning" />
    } else {
      return <WifiOff fontSize={size} color="error" />
    }
  }

  const getStatusText = () => {
    if (isConnected) {
      return 'Connected'
    } else if (connectionStatus.reconnectAttempts > 0) {
      return `Reconnecting... (${connectionStatus.reconnectAttempts})`
    } else {
      return 'Disconnected'
    }
  }

  const getStatusColor = (): 'success' | 'warning' | 'error' => {
    if (isConnected) {
      return 'success'
    } else if (connectionStatus.reconnectAttempts > 0) {
      return 'warning'
    } else {
      return 'error'
    }
  }

  const getTooltipText = () => {
    if (isConnected) {
      return `Connected to real-time updates${connectionStatus.socketId ? ` (${connectionStatus.socketId})` : ''}`
    } else if (connectionStatus.reconnectAttempts > 0) {
      return `Attempting to reconnect... (attempt ${connectionStatus.reconnectAttempts})`
    } else {
      return 'Disconnected from real-time updates. Click to reconnect.'
    }
  }

  if (showLabel) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          variant="outlined"
          size={size}
          onClick={!isConnected ? handleReconnect : undefined}
          clickable={!isConnected}
        />
        {!isConnected && (
          <Tooltip title="Reconnect">
            <IconButton size="small" onClick={handleReconnect}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    )
  }

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton
        size={size}
        onClick={!isConnected ? handleReconnect : undefined}
        sx={{
          color: isConnected ? 'success.main' : 'error.main',
          '&:hover': {
            backgroundColor: isConnected ? 'success.light' : 'error.light',
            opacity: 0.1
          }
        }}
      >
        {getStatusIcon()}
      </IconButton>
    </Tooltip>
  )
}

export default ConnectionStatus