import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material'
import { 
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  ExitToApp,
  AccountCircle,
  TrendingUp,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationCenter from '../notifications/NotificationCenter'
import ConnectionStatus from '../notifications/ConnectionStatus'
// Logo is served from public folder

export const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
    handleClose()
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <AppBar position="static" elevation={1} sx={{ backgroundColor: '#000000' }}>
      <Toolbar>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            flexGrow: 1,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.02)'
            }
          }}
          onClick={() => navigate('/dashboard')}
        >
          <img 
            src="/logo.png" 
            alt="CareerNest Logo" 
            style={{ 
              height: '80px', 
              width: 'auto',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            }} 
          />
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <span style={{ fontWeight: 700, color: '#4A90E2' }}>Career</span><span style={{ fontWeight: 800, color: '#7ED321' }}>Nest</span>
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              backgroundColor: isActive('/dashboard') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Dashboard
          </Button>

          <Button
            color="inherit"
            startIcon={<WorkIcon />}
            onClick={() => navigate('/internships')}
            sx={{ 
              backgroundColor: isActive('/internships') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Internships
          </Button>
          
          <Button
            color="inherit"
            startIcon={<TrendingUp />}
            onClick={() => navigate('/recommendations')}
            sx={{ 
              backgroundColor: isActive('/recommendations') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Recommendations
          </Button>

          <Button
            color="inherit"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate('/applications')}
            sx={{ 
              backgroundColor: isActive('/applications') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Applications
          </Button>
          
          <Button
            color="inherit"
            startIcon={<PersonIcon />}
            onClick={() => navigate('/profile')}
            sx={{ 
              backgroundColor: isActive('/profile') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Profile
          </Button>

          {/* Real-time features */}
          <ConnectionStatus />
          <NotificationCenter />

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
              <PersonIcon sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}