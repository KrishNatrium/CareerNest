import { InternshalaInternship } from './scrapers/InternshalaScaper';
import { LinkedInInternship } from './scrapers/LinkedInScraper';
import { DataNormalizer, NormalizedInternship } from './DataNormalizer';
import { DataStorageService, StorageResult } from './DataStorageService';
import { DataValidationService } from './DataValidationService';

export interface ProcessingResult {
  success: boolean;
  source: string;
  totalScraped: number;
  normalizedCount: number;
  validCount: number;
  duplicateCount: number;
  storageResult: StorageResult;
  errors: string[];
  processingTime: number;
}

export class ScrapingProcessor {
  static async processInternshalaData(
    data: InternshalaInternship[],
    source: string = 'internshala'
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`Processing ${data.length} internships from ${source}`);

      // Step 1: Normalize the data
      const normalizedInternships = DataNormalizer.normalizeInternshalaData(data);
      console.log(`Normalized ${normalizedInternships.length} internships`);

      // Step 2: Validate normalized data
      const validationResult = await DataValidationService.validateBatch(normalizedInternships, source);
      const validInternships = validationResult.valid;
      const invalidInternships = validationResult.invalid;
      
      if (invalidInternships.length > 0) {
        invalidInternships.forEach(({ internship, errors: validationErrors }) => {
          errors.push(`Invalid internship ${internship.external_id}: ${validationErrors.join(', ')}`);
        });
      }

      console.log(`Validated ${validInternships.length} internships, ${invalidInternships.length} invalid, ${validationResult.stats.warnings} with warnings`);

      // Step 3: Detect and handle duplicates
      const { unique: uniqueInternships, duplicates } = 
        DataNormalizer.detectDuplicates(validInternships);
      
      console.log(`Found ${duplicates.length} duplicates, ${uniqueInternships.length} unique internships`);

      // Step 4: Store in database
      const storageResult = await DataStorageService.storeInternships(uniqueInternships);
      
      console.log(`Storage result: ${storageResult.inserted} inserted, ${storageResult.updated} updated, ${storageResult.skipped} skipped`);

      // Step 5: Mark inactive internships (optional cleanup)
      if (storageResult.success && uniqueInternships.length > 0) {
        const activeExternalIds = uniqueInternships.map(i => i.external_id);
        const markedInactive = await DataStorageService.markInactiveInternships(source, activeExternalIds);
        console.log(`Marked ${markedInactive} internships as inactive`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: storageResult.success && errors.length === 0,
        source,
        totalScraped: data.length,
        normalizedCount: normalizedInternships.length,
        validCount: validInternships.length,
        duplicateCount: duplicates.length,
        storageResult,
        errors: [...errors, ...storageResult.errors],
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      return {
        success: false,
        source,
        totalScraped: data.length,
        normalizedCount: 0,
        validCount: 0,
        duplicateCount: 0,
        storageResult: {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [errorMessage]
        },
        errors: [errorMessage],
        processingTime
      };
    }
  }

  static async processLinkedInData(
    data: LinkedInInternship[],
    source: string = 'linkedin'
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`Processing ${data.length} internships from ${source}`);

      // Step 1: Normalize the data
      const normalizedInternships = DataNormalizer.normalizeLinkedInData(data);
      console.log(`Normalized ${normalizedInternships.length} internships`);

      // Step 2: Validate normalized data
      const validationResult = await DataValidationService.validateBatch(normalizedInternships, source);
      const validInternships = validationResult.valid;
      const invalidInternships = validationResult.invalid;
      
      if (invalidInternships.length > 0) {
        invalidInternships.forEach(({ internship, errors: validationErrors }) => {
          errors.push(`Invalid internship ${internship.external_id}: ${validationErrors.join(', ')}`);
        });
      }

      console.log(`Validated ${validInternships.length} internships, ${invalidInternships.length} invalid, ${validationResult.stats.warnings} with warnings`);

      // Step 3: Detect and handle duplicates
      const { unique: uniqueInternships, duplicates } = 
        DataNormalizer.detectDuplicates(validInternships);
      
      console.log(`Found ${duplicates.length} duplicates, ${uniqueInternships.length} unique internships`);

      // Step 4: Store in database
      const storageResult = await DataStorageService.storeInternships(uniqueInternships);
      
      console.log(`Storage result: ${storageResult.inserted} inserted, ${storageResult.updated} updated, ${storageResult.skipped} skipped`);

      // Step 5: Mark inactive internships (optional cleanup)
      if (storageResult.success && uniqueInternships.length > 0) {
        const activeExternalIds = uniqueInternships.map(i => i.external_id);
        const markedInactive = await DataStorageService.markInactiveInternships(source, activeExternalIds);
        console.log(`Marked ${markedInactive} internships as inactive`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: storageResult.success && errors.length === 0,
        source,
        totalScraped: data.length,
        normalizedCount: normalizedInternships.length,
        validCount: validInternships.length,
        duplicateCount: duplicates.length,
        storageResult,
        errors: [...errors, ...storageResult.errors],
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      return {
        success: false,
        source,
        totalScraped: data.length,
        normalizedCount: 0,
        validCount: 0,
        duplicateCount: 0,
        storageResult: {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [errorMessage]
        },
        errors: [errorMessage],
        processingTime
      };
    }
  }

  // Generic processor for future scrapers
  static async processScrapedData(
    data: any[],
    source: string,
    normalizer: (data: any[]) => NormalizedInternship[]
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`Processing ${data.length} items from ${source}`);

      // Step 1: Normalize the data using provided normalizer
      const normalizedInternships = normalizer(data);
      console.log(`Normalized ${normalizedInternships.length} internships`);

      // Step 2: Validate normalized data
      const { valid: validInternships, invalid: invalidInternships } = 
        DataNormalizer.validateNormalizedData(normalizedInternships);
      
      if (invalidInternships.length > 0) {
        invalidInternships.forEach(({ internship, errors: validationErrors }) => {
          errors.push(`Invalid internship ${internship.external_id}: ${validationErrors.join(', ')}`);
        });
      }

      console.log(`Validated ${validInternships.length} internships, ${invalidInternships.length} invalid`);

      // Step 3: Detect and handle duplicates
      const { unique: uniqueInternships, duplicates } = 
        DataNormalizer.detectDuplicates(validInternships);
      
      console.log(`Found ${duplicates.length} duplicates, ${uniqueInternships.length} unique internships`);

      // Step 4: Store in database
      const storageResult = await DataStorageService.storeInternships(uniqueInternships);
      
      console.log(`Storage result: ${storageResult.inserted} inserted, ${storageResult.updated} updated, ${storageResult.skipped} skipped`);

      const processingTime = Date.now() - startTime;

      return {
        success: storageResult.success && errors.length === 0,
        source,
        totalScraped: data.length,
        normalizedCount: normalizedInternships.length,
        validCount: validInternships.length,
        duplicateCount: duplicates.length,
        storageResult,
        errors: [...errors, ...storageResult.errors],
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      return {
        success: false,
        source,
        totalScraped: data.length,
        normalizedCount: 0,
        validCount: 0,
        duplicateCount: 0,
        storageResult: {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [errorMessage]
        },
        errors: [errorMessage],
        processingTime
      };
    }
  }

  // Method to get processing statistics
  static async getProcessingStats(): Promise<{
    storageStats: any;
    duplicates: any[];
  }> {
    const [storageStats, duplicates] = await Promise.all([
      DataStorageService.getStorageStats(),
      DataStorageService.findDuplicateInternships(10)
    ]);

    return {
      storageStats,
      duplicates
    };
  }

  // Method to cleanup old data
  static async cleanupOldData(daysOld: number = 30): Promise<{
    cleanedInternships: number;
  }> {
    const cleanedInternships = await DataStorageService.cleanupOldInternships(daysOld);
    
    return {
      cleanedInternships
    };
  }
}