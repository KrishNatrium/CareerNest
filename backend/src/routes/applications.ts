import { Router } from 'express'
import { ApplicationController } from '../controllers/applicationController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// All application routes require authentication
router.use(authenticateToken)

// Application CRUD operations
router.post('/', ApplicationController.createApplication)
router.get('/', ApplicationController.getUserApplications)
router.put('/:id', ApplicationController.updateApplication)
router.delete('/:id', ApplicationController.deleteApplication)

// Application statistics and analytics
router.get('/stats', ApplicationController.getApplicationStats)
router.get('/insights', ApplicationController.getApplicationInsights)
router.get('/reminders', ApplicationController.getUpcomingReminders)

// Check application status for specific internship
router.get('/check/:internshipId', ApplicationController.checkApplicationStatus)

export default router