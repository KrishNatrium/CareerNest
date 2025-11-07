import React from 'react'
import { Container } from '@mui/material'
import { ApplicationsDashboard } from '../components/applications/ApplicationsDashboard'

export const ApplicationsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ApplicationsDashboard />
    </Container>
  )
}