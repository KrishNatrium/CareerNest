import { Router } from 'express'
import { AuthController } from '../controllers/authController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Public routes (no authentication required)
router.post('/register', AuthController.register)
router.post('/login', AuthController.login)
router.post('/refresh-token', AuthController.refreshToken)

// Protected routes (authentication required)
router.use(authenticateToken)

router.post('/logout', AuthController.logout)
router.get('/profile', AuthController.getProfile)
router.put('/profile', AuthController.updateProfile)
router.put('/change-password', AuthController.changePassword)
router.put('/skills', AuthController.updateSkills)
router.put('/preferences', AuthController.updatePreferences)

export default router