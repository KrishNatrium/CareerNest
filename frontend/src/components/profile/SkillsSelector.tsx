import React, { useState } from 'react'
import {
  Box,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Autocomplete,
  Grid
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { UserSkillInput } from '../../types/auth.types'

interface SkillsSelectorProps {
  skills: UserSkillInput[]
  onChange: (_skills: UserSkillInput[]) => void
  disabled?: boolean
}

// Common skills for autocomplete
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
  'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot',
  'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind CSS', 'Material-UI',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase',
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
  'Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'Adobe XD',
  'Machine Learning', 'Data Science', 'Artificial Intelligence', 'Deep Learning',
  'Mobile Development', 'React Native', 'Flutter', 'iOS', 'Android',
  'DevOps', 'CI/CD', 'Testing', 'Jest', 'Cypress', 'Selenium',
  'Project Management', 'Agile', 'Scrum', 'Communication', 'Leadership'
]

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
] as const

export const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  skills: _skills,
  onChange,
  disabled = false
}) => {
  const [newSkill, setNewSkill] = useState<UserSkillInput>({
    skill_name: '',
    proficiency_level: 'beginner'
  })

  const handleAddSkill = () => {
    if (!newSkill.skill_name.trim()) return

    // Check if skill already exists
    const existingSkill = _skills.find(
      skill => skill.skill_name.toLowerCase() === newSkill.skill_name.toLowerCase()
    )

    if (existingSkill) {
      // Update existing skill
      const updatedSkills = _skills.map(skill =>
        skill.skill_name.toLowerCase() === newSkill.skill_name.toLowerCase()
          ? { ...skill, proficiency_level: newSkill.proficiency_level }
          : skill
      )
      onChange(updatedSkills)
    } else {
      // Add new skill
      onChange([..._skills, { ...newSkill, skill_name: newSkill.skill_name.trim() }])
    }

    // Reset form
    setNewSkill({
      skill_name: '',
      proficiency_level: 'beginner'
    })
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = _skills.filter(
      skill => skill.skill_name !== skillToRemove
    )
    onChange(updatedSkills)
  }

  const handleSkillNameChange = (value: string | null) => {
    setNewSkill(prev => ({
      ...prev,
      skill_name: value || ''
    }))
  }

  const handleProficiencyChange = (proficiency: UserSkillInput['proficiency_level']) => {
    setNewSkill(prev => ({
      ...prev,
      proficiency_level: proficiency
    }))
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddSkill()
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Skills
      </Typography>

      {/* Add new skill */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            freeSolo
            options={COMMON_SKILLS}
            value={newSkill.skill_name}
            onChange={(_, value) => handleSkillNameChange(value)}
            onInputChange={(_, value) => handleSkillNameChange(value)}
            disabled={disabled}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Skill Name"
                placeholder="e.g., JavaScript, Python, React"
                onKeyPress={handleKeyPress}
                fullWidth
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Proficiency Level</InputLabel>
            <Select
              value={newSkill.proficiency_level}
              onChange={(e) => handleProficiencyChange(e.target.value as UserSkillInput['proficiency_level'])}
              label="Proficiency Level"
              disabled={disabled}
            >
              {PROFICIENCY_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={2}>
          <Button
            variant="contained"
            onClick={handleAddSkill}
            disabled={!newSkill.skill_name.trim() || disabled}
            startIcon={<Add />}
            fullWidth
          >
            Add
          </Button>
        </Grid>
      </Grid>

      {/* Display current skills */}
      {_skills.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Current Skills ({_skills.length}/50)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {_skills.map((skill, index) => (
              <Chip
                key={`${skill.skill_name}-${index}`}
                label={`${skill.skill_name} (${skill.proficiency_level})`}
                onDelete={disabled ? undefined : () => handleRemoveSkill(skill.skill_name)}
                deleteIcon={<Delete />}
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No skills added yet. Add your skills to get better internship recommendations.
        </Typography>
      )}

      {_skills.length >= 50 && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
          Maximum of 50 skills allowed.
        </Typography>
      )}
    </Box>
  )
}