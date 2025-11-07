import Joi from 'joi'

export const applicationValidation = {
  create: Joi.object({
    internship_id: Joi.number().integer().positive().required(),
    application_status: Joi.string().valid(
      'applied', 'under_review', 'interview_scheduled', 'interviewed',
      'offered', 'accepted', 'rejected', 'withdrawn'
    ).optional(),
    notes: Joi.string().max(1000).optional().allow(''),
    reminder_date: Joi.date().iso().optional().allow(null)
  }),

  update: Joi.object({
    application_status: Joi.string().valid(
      'applied', 'under_review', 'interview_scheduled', 'interviewed',
      'offered', 'accepted', 'rejected', 'withdrawn'
    ).optional(),
    notes: Joi.string().max(1000).optional().allow(''),
    reminder_date: Joi.date().iso().optional().allow(null)
  }).min(1), // At least one field must be provided

  query: Joi.object({
    status: Joi.string().valid(
      'applied', 'under_review', 'interview_scheduled', 'interviewed',
      'offered', 'accepted', 'rejected', 'withdrawn'
    ).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  }),

  reminders: Joi.object({
    days: Joi.number().integer().min(1).max(30).optional()
  }),

  params: {
    id: Joi.object({
      id: Joi.number().integer().positive().required()
    }),
    
    internshipId: Joi.object({
      internshipId: Joi.number().integer().positive().required()
    })
  }
}

export const validateApplication = {
  create: (data: any) => applicationValidation.create.validate(data),
  update: (data: any) => applicationValidation.update.validate(data),
  query: (data: any) => applicationValidation.query.validate(data),
  reminders: (data: any) => applicationValidation.reminders.validate(data),
  params: {
    id: (data: any) => applicationValidation.params.id.validate(data),
    internshipId: (data: any) => applicationValidation.params.internshipId.validate(data)
  }
}