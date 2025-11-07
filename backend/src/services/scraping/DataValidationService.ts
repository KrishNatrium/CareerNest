import { NormalizedInternship } from './DataNormalizer';
import { ScrapingLogger } from './ScrapingLogger';

export interface ValidationRule {
  field: keyof NormalizedInternship;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: NormalizedInternship;
}

export class DataValidationService {
  private static logger = ScrapingLogger.getInstance();

  private static validationRules: ValidationRule[] = [
    {
      field: 'title',
      required: true,
      minLength: 3,
      maxLength: 200,
      sanitizer: (value: string) => value?.trim().replace(/\s+/g, ' ')
    },
    {
      field: 'company_name',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitizer: (value: string) => value?.trim().replace(/\s+/g, ' ')
    },
    {
      field: 'description',
      maxLength: 5000,
      sanitizer: (value: string) => value?.trim().replace(/\s+/g, ' ')
    },
    {
      field: 'location',
      maxLength: 200,
      sanitizer: (value: string) => value?.trim()
    },
    {
      field: 'stipend',
      validator: (value: number | null) => value === null || (typeof value === 'number' && value >= 0)
    },
    {
      field: 'duration_months',
      validator: (value: number | null) => value === null || (typeof value === 'number' && value > 0 && value <= 24)
    },
    {
      field: 'work_type',
      required: true,
      validator: (value: string) => ['office', 'remote', 'hybrid'].includes(value)
    },
    {
      field: 'required_skills',
      validator: (value: string[]) => Array.isArray(value) && value.every(skill => typeof skill === 'string')
    },
    {
      field: 'application_url',
      required: true,
      validator: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      field: 'source_website',
      required: true,
      minLength: 2,
      maxLength: 50
    },
    {
      field: 'external_id',
      required: true,
      minLength: 1,
      maxLength: 255
    }
  ];

  static async validateInternship(
    internship: NormalizedInternship,
    source: string = 'unknown'
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedData: any = { ...internship };

    for (const rule of this.validationRules) {
      const value = internship[rule.field];
      const fieldName = rule.field;

      try {
        // Check required fields
        if (rule.required && (value === null || value === undefined || value === '')) {
          errors.push(`${fieldName} is required`);
          continue;
        }

        // Skip validation for null/undefined optional fields
        if (!rule.required && (value === null || value === undefined)) {
          continue;
        }

        // Apply sanitizer
        if (rule.sanitizer && value !== null && value !== undefined) {
          sanitizedData[fieldName] = rule.sanitizer(value);
        }

        const valueToValidate = sanitizedData[fieldName];

        // String length validation
        if (typeof valueToValidate === 'string') {
          if (rule.minLength && valueToValidate.length < rule.minLength) {
            errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
          }
          if (rule.maxLength && valueToValidate.length > rule.maxLength) {
            warnings.push(`${fieldName} exceeds maximum length of ${rule.maxLength} characters, truncating`);
            sanitizedData[fieldName] = valueToValidate.substring(0, rule.maxLength);
          }
        }

        // Pattern validation
        if (rule.pattern && typeof valueToValidate === 'string' && !rule.pattern.test(valueToValidate)) {
          errors.push(`${fieldName} does not match required pattern`);
        }

        // Custom validator
        if (rule.validator && !rule.validator(valueToValidate)) {
          errors.push(`${fieldName} failed custom validation`);
        }

      } catch (error) {
        errors.push(`Validation error for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Additional business logic validations
    const businessValidationResult = await this.performBusinessValidation(sanitizedData, source);
    errors.push(...businessValidationResult.errors);
    warnings.push(...businessValidationResult.warnings);

    const isValid = errors.length === 0;

    if (!isValid) {
      await this.logger.warn(source, 'Data validation failed', {
        externalId: internship.external_id,
        errors,
        warnings
      });
    } else if (warnings.length > 0) {
      await this.logger.info(source, 'Data validation passed with warnings', {
        externalId: internship.external_id,
        warnings
      });
    }

    return {
      isValid,
      errors,
      warnings,
      sanitizedData: isValid ? sanitizedData : undefined
    };
  }

  private static async performBusinessValidation(
    internship: NormalizedInternship,
    source: string
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for suspicious data patterns
      if (internship.title && internship.title.toLowerCase().includes('test')) {
        warnings.push('Title contains "test" - might be test data');
      }

      // Validate stipend ranges
      if (internship.stipend && internship.stipend > 100000) {
        warnings.push('Stipend seems unusually high - please verify');
      }

      // Check for duplicate detection patterns
      if (internship.title && internship.company_name && 
          internship.title.toLowerCase() === internship.company_name.toLowerCase()) {
        warnings.push('Title and company name are identical - possible data extraction error');
      }

      // Validate URL accessibility (basic check)
      if (internship.application_url) {
        const url = new URL(internship.application_url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('Application URL must use HTTP or HTTPS protocol');
        }
      }

      // Check for minimum required skills for certain positions
      if (internship.title && internship.required_skills) {
        const title = internship.title.toLowerCase();
        if ((title.includes('developer') || title.includes('engineer')) && 
            internship.required_skills.length === 0) {
          warnings.push('Technical position with no required skills specified');
        }
      }

      // Validate date consistency
      if (internship.posted_date && internship.application_deadline) {
        if (internship.posted_date > internship.application_deadline) {
          errors.push('Posted date cannot be after application deadline');
        }
      }

      // Check for future posted dates
      if (internship.posted_date && internship.posted_date > new Date()) {
        warnings.push('Posted date is in the future');
      }

    } catch (error) {
      await this.logger.error(source, 'Business validation error', {
        externalId: internship.external_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return { errors, warnings };
  }

  static async validateBatch(
    internships: NormalizedInternship[],
    source: string = 'unknown'
  ): Promise<{
    valid: NormalizedInternship[];
    invalid: Array<{ internship: NormalizedInternship; errors: string[]; warnings: string[] }>;
    stats: {
      total: number;
      valid: number;
      invalid: number;
      warnings: number;
    };
  }> {
    const valid: NormalizedInternship[] = [];
    const invalid: Array<{ internship: NormalizedInternship; errors: string[]; warnings: string[] }> = [];
    let warningCount = 0;

    await this.logger.info(source, `Starting batch validation of ${internships.length} internships`);

    for (const internship of internships) {
      const result = await this.validateInternship(internship, source);
      
      if (result.isValid && result.sanitizedData) {
        valid.push(result.sanitizedData);
        if (result.warnings.length > 0) {
          warningCount++;
        }
      } else {
        invalid.push({
          internship,
          errors: result.errors,
          warnings: result.warnings
        });
      }
    }

    const stats = {
      total: internships.length,
      valid: valid.length,
      invalid: invalid.length,
      warnings: warningCount
    };

    await this.logger.info(source, 'Batch validation completed', stats);

    return { valid, invalid, stats };
  }

  // Method to clean and normalize text data
  static cleanText(text: string | null | undefined): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, '') // Remove non-printable characters
      .trim();
  }

  // Method to validate and clean URLs
  static validateUrl(url: string): { isValid: boolean; cleanUrl?: string; error?: string } {
    try {
      const urlObj = new URL(url);
      
      // Basic security checks
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }

      // Remove tracking parameters
      const cleanUrl = this.removeTrackingParams(urlObj);
      
      return { isValid: true, cleanUrl };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  private static removeTrackingParams(url: URL): string {
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'referrer', 'source'
    ];

    trackingParams.forEach(param => {
      url.searchParams.delete(param);
    });

    return url.toString();
  }

  // Method to detect potential duplicates based on content similarity
  static calculateSimilarity(internship1: NormalizedInternship, internship2: NormalizedInternship): number {
    let score = 0;
    let factors = 0;

    // Title similarity (weighted heavily)
    if (internship1.title && internship2.title) {
      const titleSimilarity = this.stringSimilarity(
        internship1.title.toLowerCase(),
        internship2.title.toLowerCase()
      );
      score += titleSimilarity * 0.4;
      factors += 0.4;
    }

    // Company similarity
    if (internship1.company_name && internship2.company_name) {
      const companySimilarity = this.stringSimilarity(
        internship1.company_name.toLowerCase(),
        internship2.company_name.toLowerCase()
      );
      score += companySimilarity * 0.3;
      factors += 0.3;
    }

    // Location similarity
    if (internship1.location && internship2.location) {
      const locationSimilarity = this.stringSimilarity(
        internship1.location.toLowerCase(),
        internship2.location.toLowerCase()
      );
      score += locationSimilarity * 0.2;
      factors += 0.2;
    }

    // Description similarity (if available)
    if (internship1.description && internship2.description) {
      const descSimilarity = this.stringSimilarity(
        internship1.description.toLowerCase().substring(0, 200),
        internship2.description.toLowerCase().substring(0, 200)
      );
      score += descSimilarity * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? score / factors : 0;
  }

  private static stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple Jaccard similarity using word sets
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}