import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { AuthService } from '../services/authService'
import { UserWithDetails, LoginCredentials, RegisterData } from '../types/auth.types'
import { toast } from 'react-toastify'

interface AuthState {
  user: UserWithDetails | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: UserWithDetails }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER'; payload: UserWithDetails }
  | { type: 'CLEAR_ERROR' }

interface AuthContextType extends AuthState {
  login: (_credentials: LoginCredentials) => Promise<void>
  register: (_data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  updateUser: (_user: UserWithDetails) => void
  clearError: () => void
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      }
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    
    default:
      return state
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load user on app start
  useEffect(() => {
    loadUser()
  }, [])

  const login = async (_credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const response = await AuthService.login(_credentials)
      
      if (response.success) {
        // Get full user profile after login
        const userProfile = await AuthService.getProfile()
        dispatch({ type: 'AUTH_SUCCESS', payload: userProfile })
        toast.success('Login successful!')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed'
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
      throw error
    }
  }

  const register = async (_data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const response = await AuthService.register(_data)
      
      if (response.success) {
        // Get full user profile after registration
        const userProfile = await AuthService.getProfile()
        dispatch({ type: 'AUTH_SUCCESS', payload: userProfile })
        toast.success('Registration successful!')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed'
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout()
      dispatch({ type: 'AUTH_LOGOUT' })
      toast.success('Logged out successfully')
    } catch (error: any) {
      console.error('Logout error:', error)
      // Still logout locally even if server request fails
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }

  const loadUser = async (): Promise<void> => {
    try {
      if (!AuthService.isAuthenticated()) {
        dispatch({ type: 'AUTH_LOGOUT' })
        return
      }

      dispatch({ type: 'AUTH_START' })
      const userProfile = await AuthService.getProfile()
      dispatch({ type: 'AUTH_SUCCESS', payload: userProfile })
    } catch (error: any) {
      console.error('Load user error:', error)
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }

  const updateUser = (_user: UserWithDetails): void => {
    dispatch({ type: 'UPDATE_USER', payload: _user })
  }

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    loadUser,
    updateUser,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}