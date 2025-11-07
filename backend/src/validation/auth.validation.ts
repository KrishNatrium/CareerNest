import Joi from 'joi'

// User registration validation schema
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  first_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  last_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  location: Joi.string()
    .trim()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Location must not exceed 255 characters'
    })
})

// User login validation schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
})

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
})

// Change password validation schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required'
    })
})

// Profile update validation schema
export const updateProfileSchema = Joi.object({
  first_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name must not exceed 50 characters'
    }),
  
  last_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name must not exceed 50 characters'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  location: Joi.string()
    .trim()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Location must not exceed 255 characters'
    })
})

// User skills validation schema
export const userSkillsSchema = Joi.object({
  skills: Joi.array()
    .items(
      Joi.object({
        skill_name: Joi.string()
          .trim()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Skill name is required',
            'string.max': 'Skill name must not exceed 100 characters',
            'any.required': 'Skill name is required'
          }),
        
        proficiency_level: Joi.string()
          .valid('beginner', 'intermediate', 'advanced', 'expert')
          .required()
          .messages({
            'any.only': 'Proficiency level must be one of: beginner, intermediate, advanced, expert',
            'any.required': 'Proficiency level is required'
          })
      })
    )
    .min(0)
    .max(50)
    .required()
    .messages({
      'array.max': 'Maximum 50 skills allowed',
      'any.required': 'Skills array is required'
    })
})

// User preferences validation schema
export const userPreferencesSchema = Joi.object({
  preferred_locations: Joi.array()
    .items(Joi.string().trim().max(255))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Maximum 20 preferred locations allowed',
      'string.max': 'Location must not exceed 255 characters'
    }),
  
  min_stipend: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Minimum stipend cannot be negative',
      'number.max': 'Minimum stipend cannot exceed 1,000,000'
    }),
  
  max_duration_months: Joi.number()
    .integer()
    .min(1)
    .max(24)
    .optional()
    .messages({
      'number.min': 'Maximum duration must be at least 1 month',
      'number.max': 'Maximum duration cannot exceed 24 months'
    }),
  
  work_type: Joi.string()
    .valid('remote', 'office', 'hybrid', 'any')
    .optional()
    .messages({
      'any.only': 'Work type must be one of: remote, office, hybrid, any'
    }),
  
  notification_enabled: Joi.boolean()
    .optional(),
  
  email_notifications: Joi.boolean()
    .optional()
})