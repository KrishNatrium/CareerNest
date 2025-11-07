import { InternshalaInternship } from './scrapers/InternshalaScaper';
import { LinkedInInternship } from './scrapers/LinkedInScraper';

export interface NormalizedInternship {
  title: string;
  company_name: string;
  description: string;
  location: string;
  stipend: number | null;
  duration_months: number | null;
  work_type: 'office' | 'remote' | 'hybrid';
  required_skills: string[];
  application_url: string;
  source_website: string;
  external_id: string;
  posted_date: Date | null;
  application_deadline: Date | null;
  is_active: boolean;
}

export class DataNormalizer {
  static normalizeInternshalaData(internships: InternshalaInternship[]): NormalizedInternship[] {
    return internships.map(internship => this.normalizeInternshalaInternship(internship));
  }

  static normalizeLinkedInData(internships: LinkedInInternship[]): NormalizedInternship[] {
    return internships.map(internship => this.normalizeLinkedInInternship(internship));
  }

  private static normalizeLinkedInInternship(internship: LinkedInInternship): NormalizedInternship {
    return {
      title: this.cleanText(internship.title),
      company_name: this.cleanText(internship.company),
      description: this.cleanText(internship.description),
      location: this.normalizeLocation(internship.location),
      stipend: this.parseLinkedInSalary(internship.salary),
      duration_months: null, // LinkedIn typically doesn't specify duration
      work_type: internship.workType,
      required_skills: this.normalizeSkills(internship.skills),
      application_url: internship.applicationUrl,
      source_website: 'linkedin',
      external_id: internship.externalId,
      posted_date: this.parseDate(internship.postedDate),
      application_deadline: null, // LinkedIn typically doesn't show deadlines
      is_active: true
    };
  }

  private static normalizeInternshalaInternship(internship: InternshalaInternship): NormalizedInternship {
    return {
      title: this.cleanText(internship.title),
      company_name: this.cleanText(internship.company),
      description: this.cleanText(internship.description),
      location: this.normalizeLocation(internship.location),
      stipend: this.parseStipend(internship.stipend),
      duration_months: this.parseDuration(internship.duration),
      work_type: internship.workType,
      required_skills: this.normalizeSkills(internship.skills),
      application_url: internship.applicationUrl,
      source_website: 'internshala',
      external_id: internship.externalId,
      posted_date: this.parseDate(internship.postedDate),
      application_deadline: this.parseDate(internship.applicationDeadline),
      is_active: true
    };
  }

  private static cleanText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .trim();
  }

  private static normalizeLocation(location: string): string {
    if (!location) return '';
    
    const cleaned = this.cleanText(location);
    
    // Handle common location patterns
    if (cleaned.toLowerCase().includes('work from home') || 
        cleaned.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    
    // Remove common prefixes/suffixes
    return cleaned
      .replace(/^(Location:\s*)/i, '')
      .replace(/\s*\(.*\)$/, '') // Remove parenthetical information
      .trim();
  }

  private static parseStipend(stipendText: string): number | null {
    if (!stipendText) return null;
    
    const cleaned = stipendText.toLowerCase().replace(/[^\d.,k-]/g, '');
    
    // Handle "Unpaid" or similar
    if (stipendText.toLowerCase().includes('unpaid') || 
        stipendText.toLowerCase().includes('no stipend')) {
      return 0;
    }
    
    // Extract numeric value
    const match = cleaned.match(/(\d+(?:[.,]\d+)?)\s*k?/);
    if (!match) return null;
    
    let amount = parseFloat(match[1].replace(',', '.'));
    
    // Handle 'k' suffix (thousands)
    if (cleaned.includes('k')) {
      amount *= 1000;
    }
    
    return Math.round(amount);
  }

  private static parseDuration(durationText: string): number | null {
    if (!durationText) return null;
    
    const cleaned = durationText.toLowerCase();
    
    // Extract number of months
    const monthMatch = cleaned.match(/(\d+)\s*month/);
    if (monthMatch) {
      return parseInt(monthMatch[1]);
    }
    
    // Extract number of weeks and convert to months
    const weekMatch = cleaned.match(/(\d+)\s*week/);
    if (weekMatch) {
      return Math.round(parseInt(weekMatch[1]) / 4.33); // Average weeks per month
    }
    
    // Handle common duration patterns
    if (cleaned.includes('3 months') || cleaned.includes('3-month')) return 3;
    if (cleaned.includes('6 months') || cleaned.includes('6-month')) return 6;
    if (cleaned.includes('2 months') || cleaned.includes('2-month')) return 2;
    if (cleaned.includes('1 month') || cleaned.includes('1-month')) return 1;
    
    return null;
  }

  private static parseLinkedInSalary(salaryText: string | undefined): number | null {
    if (!salaryText) return null;
    
    const cleaned = salaryText.toLowerCase().replace(/[^\d.,k$-]/g, '');
    
    // Handle salary ranges - take the lower bound
    const rangeMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*k?\s*-\s*(\d+(?:[.,]\d+)?)\s*k?/);
    if (rangeMatch) {
      let amount = parseFloat(rangeMatch[1].replace(',', '.'));
      if (cleaned.includes('k')) {
        amount *= 1000;
      }
      return Math.round(amount);
    }
    
    // Handle single values
    const match = cleaned.match(/(\d+(?:[.,]\d+)?)\s*k?/);
    if (!match) return null;
    
    let amount = parseFloat(match[1].replace(',', '.'));
    
    // Handle 'k' suffix (thousands)
    if (cleaned.includes('k')) {
      amount *= 1000;
    }
    
    return Math.round(amount);
  }

  private static normalizeSkills(skills: string[]): string[] {
    if (!Array.isArray(skills)) return [];
    
    return skills
      .map(skill => this.cleanText(skill))
      .filter(skill => skill.length > 0)
      .map(skill => this.normalizeSkillName(skill))
      .filter((skill, index, array) => array.indexOf(skill) === index); // Remove duplicates
  }

  private static normalizeSkillName(skill: string): string {
    const skillMappings: { [key: string]: string } = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'py': 'Python',
      'python': 'Python',
      'java': 'Java',
      'c++': 'C++',
      'cpp': 'C++',
      'c#': 'C#',
      'csharp': 'C#',
      'html': 'HTML',
      'css': 'CSS',
      'react': 'React',
      'reactjs': 'React',
      'angular': 'Angular',
      'vue': 'Vue.js',
      'vuejs': 'Vue.js',
      'node': 'Node.js',
      'nodejs': 'Node.js',
      'express': 'Express.js',
      'expressjs': 'Express.js',
      'mongodb': 'MongoDB',
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'sql': 'SQL',
      'git': 'Git',
      'github': 'GitHub',
      'aws': 'AWS',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'k8s': 'Kubernetes'
    };
    
    const normalized = skill.toLowerCase().trim();
    return skillMappings[normalized] || this.capitalizeWords(skill);
  }

  private static capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private static parseDate(dateText: string | undefined): Date | null {
    if (!dateText) return null;
    
    const cleaned = dateText.trim();
    
    // Handle relative dates
    const now = new Date();
    
    if (cleaned.toLowerCase().includes('today')) {
      return now;
    }
    
    if (cleaned.toLowerCase().includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    // Handle "X days ago"
    const daysAgoMatch = cleaned.match(/(\d+)\s*days?\s*ago/i);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date;
    }
    
    // Handle "X weeks ago"
    const weeksAgoMatch = cleaned.match(/(\d+)\s*weeks?\s*ago/i);
    if (weeksAgoMatch) {
      const weeksAgo = parseInt(weeksAgoMatch[1]);
      const date = new Date(now);
      date.setDate(date.getDate() - (weeksAgo * 7));
      return date;
    }
    
    // Try to parse as standard date
    try {
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return null;
  }

  // Method to detect and handle duplicates
  static detectDuplicates(internships: NormalizedInternship[]): {
    unique: NormalizedInternship[];
    duplicates: NormalizedInternship[];
  } {
    const seen = new Map<string, NormalizedInternship>();
    const duplicates: NormalizedInternship[] = [];
    
    for (const internship of internships) {
      // Create a unique key based on title, company, and location
      const key = `${internship.title.toLowerCase()}-${internship.company_name.toLowerCase()}-${internship.location.toLowerCase()}`;
      
      if (seen.has(key)) {
        duplicates.push(internship);
      } else {
        seen.set(key, internship);
      }
    }
    
    return {
      unique: Array.from(seen.values()),
      duplicates
    };
  }

  // Method to validate normalized data
  static validateNormalizedData(internships: NormalizedInternship[]): {
    valid: NormalizedInternship[];
    invalid: { internship: NormalizedInternship; errors: string[] }[];
  } {
    const valid: NormalizedInternship[] = [];
    const invalid: { internship: NormalizedInternship; errors: string[] }[] = [];
    
    for (const internship of internships) {
      const errors: string[] = [];
      
      if (!internship.title || internship.title.trim().length === 0) {
        errors.push('Title is required');
      }
      
      if (!internship.company_name || internship.company_name.trim().length === 0) {
        errors.push('Company name is required');
      }
      
      if (!internship.application_url || !this.isValidUrl(internship.application_url)) {
        errors.push('Valid application URL is required');
      }
      
      if (!internship.external_id || internship.external_id.trim().length === 0) {
        errors.push('External ID is required');
      }
      
      if (!internship.source_website || internship.source_website.trim().length === 0) {
        errors.push('Source website is required');
      }
      
      if (errors.length === 0) {
        valid.push(internship);
      } else {
        invalid.push({ internship, errors });
      }
    }
    
    return { valid, invalid };
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}