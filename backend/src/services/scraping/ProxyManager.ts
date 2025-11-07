import { Page } from 'puppeteer';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface ProxyHealth {
  proxy: ProxyConfig;
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  failureCount: number;
}

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private proxyHealth: Map<string, ProxyHealth> = new Map();
  private currentProxyIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(proxies: ProxyConfig[] = []) {
    this.proxies = proxies;
    this.initializeProxyHealth();
    
    if (proxies.length > 0) {
      this.startHealthChecks();
    }
  }

  private initializeProxyHealth(): void {
    this.proxies.forEach(proxy => {
      const key = this.getProxyKey(proxy);
      this.proxyHealth.set(key, {
        proxy,
        isHealthy: true,
        responseTime: 0,
        lastChecked: new Date(),
        failureCount: 0,
      });
    });
  }

  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`;
  }

  addProxy(proxy: ProxyConfig): void {
    this.proxies.push(proxy);
    const key = this.getProxyKey(proxy);
    this.proxyHealth.set(key, {
      proxy,
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date(),
      failureCount: 0,
    });
  }

  removeProxy(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    this.proxies = this.proxies.filter(p => this.getProxyKey(p) !== key);
    this.proxyHealth.delete(key);
  }

  getNextProxy(): ProxyConfig | null {
    if (this.proxies.length === 0) {
      return null;
    }

    const healthyProxies = this.proxies.filter(proxy => {
      const health = this.proxyHealth.get(this.getProxyKey(proxy));
      return health?.isHealthy && health.failureCount < 5;
    });

    if (healthyProxies.length === 0) {
      // If no healthy proxies, reset failure counts and try again
      this.resetFailureCounts();
      return this.proxies[0];
    }

    // Round-robin selection among healthy proxies
    const proxy = healthyProxies[this.currentProxyIndex % healthyProxies.length];
    this.currentProxyIndex++;
    
    return proxy;
  }

  async configurePageWithProxy(page: Page, proxy?: ProxyConfig): Promise<void> {
    const selectedProxy = proxy || this.getNextProxy();
    
    if (!selectedProxy) {
      return; // No proxy available
    }

    // Configure proxy authentication if provided
    if (selectedProxy.username && selectedProxy.password) {
      await page.authenticate({
        username: selectedProxy.username,
        password: selectedProxy.password,
      });
    }

    // Set proxy server (this would typically be done at browser launch level)
    // For page-level proxy, we'd need to use a different approach
    console.log(`Using proxy: ${this.getProxyKey(selectedProxy)}`);
  }

  async checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
    const key = this.getProxyKey(proxy);
    const startTime = Date.now();
    
    try {
      // Simple health check - attempt to make a request through the proxy
      const response = await fetch('https://httpbin.org/ip', {
        method: 'GET',
        // Note: Node.js fetch doesn't support proxy directly
        // In a real implementation, you'd use a library like node-fetch with proxy support
        // or implement a more sophisticated health check
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.updateProxyHealth(key, true, responseTime);
        return true;
      } else {
        this.updateProxyHealth(key, false, responseTime);
        return false;
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateProxyHealth(key, false, responseTime);
      return false;
    }
  }

  private updateProxyHealth(key: string, isHealthy: boolean, responseTime: number): void {
    const health = this.proxyHealth.get(key);
    if (health) {
      health.isHealthy = isHealthy;
      health.responseTime = responseTime;
      health.lastChecked = new Date();
      
      if (isHealthy) {
        health.failureCount = 0;
      } else {
        health.failureCount++;
      }
    }
  }

  private resetFailureCounts(): void {
    this.proxyHealth.forEach(health => {
      health.failureCount = 0;
      health.isHealthy = true;
    });
  }

  private startHealthChecks(): void {
    // Check proxy health every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      for (const proxy of this.proxies) {
        await this.checkProxyHealth(proxy);
      }
    }, 5 * 60 * 1000);
  }

  getProxyStats(): ProxyHealth[] {
    return Array.from(this.proxyHealth.values());
  }

  getHealthyProxyCount(): number {
    return Array.from(this.proxyHealth.values()).filter(h => h.isHealthy).length;
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}