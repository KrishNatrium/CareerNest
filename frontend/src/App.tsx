import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { ProfilePage } from './pages/ProfilePage'
import { InternshipsPage } from './pages/InternshipsPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { TestPage } from './pages/TestPage'
import { Layout } from './components/layout/Layout'

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <WebSocketProvider>
            <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                  <PublicRoute>
                    <AuthPage />
                  </PublicRoute>
                } />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/internships" element={
                  <ProtectedRoute>
                    <Layout>
                      <InternshipsPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/recommendations" element={
                  <ProtectedRoute>
                    <Layout>
                      <RecommendationsPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/applications" element={
                  <ProtectedRoute>
                    <Layout>
                      <ApplicationsPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/test" element={<TestPage />} />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
            </Router>
          </WebSocketProvider>
        </AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App