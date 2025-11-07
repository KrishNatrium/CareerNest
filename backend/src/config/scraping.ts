import { ScrapingManagerConfig } from '../services/scraping/ScrapingManager';
import { ProxyConfig } from '../services/scraping/ProxyManager';

export interface ScrapingSystemConfig {
  manager: ScrapingManagerConfig;
  sources: {
    [key: string]: {
      enabled: boolean;
      baseUrl: string;
      rateLimit: {
        requests: number;
        window: number;
      };
      retries: number;
      timeout: number;
    };
  };
}

// Load proxy configurations from environment variables
const loadProxiesFromEnv = (): ProxyConfig[] => {
  const proxies: ProxyConfig[] = [];
  
  // Support multiple proxies via environment variables
  // PROXY_1_HOST, PROXY_1_PORT, PROXY_1_USERNAME, PROXY_1_PASSWORD
  // PROXY_2_HOST, PROXY_2_PORT, etc.
  
  let index = 1;
  while (process.env[`PROXY_${index}_HOST`]) {
    const proxy: ProxyConfig = {
      host: process.env[`PROXY_${index}_HOST`]!,
      port: parseInt(process.env[`PROXY_${index}_PORT`] || '8080'),
      protocol: (process.env[`PROXY_${index}_PROTOCOL`] as any) || 'http',
    };
    
    // Only add username/password if they exist
    const username = process.env[`PROXY_${index}_USERNAME`];
    const password = process.env[`PROXY_${index}_PASSWORD`];
    if (username) {
      proxy.username = username;
    }
    if (password) {
      proxy.password = password;
    }
    
    proxies.push(proxy);
    index++;
  }
  
  return proxies;
};

export const scrapingConfig: ScrapingSystemConfig = {
  manager: {
    concurrency: parseInt(process.env.SCRAPING_CONCURRENCY || '3'),
    proxies: loadProxiesFromEnv(),
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  },
  sources: {
    internshala: {
      enabled: process.env.INTERNSHALA_SCRAPING_ENABLED !== 'false',
      baseUrl: 'https://internshala.com',
      rateLimit: {
        requests: parseInt(process.env.INTERNSHALA_RATE_LIMIT_REQUESTS || '10'),
        window: parseInt(process.env.INTERNSHALA_RATE_LIMIT_WINDOW || '60000'), // 1 minute
      },
      retries: parseInt(process.env.INTERNSHALA_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.INTERNSHALA_TIMEOUT || '30000'), // 30 seconds
    },
    linkedin: {
      enabled: process.env.LINKEDIN_SCRAPING_ENABLED !== 'false',
      baseUrl: 'https://www.linkedin.com',
      rateLimit: {
        requests: parseInt(process.env.LINKEDIN_RATE_LIMIT_REQUESTS || '5'),
        window: parseInt(process.env.LINKEDIN_RATE_LIMIT_WINDOW || '60000'), // 1 minute
      },
      retries: parseInt(process.env.LINKEDIN_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.LINKEDIN_TIMEOUT || '45000'), // 45 seconds
    },
  },
};

// Validation function to ensure configuration is valid
export const validateScrapingConfig = (): void => {
  const errors: string[] = [];

  // Validate concurrency
  const concurrency = scrapingConfig.manager.concurrency || 3;
  if (concurrency < 1 || concurrency > 10) {
    errors.push('Scraping concurrency must be between 1 and 10');
  }

  // Validate Redis configuration
  if (!scrapingConfig.manager.redis.host) {
    errors.push('Redis host is required');
  }

  if (scrapingConfig.manager.redis.port < 1 || scrapingConfig.manager.redis.port > 65535) {
    errors.push('Redis port must be between 1 and 65535');
  }

  // Validate source configurations
  Object.entries(scrapingConfig.sources).forEach(([source, config]) => {
    if (config.enabled) {
      if (!config.baseUrl) {
        errors.push(`Base URL is required for source: ${source}`);
      }

      if (config.rateLimit.requests < 1) {
        errors.push(`Rate limit requests must be at least 1 for source: ${source}`);
      }

      if (config.rateLimit.window < 1000) {
        errors.push(`Rate limit window must be at least 1000ms for source: ${source}`);
      }

      if (config.timeout < 5000) {
        errors.push(`Timeout must be at least 5000ms for source: ${source}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Scraping configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Helper function to get source-specific configuration
export const getSourceConfig = (source: string) => {
  const config = scrapingConfig.sources[source];
  if (!config) {
    throw new Error(`No configuration found for source: ${source}`);
  }
  return config;
};