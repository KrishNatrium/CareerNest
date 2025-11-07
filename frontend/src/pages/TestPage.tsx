import React from 'react'
import { Container, Typography, Box } from '@mui/material'

export const TestPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Test Page
        </Typography>
        <Typography variant="body1">
          This is a test page to verify the routing is working.
        </Typography>
      </Box>
    </Container>
  )
}